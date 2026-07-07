// Shared product search + sort helpers used by the admin and vendor catalogs.

export interface SortableProduct {
  code: string;
  name: string;
  category: string;
  price: number;
}

export type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'code-asc'
  | 'code-desc'
  | 'category-asc'
  | 'category-desc'
  | 'price-asc'
  | 'price-desc';

// Spanish labels for the "Ordenar por" dropdown.
export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name-asc', label: 'Nombre (A-Z)' },
  { value: 'name-desc', label: 'Nombre (Z-A)' },
  { value: 'code-asc', label: 'Código (A-Z)' },
  { value: 'code-desc', label: 'Código (Z-A)' },
  { value: 'category-asc', label: 'Categoría (A-Z)' },
  { value: 'category-desc', label: 'Categoría (Z-A)' },
  { value: 'price-asc', label: 'Precio (menor a mayor)' },
  { value: 'price-desc', label: 'Precio (mayor a menor)' },
];

export type SortField = 'name' | 'code' | 'category' | 'price';

// Per-field metadata for the multi-key sort control: a label plus the Spanish
// wording for each direction (text fields read "A-Z", price reads "menor/mayor").
export const SORT_FIELDS: {
  field: SortField;
  label: string;
  ascLabel: string;
  descLabel: string;
}[] = [
  { field: 'name', label: 'Nombre', ascLabel: 'A-Z', descLabel: 'Z-A' },
  { field: 'code', label: 'Código', ascLabel: 'A-Z', descLabel: 'Z-A' },
  { field: 'category', label: 'Categoría', ascLabel: 'A-Z', descLabel: 'Z-A' },
  { field: 'price', label: 'Precio', ascLabel: 'menor a mayor', descLabel: 'mayor a menor' },
];

export const fieldOf = (o: SortOption) => o.split('-')[0] as SortField;
export const dirOf = (o: SortOption) => o.split('-')[1] as 'asc' | 'desc';

export function filterProducts<T extends SortableProduct>(products: T[], term: string): T[] {
  const q = term.trim().toLowerCase();
  if (!q) return products;
  return products.filter(
    (p) =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q),
  );
}

function compareBy<T extends SortableProduct>(a: T, b: T, sort: SortOption): number {
  const field = fieldOf(sort);
  const factor = dirOf(sort) === 'asc' ? 1 : -1;
  if (field === 'price') return (a.price - b.price) * factor;
  return (
    String(a[field]).localeCompare(String(b[field]), 'es', { sensitivity: 'base' }) * factor
  );
}

/**
 * Sorts by one or more criteria in priority order: the first option is the
 * primary sort, the next ones break ties, and so on. Accepts a single option
 * for convenience.
 */
export function sortProducts<T extends SortableProduct>(
  products: T[],
  sort: SortOption | SortOption[],
): T[] {
  const criteria = Array.isArray(sort) ? sort : [sort];
  if (criteria.length === 0) return [...products];
  return [...products].sort((a, b) => {
    for (const c of criteria) {
      const r = compareBy(a, b, c);
      if (r !== 0) return r;
    }
    return 0;
  });
}
