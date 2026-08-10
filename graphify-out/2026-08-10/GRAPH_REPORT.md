# Graph Report - ferrealianza  (2026-08-09)

## Corpus Check
- 98 files · ~44,517 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 766 nodes · 1431 edges · 95 communities (42 shown, 53 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.55)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `eac14281`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AdminDashboard.tsx
- sidebar.tsx
- cn
- ClientControls.tsx
- utils.ts
- package.json
- alert-dialog.tsx
- compilerOptions
- xlsxImages.ts
- command.tsx
- Sistema de Gestión de Inventario - FerreAlianza
- menubar.tsx
- context-menu.tsx
- dropdown-menu.tsx
- kv_store.tsx
- dependencies
- carousel.tsx
- form.tsx
- pdfImport.ts
- chart.tsx
- drawer.tsx
- select.tsx
- navigation-menu.tsx
- compilerOptions
- ErrorBoundary
- select.tsx
- image.ts
- alert.tsx
- input-otp.tsx
- vite-env.d.ts
- class-variance-authority
- clsx
- cmdk
- embla-carousel-react
- @emotion/react
- @emotion/styled
- input-otp
- jspdf
- lucide-react
- @mui/icons-material
- @mui/material
- next-themes
- pdfjs-dist
- @popperjs/core
- @radix-ui/react-accordion
- @radix-ui/react-alert-dialog
- @radix-ui/react-aspect-ratio
- @radix-ui/react-checkbox
- @radix-ui/react-collapsible
- @radix-ui/react-context-menu
- @radix-ui/react-dialog
- @radix-ui/react-dropdown-menu
- @radix-ui/react-hover-card
- @radix-ui/react-label
- @radix-ui/react-menubar
- @radix-ui/react-navigation-menu
- @radix-ui/react-popover
- @radix-ui/react-progress
- @radix-ui/react-radio-group
- @radix-ui/react-scroll-area
- @radix-ui/react-select
- @radix-ui/react-separator
- @radix-ui/react-slider
- @radix-ui/react-slot
- @radix-ui/react-switch
- @radix-ui/react-tabs
- @radix-ui/react-toggle
- @radix-ui/react-toggle-group
- @radix-ui/react-tooltip
- react-day-picker
- react-dnd
- react-dnd-html5-backend
- react-hook-form
- react-popper
- react-resizable-panels
- react-responsive-masonry
- react-router
- react-slick
- recharts
- sonner
- @supabase/ssr
- @supabase/supabase-js
- vaul
- accordion.tsx
- share.ts
- CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `cn()` - 223 edges
2. `AdminDashboard()` - 27 edges
3. `SalesPanel()` - 19 edges
4. `apiFetch()` - 18 edges
5. `compilerOptions` - 18 edges
6. `useAuth()` - 17 edges
7. `idbSet()` - 15 edges
8. `isOnline()` - 14 edges
9. `Button` - 11 edges
10. `getProducts()` - 10 edges

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

## Communities (95 total, 53 thin omitted)

### Community 0 - "AdminDashboard.tsx"
Cohesion: 0.06
Nodes (87): AppContent(), AdminDashboard(), Product, AuthContext, AuthContextType, AuthProvider(), ManagedUser, useAuth() (+79 more)

### Community 1 - "sidebar.tsx"
Cohesion: 0.05
Nodes (42): Input(), Separator(), Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay() (+34 more)

### Community 2 - "cn"
Cohesion: 0.08
Nodes (36): Avatar(), AvatarFallback(), AvatarImage(), BreadcrumbEllipsis(), BreadcrumbItem(), BreadcrumbLink(), BreadcrumbList(), BreadcrumbPage() (+28 more)

### Community 3 - "ClientControls.tsx"
Cohesion: 0.10
Nodes (34): ClientFilterControl(), ClientSortControl(), FilterProps, SortProps, TRI_OPTIONS, TRI_ROWS, Vendor, ProductSortControl() (+26 more)

### Community 4 - "utils.ts"
Cohesion: 0.09
Nodes (11): Badge(), badgeVariants, Checkbox(), HoverCardContent(), Label(), Progress(), ResizableHandle(), ResizablePanelGroup() (+3 more)

