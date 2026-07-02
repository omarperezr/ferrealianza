import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Create Supabase clients
const getServiceClient = () => createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const getAnonClient = () => createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
);

// Bucket name for product images
const BUCKET_NAME = 'make-745f9946-product-images';

// Default client associated to every vendor (existing and new).
const DEFAULT_CLIENT_ID = 'default-primera-compra';

// Initialize storage bucket
(async () => {
  const supabase = getServiceClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
  if (!bucketExists) {
    await supabase.storage.createBucket(BUCKET_NAME, { public: false });
    console.log(`Created storage bucket: ${BUCKET_NAME}`);
  }
})();

// Seed the default "Primera compra" client (visible to all vendors)
(async () => {
  try {
    const existing = await kv.get(`client:${DEFAULT_CLIENT_ID}`);
    if (!existing) {
      await kv.set(`client:${DEFAULT_CLIENT_ID}`, {
        id: DEFAULT_CLIENT_ID,
        name: 'Primera compra',
        rif: 'N/A',
        address: 'N/A',
        vendorId: 'system',
        vendorName: 'Sistema',
        vendorIds: [],
        allVendors: true,
        createdAt: new Date().toISOString(),
      });
      console.log('Seeded default client: Primera compra');
    }
  } catch (e) {
    console.log(`Error seeding default client: ${e}`);
  }
})();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Middleware to verify authentication and get user
const authMiddleware = async (c: any, next: any) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return c.json({ error: 'No autorizado - falta el token de acceso' }, 401);
  }

  const supabase = getServiceClient();
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return c.json({ error: 'No autorizado - token inválido' }, 401);
  }

  c.set('user', user);
  await next();
};

// Middleware to verify admin role
const adminMiddleware = async (c: any, next: any) => {
  const user = c.get('user');
  const userRole = user.user_metadata?.role || 'user';

  if (userRole !== 'admin') {
    return c.json({ error: 'Acceso denegado - se requieren permisos de administrador' }, 403);
  }

  await next();
};

// Health check endpoint
app.get("/make-server-745f9946/health", (c) => {
  return c.json({ status: "ok" });
});

// ===== AUTH ROUTES =====

