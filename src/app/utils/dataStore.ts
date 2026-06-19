import { apiFetch } from './api';
import { idbGet, idbSet } from './localdb';

export interface Product {
  code: string;
  name: string;
  category: string;
  amountPerPackage: string;
  price: number;
  imageUrl: string;
  stock: number;
  _pending?: boolean;
}

export interface Client {
  id: string;
  name: string;
  rif: string;
  address: string;
  vendorId: string;
  vendorName: string;
  createdAt?: string;
  _pending?: boolean;
}

type OutboxOp =
  | { kind: 'client.create'; tempId: string; payload: any }
  | { kind: 'client.update'; id: string; payload: any }
  | { kind: 'client.delete'; id: string }
  | { kind: 'product.create'; payload: any }
  | { kind: 'product.update'; code: string; payload: any }
  | { kind: 'product.delete'; code: string };

const PRODUCTS_KEY = 'products';
const CLIENTS_KEY = 'clients';
const OUTBOX_KEY = 'outbox';

export const isOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine);

export async function pendingCount(): Promise<number> {
  return ((await idbGet<OutboxOp[]>(OUTBOX_KEY)) || []).length;
}

async function enqueue(op: OutboxOp) {
  const outbox = (await idbGet<OutboxOp[]>(OUTBOX_KEY)) || [];
  outbox.push(op);
  await idbSet(OUTBOX_KEY, outbox);
}

// ---------- Reads (network-first, cache fallback) ----------

export async function getProducts(
  accessToken: string | null,
): Promise<{ items: Product[]; offline: boolean }> {
  if (isOnline()) {
    try {
      const data = await apiFetch('/products', { accessToken });
      const items: Product[] = data.products || [];
      await idbSet(PRODUCTS_KEY, items);
      return { items, offline: false };
    } catch {
      /* fall through to cache */
    }
  }
  return { items: (await idbGet<Product[]>(PRODUCTS_KEY)) || [], offline: true };
}

export async function getClients(
  accessToken: string | null,
): Promise<{ items: Client[]; offline: boolean }> {
  if (isOnline()) {
    try {
      const data = await apiFetch('/clients', { accessToken });
      const items: Client[] = data.clients || [];
      await idbSet(CLIENTS_KEY, items);
      return { items, offline: false };
    } catch {
      /* fall through to cache */
    }
  }
  return { items: (await idbGet<Client[]>(CLIENTS_KEY)) || [], offline: true };
}

// ---------- Client writes (offline-aware) ----------

export async function saveClient(
  accessToken: string | null,
  form: { name: string; rif: string; address: string },
  existing?: Client | null,
): Promise<Client> {
  const cache = (await idbGet<Client[]>(CLIENTS_KEY)) || [];

  if (isOnline()) {
    try {
      const data = await apiFetch(existing ? `/clients/${existing.id}` : '/clients', {
        method: existing ? 'PUT' : 'POST',
        accessToken,
        body: JSON.stringify(form),
      });
      const saved: Client = data.client;
      const next = existing
        ? cache.map((c) => (c.id === existing.id ? saved : c))
        : [...cache, saved];
      await idbSet(CLIENTS_KEY, next);
      return saved;
    } catch {
      /* fall through to offline path */
    }
  }

  // Offline / failed: optimistic local change + queue.
  if (existing) {
    const updated: Client = { ...existing, ...form, _pending: true };
    await idbSet(CLIENTS_KEY, cache.map((c) => (c.id === existing.id ? updated : c)));
    await enqueue({ kind: 'client.update', id: existing.id, payload: form });
    return updated;
  }
  const tempId = `local-${Date.now()}`;
  const temp: Client = {
    id: tempId,
    ...form,
    vendorId: 'local',
    vendorName: '(pendiente de sincronizar)',
    createdAt: new Date().toISOString(),
    _pending: true,
  };
  await idbSet(CLIENTS_KEY, [...cache, temp]);
  await enqueue({ kind: 'client.create', tempId, payload: form });
  return temp;
}