### Community 5 - "package.json"
Cohesion: 0.07
Nodes (29): devDependencies, tailwindcss, @tailwindcss/vite, vite, @vitejs/plugin-react, name, vite, peerDependencies (+21 more)

### Community 6 - "alert-dialog.tsx"
Cohesion: 0.10
Nodes (18): AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay(), AlertDialogTitle() (+10 more)

### Community 7 - "compilerOptions"
Cohesion: 0.08
Nodes (24): DOM, DOM.Iterable, ES2020, src, compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules (+16 more)

### Community 8 - "xlsxImages.ts"
Cohesion: 0.19
Nodes (20): xlsx, ColumnMap, detectHeader(), ExcelProduct, HEADER_ALIASES, isEmptyCell(), normalize(), parseProductsFromExcel() (+12 more)

### Community 9 - "command.tsx"
Cohesion: 0.12
Nodes (14): Command(), CommandGroup(), CommandInput(), CommandItem(), CommandList(), CommandSeparator(), CommandShortcut(), Dialog() (+6 more)

### Community 10 - "Sistema de Gestión de Inventario - FerreAlianza"
Cohesion: 0.10
Nodes (19): 1. Desplegar el Servidor Supabase, 2. Crear el Primer Usuario Administrador, Atributos de Productos, Añadir Productos Manualmente:, Como Administrador:, Como Usuario:, Configuración Inicial, Crear un Pedido: (+11 more)

### Community 11 - "menubar.tsx"
Cohesion: 0.12
Nodes (11): Menubar(), MenubarCheckboxItem(), MenubarContent(), MenubarItem(), MenubarLabel(), MenubarRadioItem(), MenubarSeparator(), MenubarShortcut() (+3 more)

### Community 12 - "context-menu.tsx"
Cohesion: 0.12
Nodes (9): ContextMenuCheckboxItem(), ContextMenuContent(), ContextMenuItem(), ContextMenuLabel(), ContextMenuRadioItem(), ContextMenuSeparator(), ContextMenuShortcut(), ContextMenuSubContent() (+1 more)

### Community 13 - "dropdown-menu.tsx"
Cohesion: 0.12
Nodes (9): DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem(), DropdownMenuSeparator(), DropdownMenuShortcut(), DropdownMenuSubContent() (+1 more)

### Community 14 - "kv_store.tsx"
Cohesion: 0.19
Nodes (11): app, authMiddleware(), getServiceClient(), client(), del(), get(), getByPrefix(), mdel() (+3 more)

### Community 15 - "dependencies"
Cohesion: 0.13
Nodes (15): canvas-confetti, date-fns, jspdf-autotable, motion, dependencies, canvas-confetti, date-fns, jspdf-autotable (+7 more)

### Community 16 - "carousel.tsx"
Cohesion: 0.20
Nodes (13): Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext(), CarouselOptions (+5 more)

### Community 17 - "form.tsx"
Cohesion: 0.23
Nodes (10): FormControl(), FormDescription(), FormFieldContext, FormFieldContextValue, FormItem(), FormItemContext, FormItemContextValue, FormLabel() (+2 more)

### Community 18 - "pdfImport.ts"
Cohesion: 0.26
Nodes (11): canvasToBlob(), columnOf(), cropImageCell(), ExtractedImage, Frag, hashImageData(), ParsedRow, parsePrice() (+3 more)

### Community 19 - "chart.tsx"
Cohesion: 0.25
Nodes (9): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent(), getPayloadConfigFromPayload(), THEMES (+1 more)

### Community 20 - "drawer.tsx"
Cohesion: 0.18
Nodes (6): DrawerContent(), DrawerDescription(), DrawerFooter(), DrawerHeader(), DrawerOverlay(), DrawerTitle()

### Community 21 - "select.tsx"
Cohesion: 0.18
Nodes (7): SelectContent(), SelectItem(), SelectLabel(), SelectScrollDownButton(), SelectScrollUpButton(), SelectSeparator(), SelectTrigger()

