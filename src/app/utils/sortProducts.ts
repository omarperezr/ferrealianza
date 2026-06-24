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

export function filterProducts<T extends SortableProduct>(products: T[], term: string): T[] {
  const q = term.trim().toLowerCase();
  if (!q) return products;
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q),
  );
}

export function sortProducts<T extends SortableProduct>(products: T[], sort: SortOption): T[] {
  const [field, dir] = sort.split('-') as [keyof SortableProduct, 'asc' | 'desc'];
  const factor = dir === 'asc' ? 1 : -1;
  return [...products].sort((a, b) => {
    if (field === 'price') return (a.price - b.price) * factor;
    return String(a[field]).localeCompare(String(b[field]), 'es', { sensitivity: 'base' }) * factor;
  });
}
