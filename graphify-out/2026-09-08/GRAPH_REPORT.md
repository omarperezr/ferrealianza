# Graph Report - ferrealianza  (2026-09-08)

## Corpus Check
- 49 files · ~32,182 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 347 nodes · 732 edges · 25 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0d005db7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AdminDashboard.tsx
- SalesPanel.tsx
- ProductSortControl.tsx
- ClientControls.tsx
- share.ts
- package.json
- compilerOptions
- xlsxImages.ts
- Sistema de Gestión de Inventario - FerreAlianza
- kv_store.tsx
- dependencies
- pdfImport.ts
- compilerOptions
- AuthContext.tsx
- vite-env.d.ts
- CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `AdminDashboard()` - 25 edges
2. `cn()` - 22 edges
3. `apiFetch()` - 18 edges
4. `compilerOptions` - 18 edges
5. `useAuth()` - 17 edges
6. `SalesPanel()` - 16 edges
7. `idbSet()` - 15 edges
8. `isOnline()` - 14 edges
9. `Button` - 13 edges
10. `getProducts()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `AppContent()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/App.tsx → src/app/components/AuthContext.tsx
- `AdminDashboard()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/components/AdminDashboard.tsx → src/app/components/AuthContext.tsx
- `AdminDashboard()` --calls--> `filterClients()`  [EXTRACTED]
  src/app/components/AdminDashboard.tsx → src/app/utils/sortClients.ts
- `AuthProvider()` --calls--> `apiFetch()`  [EXTRACTED]
  src/app/components/AuthContext.tsx → src/app/utils/api.ts
- `OfflineSync()` --calls--> `useAuth()`  [EXTRACTED]
  src/app/components/OfflineSync.tsx → src/app/components/AuthContext.tsx

## Import Cycles
- None detected.

## Communities (25 total, 0 thin omitted)

### Community 0 - "AdminDashboard.tsx"
Cohesion: 0.14
Nodes (40): AdminDashboard(), ClientVendorsDialog(), OfflineSync(), clampPercent(), SalesPanel(), apiFetch(), deleteClient(), deleteClients() (+32 more)

### Community 1 - "SalesPanel.tsx"
Cohesion: 0.15
Nodes (30): ClientFormDialog(), ClientFormDialogProps, empty, Props, Vendor, CartItem, loadPersistedCart(), PersistedCart (+22 more)

### Community 2 - "ProductSortControl.tsx"
Cohesion: 0.26
Nodes (12): ProductSortControl(), Props, compareBy(), dirOf(), fieldOf(), SORT_FIELDS, SortableProduct, SortField (+4 more)

### Community 3 - "ClientControls.tsx"
Cohesion: 0.17
Nodes (20): ClientFilterControl(), ClientSortControl(), FilterProps, SortProps, TRI_OPTIONS, TRI_ROWS, Vendor, activeFilterCount() (+12 more)

### Community 4 - "share.ts"
Cohesion: 0.50
Nodes (4): buildProductText(), ShareableProduct, shareProduct(), ShareResult

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

### Community 14 - "kv_store.tsx"
Cohesion: 0.19
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
Nodes (19): App(), AppContent(), AuthContext, AuthContextType, AuthProvider(), ManagedUser, useAuth(), User (+11 more)

### Community 29 - "vite-env.d.ts"
Cohesion: 0.40
Nodes (4): *.jpeg, *.jpg, *.png, *.svg

### Community 94 - "CLAUDE.md"
Cohesion: 0.50
Nodes (3): Behavioral guidelines, graphify, Orchestrated implementation workflow (token-efficient)

## Knowledge Gaps
- **104 isolated node(s):** `name`, `private`, `version`, `type`, `build` (+99 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 125 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `AdminDashboard()` connect `AdminDashboard.tsx` to `AuthContext.tsx`, `xlsxImages.ts`, `pdfImport.ts`, `ClientControls.tsx`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _104 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AdminDashboard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14492753623188406 - nodes in this community are weakly interconnected._
- **Should `SalesPanel.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14634146341463414 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._