// Search, filter and sort helpers for the admin "Clientes" tab.
import { Client } from './dataStore';

export type ClientSortOption = 'name-asc' | 'name-desc' | 'rif-asc' | 'rif-desc';

export type ClientSortField = 'name' | 'rif';

export const CLIENT_SORT_FIELDS: {
  field: ClientSortField;
  label: string;
  ascLabel: string;
  descLabel: string;
}[] = [
  { field: 'name', label: 'Nombre', ascLabel: 'A-Z', descLabel: 'Z-A' },
  { field: 'rif', label: 'RIF', ascLabel: 'A-Z', descLabel: 'Z-A' },
];

export const clientFieldOf = (o: ClientSortOption) => o.split('-')[0] as ClientSortField;
export const clientDirOf = (o: ClientSortOption) => o.split('-')[1] as 'asc' | 'desc';

// Tri-state filter: 'any' ignores the field, 'yes'/'no' require its presence.
export type TriState = 'any' | 'yes' | 'no';

export interface ClientFilters {
  vendorId: string; // '' = any vendor; otherwise a specific vendor id
  email: TriState;
  phone: TriState;
}

export const EMPTY_CLIENT_FILTERS: ClientFilters = {
  vendorId: '',
  email: 'any',
  phone: 'any',
};

export const activeFilterCount = (f: ClientFilters) =>
  (f.vendorId ? 1 : 0) + (f.email !== 'any' ? 1 : 0) + (f.phone !== 'any' ? 1 : 0);

// A client is associated with a vendor if it's shared with all vendors or the
// vendor is in its assigned list.
const hasVendor = (c: Client, vendorId: string) =>
  c.allVendors || (c.vendorIds?.includes(vendorId) ?? false);

const matchesTri = (state: TriState, present: boolean) =>
  state === 'any' || (state === 'yes' ? present : !present);

export function filterClients(clients: Client[], term: string, filters: ClientFilters): Client[] {
  const q = term.trim().toLowerCase();
  return clients.filter((c) => {
    if (
      q &&
      !(
        (c.name || '').toLowerCase().includes(q) ||
        (c.rif || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
      )
    ) {
      return false;
    }
    return (
      (!filters.vendorId || hasVendor(c, filters.vendorId)) &&
      matchesTri(filters.email, !!(c.email || '').trim()) &&
      matchesTri(filters.phone, !!(c.phone || '').trim())
    );
  });
}

function compareClientBy(a: Client, b: Client, sort: ClientSortOption): number {
  const field = clientFieldOf(sort);
  const factor = clientDirOf(sort) === 'asc' ? 1 : -1;
  return String(a[field]).localeCompare(String(b[field]), 'es', { sensitivity: 'base' }) * factor;
}

export function sortClients(clients: Client[], sort: ClientSortOption[]): Client[] {
  if (sort.length === 0) return [...clients];
  return [...clients].sort((a, b) => {
    for (const c of sort) {
      const r = compareClientBy(a, b, c);
      if (r !== 0) return r;
    }
    return 0;
  });
}