### Community 22 - "navigation-menu.tsx"
Cohesion: 0.22
Nodes (9): NavigationMenu(), NavigationMenuContent(), NavigationMenuIndicator(), NavigationMenuItem(), NavigationMenuLink(), NavigationMenuList(), NavigationMenuTrigger(), navigationMenuTriggerStyle (+1 more)

### Community 23 - "compilerOptions"
Cohesion: 0.22
Nodes (8): vite.config.ts, compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 24 - "ErrorBoundary"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 25 - "select.tsx"
Cohesion: 0.25
Nodes (7): SelectContent, SelectItem, SelectLabel, SelectScrollDownButton, SelectScrollUpButton, SelectSeparator, SelectTrigger

### Community 26 - "image.ts"
Cohesion: 0.53
Nodes (5): compressImage(), DecodedSource, loadImage(), loadSource(), readAsDataUrl()

### Community 27 - "alert.tsx"
Cohesion: 0.50
Nodes (4): Alert(), AlertDescription(), AlertTitle(), alertVariants

### Community 28 - "input-otp.tsx"
Cohesion: 0.43
Nodes (5): ToggleGroup(), ToggleGroupContext, ToggleGroupItem(), Toggle(), toggleVariants

### Community 29 - "vite-env.d.ts"
Cohesion: 0.40
Nodes (4): *.jpeg, *.jpg, *.png, *.svg

### Community 92 - "accordion.tsx"
Cohesion: 0.40
Nodes (3): AccordionContent(), AccordionItem(), AccordionTrigger()

### Community 93 - "share.ts"
Cohesion: 0.50
Nodes (4): buildProductText(), ShareableProduct, shareProduct(), ShareResult

### Community 94 - "CLAUDE.md"
Cohesion: 0.50
Nodes (3): Behavioral guidelines, graphify, Orchestrated implementation workflow (token-efficient)

## Knowledge Gaps
- **184 isolated node(s):** `name`, `private`, `version`, `type`, `build` (+179 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **53 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `sidebar.tsx`, `ClientControls.tsx`, `utils.ts`, `alert-dialog.tsx`, `command.tsx`, `menubar.tsx`, `context-menu.tsx`, `dropdown-menu.tsx`, `input-otp.tsx`, `carousel.tsx`, `form.tsx`, `chart.tsx`, `drawer.tsx`, `select.tsx`, `navigation-menu.tsx`, `alert.tsx`, `accordion.tsx`?**
  _High betweenness centrality (0.475) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`, `xlsxImages.ts`, `class-variance-authority`, `clsx`, `cmdk`, `embla-carousel-react`, `@emotion/react`, `@emotion/styled`, `input-otp`, `jspdf`, `lucide-react`, `@mui/icons-material`, `@mui/material`, `next-themes`, `pdfjs-dist`, `@popperjs/core`, `@radix-ui/react-accordion`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-checkbox`, `@radix-ui/react-collapsible`, `@radix-ui/react-context-menu`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-hover-card`, `@radix-ui/react-label`, `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-popover`, `@radix-ui/react-progress`, `@radix-ui/react-radio-group`, `@radix-ui/react-scroll-area`, `@radix-ui/react-select`, `@radix-ui/react-separator`, `@radix-ui/react-slider`, `@radix-ui/react-slot`, `@radix-ui/react-switch`, `@radix-ui/react-tabs`, `@radix-ui/react-toggle`, `@radix-ui/react-toggle-group`, `@radix-ui/react-tooltip`, `react-day-picker`, `react-dnd`, `react-dnd-html5-backend`, `react-hook-form`, `react-popper`, `react-resizable-panels`, `react-responsive-masonry`, `react-router`, `react-slick`, `recharts`, `sonner`, `@supabase/ssr`, `@supabase/supabase-js`, `vaul`?**
  _High betweenness centrality (0.305) - this node is a cross-community bridge._
- **Why does `SalesPanel()` connect `AdminDashboard.tsx` to `xlsxImages.ts`, `ClientControls.tsx`, `share.ts`, `jspdf`?**
  _High betweenness centrality (0.185) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _184 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AdminDashboard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05868653935724266 - nodes in this community are weakly interconnected._
- **Should `sidebar.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05279034690799397 - nodes in this community are weakly interconnected._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.07729468599033816 - nodes in this community are weakly interconnected._