// Sign up (create new user)
app.post("/make-server-745f9946/auth/signup", async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: 'Email, contraseña y nombre son requeridos' }, 400);
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role: role || 'user' },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Error al crear usuario durante registro: ${error.message}`);
      return c.json({ error: `Error al crear usuario: ${error.message}` }, 400);
    }

    return c.json({ user: data.user });
  } catch (error) {
    console.log(`Error en registro de usuario: ${error}`);
    return c.json({ error: 'Error en el servidor al registrar usuario' }, 500);
  }
});

// Sign in
app.post("/make-server-745f9946/auth/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: 'Email y contraseña son requeridos' }, 400);
    }

    const supabase = getAnonClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log(`Error al iniciar sesión: ${error.message}`);
      return c.json({ error: `Error al iniciar sesión: ${error.message}` }, 400);
    }

    return c.json({
      session: data.session,
      user: data.user
    });
  } catch (error) {
    console.log(`Error en inicio de sesión: ${error}`);
    return c.json({ error: 'Error en el servidor al iniciar sesión' }, 500);
  }
});

// Get current session
app.get("/make-server-745f9946/auth/session", authMiddleware, async (c) => {
  const user = c.get('user');
  return c.json({ user });
});

// Sign out
app.post("/make-server-745f9946/auth/signout", authMiddleware, async (c) => {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  const supabase = getAnonClient();

  await supabase.auth.admin.signOut(accessToken!);
  return c.json({ message: 'Sesión cerrada exitosamente' });
});

// ===== USER MANAGEMENT ROUTES (admin only) =====
//
// These routes operate ONLY on Supabase Auth users. They never read, write or
// delete any product (or other kv_store) data, so product inventory cannot be
// affected by user management.

// List all users (admins and sellers)
app.get("/make-server-745f9946/users", authMiddleware, adminMiddleware, async (c) => {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) {
      console.log(`Error al listar usuarios: ${error.message}`);
      return c.json({ error: 'Error al obtener usuarios' }, 500);
    }
    const users = (data?.users || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.user_metadata?.name || u.email,
      role: u.user_metadata?.role || 'user',
      createdAt: u.created_at,
    }));
    return c.json({ users });
  } catch (error) {
    console.log(`Error al obtener usuarios: ${error}`);
    return c.json({ error: 'Error al obtener usuarios' }, 500);
  }
});

// Create a user (seller or admin) — admin only
app.post("/make-server-745f9946/users", authMiddleware, adminMiddleware, async (c) => {
  try {
    const { email, password, name, role } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: 'Email, contraseña y nombre son requeridos' }, 400);
    }
    if (String(password).length < 6) {
      return c.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400);
    }
    const finalRole = role === 'admin' ? 'admin' : 'user';

    const supabase = getServiceClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role: finalRole },
      // Automatically confirm the email since no email server is configured.
      email_confirm: true,
    });

    if (error) {
      console.log(`Error al crear usuario: ${error.message}`);
      return c.json({ error: `Error al crear usuario: ${error.message}` }, 400);
    }

    return c.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email,
        role: data.user.user_metadata?.role || 'user',
        createdAt: data.user.created_at,
      },
    });
  } catch (error) {
    console.log(`Error al crear usuario: ${error}`);
    return c.json({ error: 'Error en el servidor al crear usuario' }, 500);
  }
});

// Delete a user — admin only (cannot delete yourself)
app.delete("/make-server-745f9946/users/:id", authMiddleware, adminMiddleware, async (c) => {
  try {
    const requester = c.get('user');
    const id = c.req.param('id');

    if (id === requester.id) {
      return c.json({ error: 'No puedes eliminar tu propio usuario' }, 400);
    }

    const supabase = getServiceClient();
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) {
      console.log(`Error al eliminar usuario: ${error.message}`);
      return c.json({ error: `Error al eliminar usuario: ${error.message}` }, 400);
    }

    return c.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.log(`Error al eliminar usuario: ${error}`);
    return c.json({ error: 'Error en el servidor al eliminar usuario' }, 500);
  }
});

// ===== PRODUCT ROUTES =====

// Get all products (vendors don't see hidden products)
app.get("/make-server-745f9946/products", authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const userRole = user.user_metadata?.role || 'user';
    const products = await kv.getByPrefix('product:');
    const visible = userRole === 'admin'
      ? products
      : products.filter((p: any) => !p.hidden);
    return c.json({ products: visible });
  } catch (error) {
    console.log(`Error al obtener productos: ${error}`);
    return c.json({ error: 'Error al obtener productos' }, 500);
  }
});

// Get single product
app.get("/make-server-745f9946/products/:code{.+}", authMiddleware, async (c) => {
  try {
    const code = c.req.param('code');
    const product = await kv.get(`product:${code}`);

    if (!product) {
      return c.json({ error: 'Producto no encontrado' }, 404);
    }

    return c.json({ product });
  } catch (error) {
    console.log(`Error al obtener producto: ${error}`);
    return c.json({ error: 'Error al obtener producto' }, 500);
  }
});

// Create product (admin only)
app.post("/make-server-745f9946/products", authMiddleware, adminMiddleware, async (c) => {
  try {
    const product = await c.req.json();
    const { code, name, category, amountPerPackage, price, imageUrl, stock, hidden } = product;

    if (!code || !name || !category || !price) {
      return c.json({ error: 'Código, nombre, categoría y precio son requeridos' }, 400);
    }

    // Check if product already exists
    const existing = await kv.get(`product:${code}`);
    if (existing) {
      return c.json({ error: 'Ya existe un producto con este código' }, 400);
    }

    const newProduct = {
      code,
      name,
      category,
      amountPerPackage: amountPerPackage || '',
      price: parseFloat(price),
      imageUrl: imageUrl || '',
      stock: stock !== undefined && stock !== '' ? parseInt(stock, 10) : 0,
      hidden: !!hidden,
      createdAt: new Date().toISOString()
    };

    await kv.set(`product:${code}`, newProduct);
    return c.json({ product: newProduct });
  } catch (error) {
    console.log(`Error al crear producto: ${error}`);
    return c.json({ error: 'Error al crear producto' }, 500);
  }
});

// Bulk create/update products (admin only), used by the Excel/PDF importers.
// Reads all existing products once (by prefix) and writes the changed ones in
// chunked upserts, instead of one create/update request per row.
app.post("/make-server-745f9946/products/bulk", authMiddleware, adminMiddleware, async (c) => {
  try {
    const { products } = await c.req.json();
    if (!Array.isArray(products) || products.length === 0) {
      return c.json({ error: 'Se requiere una lista de productos' }, 400);
    }

    // Dedupe by code (last one wins) since duplicate codes would collide on
    // the same kv key during the upsert.
    const byCode = new Map<string, any>();
    for (const p of products) {
      if (p?.code) byCode.set(String(p.code), p);
    }
    const rows = [...byCode.values()];

    const supabase = getServiceClient();

    // Read existing products with a single prefix query. We can't fetch by an
    // exact key list here: PostgREST encodes `.in('key', [...])` into the
    // request URL, and ~1500 keys overflow the URL length limit (500 error).
    const { data: existingRows, error: fetchError } = await supabase
      .from('kv_store_745f9946')
      .select('key, value')
      .like('key', 'product:%');
    if (fetchError) throw new Error(fetchError.message);

    const existingByKey = new Map((existingRows || []).map((r: any) => [r.key, r.value]));

    const toUpsert: { key: string; value: any }[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      if (!row.code || !row.name || !row.category || !row.price) {
        skipped++;
        continue;
      }

      const key = `product:${row.code}`;
      const existing = existingByKey.get(key);

      const normalized = {
        code: row.code,
        name: row.name,
        category: row.category,
        amountPerPackage: row.amountPerPackage || '',
        price: parseFloat(row.price),
        // imageUrl/stock are only overwritten when the row actually provides
        // them, so an import that omits them preserves the existing value.
        imageUrl: row.imageUrl !== undefined ? row.imageUrl : (existing?.imageUrl || ''),
        stock: row.stock !== undefined && row.stock !== ''
          ? parseInt(row.stock, 10)
          : (existing?.stock ?? 0),
        hidden: existing?.hidden ?? false,
        createdAt: existing?.createdAt || new Date().toISOString(),
        ...(existing ? { updatedAt: new Date().toISOString() } : {}),
      };

      if (existing) {
        const unchanged =
          existing.name === normalized.name &&
          existing.category === normalized.category &&
          (existing.amountPerPackage || '') === normalized.amountPerPackage &&
          Number(existing.price) === normalized.price &&
          (row.stock === undefined || Number(existing.stock ?? 0) === normalized.stock) &&
          (row.imageUrl === undefined || (existing.imageUrl || '') === normalized.imageUrl);

        if (unchanged) {
          skipped++;
          continue;
        }
        updated++;
      } else {
        created++;
      }

      toUpsert.push({ key, value: normalized });
    }

    // Write in chunks so a very large import doesn't exceed payload/statement
    // limits in a single upsert.
    const CHUNK = 500;
    for (let i = 0; i < toUpsert.length; i += CHUNK) {
      const batch = toUpsert.slice(i, i + CHUNK);
      const { error: upsertError } = await supabase
        .from('kv_store_745f9946')
        .upsert(batch.map(({ key, value }) => ({ key, value })));
      if (upsertError) throw new Error(upsertError.message);
    }

    return c.json({ created, updated, skipped });
  } catch (error) {
    console.log(`Error al importar productos en lote: ${error}`);
    return c.json({ error: 'Error al importar productos en lote' }, 500);
  }
});

// Update product (admin only)
app.put("/make-server-745f9946/products/:code{.+}", authMiddleware, adminMiddleware, async (c) => {
  try {
    const code = c.req.param('code');
    const updates = await c.req.json();

    const existing = await kv.get(`product:${code}`);
    if (!existing) {
      return c.json({ error: 'Producto no encontrado' }, 404);
    }

    const updatedProduct = {
      ...existing,
      ...updates,
      code, // Ensure code doesn't change
      price: updates.price ? parseFloat(updates.price) : existing.price,
      stock: updates.stock !== undefined && updates.stock !== ''
        ? parseInt(updates.stock, 10)
        : existing.stock ?? 0,
      hidden: updates.hidden !== undefined ? !!updates.hidden : (existing.hidden ?? false),
      updatedAt: new Date().toISOString()
    };

    await kv.set(`product:${code}`, updatedProduct);
    return c.json({ product: updatedProduct });
  } catch (error) {
    console.log(`Error al actualizar producto: ${error}`);
    return c.json({ error: 'Error al actualizar producto' }, 500);
  }
});

// Bulk delete products (admin only). One round trip for any number of codes,
// instead of the client looping a DELETE per product.
app.delete("/make-server-745f9946/products", authMiddleware, adminMiddleware, async (c) => {
  try {
    const { codes } = await c.req.json();
    if (!Array.isArray(codes) || codes.length === 0) {
      return c.json({ error: 'Se requiere una lista de códigos' }, 400);
    }

    // Delete in chunks: `kv.mdel` uses `.in('key', [...])`, which PostgREST
    // encodes into the request URL, so deleting ~1500 keys at once overflows
    // the URL length limit.
    const keys = codes.map((code: string) => `product:${code}`);
    const CHUNK = 500;
    for (let i = 0; i < keys.length; i += CHUNK) {
      await kv.mdel(keys.slice(i, i + CHUNK));
    }
    return c.json({ message: 'Productos eliminados exitosamente', count: codes.length });
  } catch (error) {
    console.log(`Error al eliminar productos en lote: ${error}`);
    return c.json({ error: 'Error al eliminar productos en lote' }, 500);
  }
});

// Delete product (admin only)
app.delete("/make-server-745f9946/products/:code{.+}", authMiddleware, adminMiddleware, async (c) => {
  try {
    const code = c.req.param('code');

    const existing = await kv.get(`product:${code}`);
    if (!existing) {
      return c.json({ error: 'Producto no encontrado' }, 404);
    }

    await kv.del(`product:${code}`);
    return c.json({ message: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.log(`Error al eliminar producto: ${error}`);
    return c.json({ error: 'Error al eliminar producto' }, 500);
  }
});

// Upload product image (admin only)
app.post("/make-server-745f9946/upload-image", authMiddleware, adminMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json({ error: 'No se proporcionó ningún archivo' }, 400);
    }

    const supabase = getServiceClient();
    const fileName = `${Date.now()}-${file.name}`;
    const fileBuffer = await file.arrayBuffer();

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) {
      console.log(`Error al subir imagen: ${error.message}`);
      return c.json({ error: `Error al subir imagen: ${error.message}` }, 500);
    }

    // Create signed URL (valid for 1 year)
    const { data: urlData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(fileName, 31536000);

    return c.json({ imageUrl: urlData?.signedUrl });
  } catch (error) {
    console.log(`Error al procesar subida de imagen: ${error}`);
    return c.json({ error: 'Error al procesar subida de imagen' }, 500);
  }
});

// ===== VENDOR ROUTES =====

// List vendors (admin only) - used to associate clients to vendors
app.get("/make-server-745f9946/vendors", authMiddleware, adminMiddleware, async (c) => {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) {
      console.log(`Error al listar vendedores: ${error.message}`);
      return c.json({ error: 'Error al obtener vendedores' }, 500);
    }
    const vendors = (data?.users || [])
      .filter((u: any) => (u.user_metadata?.role || 'user') !== 'admin')
      .map((u: any) => ({
        id: u.id,
        name: u.user_metadata?.name || u.email,
        email: u.email,
      }));
    return c.json({ vendors });
  } catch (error) {
    console.log(`Error al obtener vendedores: ${error}`);
    return c.json({ error: 'Error al obtener vendedores' }, 500);
  }
});

// ===== CLIENT ROUTES =====

// Helper: does a client belong to a vendor?
const clientVisibleTo = (client: any, userId: string) =>
  client.allVendors === true ||
  (Array.isArray(client.vendorIds) && client.vendorIds.includes(userId)) ||
  client.vendorId === userId;

// Create client (admin only)
app.post("/make-server-745f9946/clients", authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if ((user.user_metadata?.role || 'user') !== 'admin') {
      return c.json({ error: 'Solo un administrador puede crear clientes' }, 403);
    }
    const { name, rif, address, email, phone, vendorIds, allVendors } = await c.req.json();

    if (!name || !rif || !address || !email || !phone) {
      return c.json({ error: 'Nombre, RIF, dirección, correo y teléfono son requeridos' }, 400);
    }

    const id = `${Date.now()}-${user.id}`;
    const client = {
      id,
      name,
      rif,
      address,
      email,
      phone,
      vendorId: user.id,
      vendorName: user.user_metadata?.name || user.email,
      vendorIds: Array.isArray(vendorIds) ? vendorIds : [],
      allVendors: !!allVendors,
      createdAt: new Date().toISOString()
    };

    await kv.set(`client:${id}`, client);
    return c.json({ client });
  } catch (error) {
    console.log(`Error al crear cliente: ${error}`);
    return c.json({ error: 'Error al crear cliente' }, 500);
  }
});

// Bulk import clients (admin only) — upsert by RIF, skip rows missing name or rif
app.post("/make-server-745f9946/clients/bulk", authMiddleware, adminMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const { clients } = await c.req.json();
    if (!Array.isArray(clients) || clients.length === 0) {
      return c.json({ error: 'Se requiere una lista de clientes' }, 400);
    }

    const supabase = getServiceClient();

    const { data: existingRows, error: fetchError } = await supabase
      .from('kv_store_745f9946')
      .select('key, value')
      .like('key', 'client:%');
    if (fetchError) throw new Error(fetchError.message);

    const existingByRif = new Map<string, any>();
    for (const row of (existingRows || [])) {
      if (row.value?.rif) existingByRif.set(String(row.value.rif).trim().toUpperCase(), row.value);
    }

    const toUpsert: { key: string; value: any }[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of clients) {
      if (!row.name || !row.rif) { skipped++; continue; }
      const rifKey = String(row.rif).trim().toUpperCase();
      const existing = existingByRif.get(rifKey);

      if (existing) {
        const normalized = {
          ...existing,
          name: row.name,
          rif: row.rif,
          address: row.address || existing.address || '',
          email: row.email || existing.email || '',
          phone: row.phone || existing.phone || '',
          updatedAt: new Date().toISOString(),
        };
        toUpsert.push({ key: `client:${existing.id}`, value: normalized });
        updated++;
      } else {
        const id = `${Date.now()}-import-${Math.random().toString(36).slice(2)}`;
        const normalized = {
          id,
          name: row.name,
          rif: row.rif,
          address: row.address || '',
          email: row.email || '',
          phone: row.phone || '',
          vendorId: user.id,
          vendorName: user.user_metadata?.name || user.email,
          vendorIds: [],
          allVendors: true,
          createdAt: new Date().toISOString(),
        };
        toUpsert.push({ key: `client:${id}`, value: normalized });
        created++;
      }
    }

    const CHUNK = 500;
    for (let i = 0; i < toUpsert.length; i += CHUNK) {
      const batch = toUpsert.slice(i, i + CHUNK);
      const { error: upsertError } = await supabase
        .from('kv_store_745f9946')
        .upsert(batch.map(({ key, value }) => ({ key, value })));
      if (upsertError) throw new Error(upsertError.message);
    }

    return c.json({ created, updated, skipped });
  } catch (error) {
    console.log(`Error al importar clientes en lote: ${error}`);
    return c.json({ error: 'Error al importar clientes en lote' }, 500);
  }
});

// Bulk delete clients (admin only)
app.delete("/make-server-745f9946/clients", authMiddleware, adminMiddleware, async (c) => {
  try {
    const { ids } = await c.req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return c.json({ error: 'Se requiere una lista de IDs' }, 400);
    }

    const keys = ids.map((id: string) => `client:${id}`);
    const CHUNK = 500;
    for (let i = 0; i < keys.length; i += CHUNK) {
      await kv.mdel(keys.slice(i, i + CHUNK));
    }
    return c.json({ message: 'Clientes eliminados exitosamente', count: ids.length });
  } catch (error) {
    console.log(`Error al eliminar clientes en lote: ${error}`);
    return c.json({ error: 'Error al eliminar clientes en lote' }, 500);
  }
});

// Get clients (vendors see clients associated to them, admins see all)
app.get("/make-server-745f9946/clients", authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const userRole = user.user_metadata?.role || 'user';

    const allClients = await kv.getByPrefix('client:');

    const clients = userRole === 'admin'
      ? allClients
      : allClients.filter((client: any) => clientVisibleTo(client, user.id));

    return c.json({ clients });
  } catch (error) {
    console.log(`Error al obtener clientes: ${error}`);
    return c.json({ error: 'Error al obtener clientes' }, 500);
  }
});

// Update client (owner vendor or admin only)
app.put("/make-server-745f9946/clients/:id", authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const userRole = user.user_metadata?.role || 'user';
    const id = c.req.param('id');
    const updates = await c.req.json();

    const existing = await kv.get(`client:${id}`);
    if (!existing) {
      return c.json({ error: 'Cliente no encontrado' }, 404);
    }

    if (userRole !== 'admin' && !clientVisibleTo(existing, user.id)) {
      return c.json({ error: 'Acceso denegado - no eres el vendedor de este cliente' }, 403);
    }

    const updatedClient = {
      ...existing,
      name: updates.name ?? existing.name,
      rif: updates.rif ?? existing.rif,
      address: updates.address ?? existing.address,
      email: updates.email ?? existing.email ?? '',
      phone: updates.phone ?? existing.phone ?? '',
      // Vendor associations can only be changed by an admin.
      vendorIds: userRole === 'admin' && updates.vendorIds !== undefined
        ? (Array.isArray(updates.vendorIds) ? updates.vendorIds : [])
        : (existing.vendorIds ?? []),
      allVendors: userRole === 'admin' && updates.allVendors !== undefined
        ? !!updates.allVendors
        : (existing.allVendors ?? false),
      updatedAt: new Date().toISOString()
    };

    await kv.set(`client:${id}`, updatedClient);
    return c.json({ client: updatedClient });
  } catch (error) {
    console.log(`Error al actualizar cliente: ${error}`);
    return c.json({ error: 'Error al actualizar cliente' }, 500);
  }
});

// Delete client (owner vendor or admin only)
app.delete("/make-server-745f9946/clients/:id", authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const userRole = user.user_metadata?.role || 'user';
    const id = c.req.param('id');

    if (id === DEFAULT_CLIENT_ID) {
      return c.json({ error: 'No se puede eliminar el cliente por defecto' }, 400);
    }

    const existing = await kv.get(`client:${id}`);
    if (!existing) {
      return c.json({ error: 'Cliente no encontrado' }, 404);
    }

    if (userRole !== 'admin' && existing.vendorId !== user.id) {
      return c.json({ error: 'Acceso denegado - no eres el vendedor de este cliente' }, 403);
    }

    await kv.del(`client:${id}`);
    return c.json({ message: 'Cliente eliminado exitosamente' });
  } catch (error) {
    console.log(`Error al eliminar cliente: ${error}`);
    return c.json({ error: 'Error al eliminar cliente' }, 500);
  }
});

// ===== ORDER ROUTES =====

// Create order
app.post("/make-server-745f9946/orders", authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const { items, discount, tax, clientId } = await c.req.json();

    if (!items || items.length === 0) {
      return c.json({ error: 'El pedido debe contener al menos un producto' }, 400);
    }

    let client = null;
    if (clientId) {
      client = await kv.get(`client:${clientId}`);
    }

    const orderId = `order:${Date.now()}-${user.id}`;
    const order = {
      id: orderId,
      userId: user.id,
      userName: user.user_metadata?.name || user.email,
      clientId: client?.id || null,
      clientName: client?.name || null,
      clientRif: client?.rif || null,
      clientAddress: client?.address || null,
      items,
      discount: discount || 0,
      tax: tax || 0,
      createdAt: new Date().toISOString()
    };

    await kv.set(orderId, order);
    return c.json({ order });
  } catch (error) {
    console.log(`Error al crear pedido: ${error}`);
    return c.json({ error: 'Error al crear pedido' }, 500);
  }
});

// Get user orders
app.get("/make-server-745f9946/orders", authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const userRole = user.user_metadata?.role || 'user';

    const allOrders = await kv.getByPrefix('order:');

    // Admins can see all orders, users only see their own
    const orders = userRole === 'admin'
      ? allOrders
      : allOrders.filter((order: any) => order.userId === user.id);

    return c.json({ orders });
  } catch (error) {
    console.log(`Error al obtener pedidos: ${error}`);
    return c.json({ error: 'Error al obtener pedidos' }, 500);
  }
});

Deno.serve(app.fetch);