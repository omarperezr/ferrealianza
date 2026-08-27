# Graph Report - ferrealianza  (2026-08-27)

## Corpus Check
- 49 files · ~32,280 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 345 nodes · 724 edges · 21 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.55)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c54f5f0d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AdminDashboard.tsx
- sidebar.tsx
- cn
- ClientControls.tsx
- package.json
- compilerOptions
- xlsxImages.ts
- Sistema de Gestión de Inventario - FerreAlianza
- kv_store.tsx
- dependencies
- pdfImport.ts
- compilerOptions
- ErrorBoundary
- vite-env.d.ts
- CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `AdminDashboard()` - 27 edges
2. `SalesPanel()` - 19 edges
3. `apiFetch()` - 18 edges
4. `compilerOptions` - 18 edges
5. `useAuth()` - 17 edges
6. `idbSet()` - 15 edges
7. `isOnline()` - 14 edges
8. `Button` - 11 edges
9. `getProducts()` - 10 edges
10. `getClients()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `AdminDashboard()` --indirect_call--> `client()`  [INFERRED]
  src/app/components/AdminDashboard.tsx → supabase/functions/server/kv_store.tsx
- `SalesPanel()` --references--> `jspdf`  [EXTRACTED]
  src/app/components/SalesPanel.tsx → package.json
- `AdminDashboard()` --references--> `xlsx`  [EXTRACTED]
  src/app/components/AdminDashboard.tsx → package.json
- `SalesPanel()` --references--> `xlsx`  [EXTRACTED]
  src/app/components/SalesPanel.tsx → package.json
- `parseProductsFromExcel()` --references--> `xlsx`  [EXTRACTED]
  src/app/utils/excelImport.ts → package.json

## Import Cycles
- None detected.

## Communities (21 total, 0 thin omitted)

### Community 0 - "AdminDashboard.tsx"
Cohesion: 0.18
Nodes (33): AdminDashboard(), ClientFormDialog(), ClientVendorsDialog(), apiFetch(), deleteClient(), deleteClients(), deleteProduct(), deleteProducts() (+25 more)

### Community 1 - "sidebar.tsx"
Cohesion: 0.15
Nodes (22): ClientFormDialogProps, empty, Props, Vendor, Client, Button, ButtonProps, buttonVariants (+14 more)

### Community 2 - "cn"
Cohesion: 0.13
Nodes (27): ProductSortControl(), Props, CartItem, clampPercent(), DARK, GOLD, loadImageAsDataUrl(), loadPersistedCart() (+19 more)

### Community 3 - "ClientControls.tsx"
Cohesion: 0.18
Nodes (20): ClientFilterControl(), ClientSortControl(), FilterProps, SortProps, TRI_OPTIONS, TRI_ROWS, Vendor, activeFilterCount() (+12 more)

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
Nodes (31): class-variance-authority, clsx, jspdf, jspdf-autotable, lucide-react, dependencies, class-variance-authority, clsx (+23 more)

### Community 18 - "pdfImport.ts"
Cohesion: 0.26
Nodes (11): canvasToBlob(), columnOf(), cropImageCell(), ExtractedImage, Frag, hashImageData(), ParsedRow, parsePrice() (+3 more)

### Community 23 - "compilerOptions"
Cohesion: 0.22
Nodes (8): vite.config.ts, compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 24 - "ErrorBoundary"
Cohesion: 0.09
Nodes (23): AppContent(), AuthContext, AuthContextType, AuthProvider(), ManagedUser, useAuth(), User, ErrorBoundary (+15 more)

### Community 29 - "vite-env.d.ts"
Cohesion: 0.40
Nodes (4): *.jpeg, *.jpg, *.png, *.svg

### Community 94 - "CLAUDE.md"
Cohesion: 0.50
Nodes (3): Behavioral guidelines, graphify, Orchestrated implementation workflow (token-efficient)

## Knowledge Gaps
- **110 isolated node(s):** `name`, `private`, `version`, `type`, `build` (+105 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AdminDashboard()` connect `AdminDashboard.tsx` to `cn`, `ClientControls.tsx`, `xlsxImages.ts`, `kv_store.tsx`, `dependencies`, `pdfImport.ts`, `ErrorBoundary`?**
  _High betweenness centrality (0.248) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.227) - this node is a cross-community bridge._
- **Why does `xlsx` connect `dependencies` to `AdminDashboard.tsx`, `xlsxImages.ts`, `cn`?**
  _High betweenness centrality (0.168) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _110 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.12701612903225806 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._