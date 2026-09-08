# Graph Report - ferrealianza  (2026-09-08)

## Corpus Check
- 51 files · ~33,577 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 366 nodes · 756 edges · 26 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `04d5044a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AdminDashboard.tsx
- cn
- ProductSortControl.tsx
- SalesPanel.tsx
- clientsImport.ts
- package.json
- compilerOptions
- xlsxImages.ts
- Sistema de Gestión de Inventario - FerreAlianza
- clientsImport.test.mjs
- kv_store.tsx
- dependencies
- pdfImport.ts
- compilerOptions
- AuthContext.tsx
- vite-env.d.ts
- CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `AdminDashboard()` - 26 edges
2. `cn()` - 22 edges
3. `apiFetch()` - 18 edges
4. `compilerOptions` - 18 edges
5. `useAuth()` - 17 edges
6. `SalesPanel()` - 17 edges
7. `idbSet()` - 15 edges
8. `isOnline()` - 14 edges
9. `Button` - 13 edges
10. `getProducts()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `AppContent()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/App.tsx → src/app/components/AuthContext.tsx
- `AdminDashboard()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/components/AdminDashboard.tsx → src/app/components/AuthContext.tsx
- `AdminDashboard()` --calls--> `parseClientRows()`  [EXTRACTED]
  src/app/components/AdminDashboard.tsx → src/app/utils/clientsImport.ts
- `AdminDashboard()` --calls--> `filterClients()`  [EXTRACTED]
  src/app/components/AdminDashboard.tsx → src/app/utils/sortClients.ts
- `AdminDashboard()` --calls--> `sortClients()`  [EXTRACTED]
  src/app/components/AdminDashboard.tsx → src/app/utils/sortClients.ts

## Import Cycles
- None detected.

## Communities (26 total, 0 thin omitted)

### Community 0 - "AdminDashboard.tsx"
Cohesion: 0.18
Nodes (33): AdminDashboard(), ClientFormDialog(), ClientVendorsDialog(), apiFetch(), deleteClient(), deleteClients(), deleteProduct(), deleteProducts() (+25 more)

### Community 1 - "cn"
Cohesion: 0.17
Nodes (24): ClientFormDialogProps, empty, Props, Vendor, Client, Button, ButtonProps, buttonVariants (+16 more)

### Community 2 - "ProductSortControl.tsx"
Cohesion: 0.24
Nodes (13): ProductSortControl(), Props, compareBy(), dirOf(), fieldOf(), SORT_FIELDS, SortableProduct, SortField (+5 more)

### Community 3 - "SalesPanel.tsx"
Cohesion: 0.10
Nodes (35): ClientFilterControl(), ClientSortControl(), FilterProps, SortProps, TRI_OPTIONS, TRI_ROWS, Vendor, CartItem (+27 more)

### Community 4 - "clientsImport.ts"
Cohesion: 0.31
Nodes (8): COLS, Field, findCol(), ImportedClient, norm(), parseClientRows(), ParsedClients, rifKeyOf()

### Community 5 - "package.json"
Cohesion: 0.06
Nodes (30): allowScripts, core-js@3.49.0, esbuild@0.25.12, @tailwindcss/oxide@4.1.12, devDependencies, tailwindcss, @tailwindcss/vite, vite (+22 more)

### Community 7 - "compilerOptions"
Cohesion: 0.08
Nodes (24): DOM, DOM.Iterable, ES2020, src, compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules (+16 more)

### Community 8 - "xlsxImages.ts"
Cohesion: 0.22
Nodes (18): ColumnMap, detectHeader(), ExcelProduct, HEADER_ALIASES, isEmptyCell(), normalize(), parseProductsFromExcel(), extractXlsxImages() (+10 more)

### Community 10 - "Sistema de Gestión de Inventario - FerreAlianza"
Cohesion: 0.10
Nodes (19): 1. Desplegar el Servidor Supabase, 2. Crear el Primer Usuario Administrador, Atributos de Productos, Añadir Productos Manualmente:, Como Administrador:, Como Usuario:, Configuración Inicial, Crear un Pedido: (+11 more)

### Community 12 - "clientsImport.test.mjs"
Cohesion: 0.25
Nodes (6): alt, { clients, skipped, merged, sheet, error }, mod, require, wb, XLSX

### Community 14 - "kv_store.tsx"
Cohesion: 0.18
Nodes (11): app, authMiddleware(), getServiceClient(), client(), del(), get(), getByPrefix(), mdel() (+3 more)

### Community 15 - "dependencies"
Cohesion: 0.06
Nodes (31): class-variance-authority, clsx, lucide-react, dependencies, class-variance-authority, clsx, jspdf, jspdf-autotable (+23 more)

### Community 18 - "pdfImport.ts"
Cohesion: 0.26
Nodes (11): canvasToBlob(), columnOf(), cropImageCell(), ExtractedImage, Frag, hashImageData(), ParsedRow, parsePrice() (+3 more)

### Community 23 - "compilerOptions"
Cohesion: 0.22
Nodes (8): vite.config.ts, compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 24 - "AuthContext.tsx"
Cohesion: 0.10
Nodes (21): App(), AppContent(), AuthContext, AuthContextType, AuthProvider(), ManagedUser, useAuth(), User (+13 more)

### Community 29 - "vite-env.d.ts"
Cohesion: 0.40
Nodes (4): *.jpeg, *.jpg, *.png, *.svg

### Community 94 - "CLAUDE.md"
Cohesion: 0.50
Nodes (3): Behavioral guidelines, graphify, Orchestrated implementation workflow (token-efficient)

## Knowledge Gaps
- **114 isolated node(s):** `name`, `private`, `version`, `type`, `build` (+109 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 137 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AdminDashboard()` connect `AdminDashboard.tsx` to `ProductSortControl.tsx`, `SalesPanel.tsx`, `clientsImport.ts`, `xlsxImages.ts`, `pdfImport.ts`, `AuthContext.tsx`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _114 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `SalesPanel.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10128205128205128 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Sistema de Gestión de Inventario - FerreAlianza` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._