export async function deleteClient(accessToken: string | null, id: string): Promise<void> {
  const cache = (await idbGet<Client[]>(CLIENTS_KEY)) || [];
  await idbSet(CLIENTS_KEY, cache.filter((c) => c.id !== id));

  if (isOnline() && !id.startsWith('local-')) {
    try {
      await apiFetch(`/clients/${id}`, { method: 'DELETE', accessToken });
      return;
    } catch {
      /* queue below */
    }
  }
  if (!id.startsWith('local-')) {
    await enqueue({ kind: 'client.delete', id });
  }
}

// ---------- Product writes (offline-aware) ----------

export async function saveProduct(
  accessToken: string | null,
  form: any,
  editingCode?: string | null,
): Promise<void> {
  const cache = (await idbGet<Product[]>(PRODUCTS_KEY)) || [];
  const normalized: Product = {
    code: form.code,
    name: form.name,
    category: form.category,
    amountPerPackage: form.amountPerPackage || '',
    price: parseFloat(form.price) || 0,
    imageUrl: form.imageUrl || '',
    stock: form.stock !== undefined && form.stock !== '' ? parseInt(form.stock, 10) : 0,
  };

  if (isOnline()) {
    try {
      await apiFetch(editingCode ? `/products/${editingCode}` : '/products', {
        method: editingCode ? 'PUT' : 'POST',
        accessToken,
        body: JSON.stringify(form),
      });
      const next = editingCode
        ? cache.map((p) => (p.code === editingCode ? normalized : p))
        : [...cache, normalized];
      await idbSet(PRODUCTS_KEY, next);
      return;
    } catch {
      /* fall through */
    }
  }

  const pending = { ...normalized, _pending: true };
  const next = editingCode
    ? cache.map((p) => (p.code === editingCode ? pending : p))
    : [...cache, pending];
  await idbSet(PRODUCTS_KEY, next);
  await enqueue(
    editingCode
      ? { kind: 'product.update', code: editingCode, payload: form }
      : { kind: 'product.create', payload: form },
  );
}

export async function deleteProduct(accessToken: string | null, code: string): Promise<void> {
  const cache = (await idbGet<Product[]>(PRODUCTS_KEY)) || [];
  await idbSet(PRODUCTS_KEY, cache.filter((p) => p.code !== code));

  if (isOnline()) {
    try {
      await apiFetch(`/products/${code}`, { method: 'DELETE', accessToken });
      return;
    } catch {
      /* queue below */
    }
  }
  await enqueue({ kind: 'product.delete', code });
}

// ---------- Sync ----------

let flushing = false;

/** Replays queued offline operations. Returns the number successfully synced. */
export async function flushOutbox(accessToken: string | null): Promise<number> {
  if (flushing || !isOnline()) return 0;
  flushing = true;
  try {
    let outbox = (await idbGet<OutboxOp[]>(OUTBOX_KEY)) || [];
    if (outbox.length === 0) return 0;

    const remaining: OutboxOp[] = [];
    let synced = 0;

    for (const op of outbox) {
      try {
        switch (op.kind) {
          case 'client.create':
            await apiFetch('/clients', { method: 'POST', accessToken, body: JSON.stringify(op.payload) });
            break;
          case 'client.update':
            await apiFetch(`/clients/${op.id}`, { method: 'PUT', accessToken, body: JSON.stringify(op.payload) });
            break;
          case 'client.delete':
            await apiFetch(`/clients/${op.id}`, { method: 'DELETE', accessToken });
            break;
          case 'product.create':
            await apiFetch('/products', { method: 'POST', accessToken, body: JSON.stringify(op.payload) });
            break;
          case 'product.update':
            await apiFetch(`/products/${op.code}`, { method: 'PUT', accessToken, body: JSON.stringify(op.payload) });
            break;
          case 'product.delete':
            await apiFetch(`/products/${op.code}`, { method: 'DELETE', accessToken });
            break;
        }
        synced++;
      } catch {
        remaining.push(op);
      }
    }

    await idbSet(OUTBOX_KEY, remaining);

    // Refresh caches from the server now that we are in sync.
    if (synced > 0) {
      await getProducts(accessToken);
      await getClients(accessToken);
    }
    return synced;
  } finally {
    flushing = false;
  }
}
