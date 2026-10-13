# Graph Report - sepsis-ai-guard  (2026-10-14)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 989 nodes · 2212 edges · 55 communities (39 shown, 16 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d888952d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.tsx
- agent_orchestrator.py
- get_settings
- cn
- sidebar.tsx
- react
- supabase_service.py
- patients.py
- alert-dialog.tsx
- train_and_select_best
- dependencies
- feedback.py
- agent_routes.py
- command.tsx
- preprocess_data.py
- evaluate_model.py
- train_model.py
- compilerOptions
- agent_prompt_service.py
- toggle-group.tsx
- menubar.tsx
- predict_test.py
- context-menu.tsx
- dropdown-menu.tsx
- package.json
- carousel.tsx
- form.tsx
- compilerOptions
- PredictionService
- GeminiService
- drawer.tsx
- select.tsx
- sheet.tsx
- chart.tsx
- navigation-menu.tsx
- alerts.py
- AuthContext.tsx
- devDependencies
- vite-env.d.ts
- input-otp.tsx
- popover.tsx
- vite.config.ts
- logging
- scripts

## God Nodes (most connected - your core abstractions)
1. `cn()` - 223 edges
2. `react` - 63 edges
3. `lucide-react` - 34 edges
4. `getApiErrorMessage()` - 25 edges
5. `get_settings()` - 22 edges
6. `Card()` - 21 edges
7. `PageHeader()` - 21 edges
8. `LoadingState()` - 19 edges
9. `App()` - 18 edges
10. `AlertsPage()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `PredictionAgent` --uses--> `PredictionService`  [INFERRED]
  backend/app/agents/prediction_agent.py → backend/app/services/prediction_service.py
- `predict_sepsis()` --uses--> `PredictionResponse`  [INFERRED]
  backend/app/api/predict.py → backend/app/schemas/prediction_schema.py
- `PredictionService` --uses--> `Settings`  [INFERRED]
  backend/app/services/prediction_service.py → backend/app/core/config.py
- `CommandGroup()` --calls--> `cn()`  [EXTRACTED]
  frontend/src/app/components/ui/command.tsx → frontend/src/app/components/ui/utils.ts
- `CommandInput()` --calls--> `cn()`  [EXTRACTED]
  frontend/src/app/components/ui/command.tsx → frontend/src/app/components/ui/utils.ts

## Import Cycles
- None detected.

## Communities (55 total, 16 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.06
Nodes (99): App(), ProtectedRoute(), UserMenu(), Card(), DemoNotice(), ErrorBanner(), LoadingState(), RiskBadge() (+91 more)

### Community 1 - "agent_orchestrator.py"
Cohesion: 0.07
Nodes (13): AgentOrchestrator, AlertAgent, MonitoringAgent, PredictionAgent, ReasoningAgent, PredictionResponse, _fmt(), generate_explanations() (+5 more)

### Community 2 - "get_settings"
Cohesion: 0.07
Nodes (7): dashboard_summary(), health_check(), get_settings(), Settings, create_app(), lifespan(), is_configured()

### Community 3 - "cn"
Cohesion: 0.08
Nodes (35): AccordionContent(), AccordionItem(), AccordionTrigger(), Avatar(), AvatarFallback(), AvatarImage(), BreadcrumbEllipsis(), BreadcrumbItem() (+27 more)

### Community 4 - "sidebar.tsx"
Cohesion: 0.08
Nodes (34): Input(), Separator(), SidebarContent(), SidebarContext, SidebarContextProps, SidebarFooter(), SidebarGroup(), SidebarGroupAction() (+26 more)

### Community 5 - "react"
Cohesion: 0.07
Nodes (16): Checkbox(), HoverCardContent(), Progress(), RadioGroup(), RadioGroupItem(), ResizableHandle(), ResizablePanelGroup(), ScrollArea() (+8 more)

### Community 6 - "supabase_service.py"
Cohesion: 0.15
Nodes (16): create_or_get_patient(), _failure(), get_alerts(), _get_client(), get_dashboard_stats(), get_feedback(), get_recent_alerts(), _memory_success() (+8 more)

### Community 7 - "patients.py"
Cohesion: 0.09
Nodes (8): get_patient(), list_patients(), register_patient(), predict_sepsis(), PatientInput, PatientRecord, AlertResponse, PredictionRequest

### Community 8 - "alert-dialog.tsx"
Cohesion: 0.11
Nodes (19): AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay(), AlertDialogPortal() (+11 more)

### Community 9 - "train_and_select_best"
Cohesion: 0.11
Nodes (10): build_model_candidates(), build_preprocessor(), compute_scale_pos_weight(), evaluate_predictions(), load_processed_data(), main(), run_training(), save_artifacts() (+2 more)

### Community 10 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, axios, class-variance-authority, clsx, firebase, lucide-react, @radix-ui/react-accordion, @radix-ui/react-alert-dialog (+17 more)

### Community 11 - "feedback.py"
Cohesion: 0.13
Nodes (7): FeedbackAgent, list_feedback(), submit_feedback(), FeedbackListResponse, FeedbackRecord, FeedbackRequest, FeedbackResponse

### Community 12 - "agent_routes.py"
Cohesion: 0.17
Nodes (10): agent_chat(), explain_prediction(), summarize_prediction(), voice_query(), AgentChatRequest, AgentChatResponse, AgentContextRequest, AgentExplainResponse (+2 more)

### Community 13 - "command.tsx"
Cohesion: 0.14
Nodes (17): Command(), CommandDialog(), CommandGroup(), CommandInput(), CommandItem(), CommandList(), CommandSeparator(), CommandShortcut() (+9 more)

### Community 14 - "preprocess_data.py"
Cohesion: 0.19
Nodes (9): _align_to_common_schema(), combine_datasets(), find_xlsx_dataset(), load_dataset_csv(), load_sepsis_prediction_csv(), load_xlsx_dataset(), main(), run_preprocessing() (+1 more)

### Community 15 - "evaluate_model.py"
Cohesion: 0.13
Nodes (7): get_model_metrics(), get_test_split(), load_metadata(), load_model(), main(), print_metrics(), run_evaluation()

### Community 17 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, baseUrl, isolatedModules, jsx, lib, module, moduleResolution (+12 more)

### Community 18 - "agent_prompt_service.py"
Cohesion: 0.26
Nodes (14): build_chat_prompt(), build_explain_prompt(), build_summary_prompt(), build_voice_prompt(), _clinical_review_note(), fallback_chat_reply(), fallback_explanation(), fallback_summary() (+6 more)

### Community 19 - "toggle-group.tsx"
Cohesion: 0.15
Nodes (12): Alert(), AlertDescription(), AlertTitle(), alertVariants, Badge(), badgeVariants, ToggleGroup(), ToggleGroupContext (+4 more)

### Community 20 - "menubar.tsx"
Cohesion: 0.12
Nodes (12): Menubar(), MenubarCheckboxItem(), MenubarContent(), MenubarItem(), MenubarLabel(), MenubarPortal(), MenubarRadioItem(), MenubarSeparator() (+4 more)

### Community 21 - "predict_test.py"
Cohesion: 0.19
Nodes (7): build_sample_patient(), get_risk_level(), get_top_input_factors(), load_model_and_metadata(), main(), predict_patient(), run_prediction_demo()

### Community 22 - "context-menu.tsx"
Cohesion: 0.12
Nodes (9): ContextMenuCheckboxItem(), ContextMenuContent(), ContextMenuItem(), ContextMenuLabel(), ContextMenuRadioItem(), ContextMenuSeparator(), ContextMenuShortcut(), ContextMenuSubContent() (+1 more)

### Community 23 - "dropdown-menu.tsx"
Cohesion: 0.12
Nodes (10): DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem(), DropdownMenuSeparator(), DropdownMenuShortcut(), DropdownMenuSubContent() (+2 more)

### Community 24 - "package.json"
Cohesion: 0.12
Nodes (15): name, private, type, version, axios, clsx, @radix-ui/react-alert-dialog, @radix-ui/react-separator (+7 more)

### Community 25 - "carousel.tsx"
Cohesion: 0.17
Nodes (14): Button(), Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext() (+6 more)

### Community 26 - "form.tsx"
Cohesion: 0.18
Nodes (12): FormControl(), FormDescription(), FormFieldContext, FormFieldContextValue, FormItem(), FormItemContext, FormItemContextValue, FormLabel() (+4 more)

### Community 27 - "compilerOptions"
Cohesion: 0.13
Nodes (14): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+6 more)

### Community 30 - "drawer.tsx"
Cohesion: 0.20
Nodes (7): DrawerContent(), DrawerDescription(), DrawerFooter(), DrawerHeader(), DrawerOverlay(), DrawerPortal(), DrawerTitle()

### Community 31 - "select.tsx"
Cohesion: 0.20
Nodes (8): SelectContent(), SelectItem(), SelectLabel(), SelectScrollDownButton(), SelectScrollUpButton(), SelectSeparator(), SelectTrigger(), @radix-ui/react-select

### Community 32 - "sheet.tsx"
Cohesion: 0.26
Nodes (9): Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetPortal(), SheetTitle() (+1 more)

### Community 33 - "chart.tsx"
Cohesion: 0.27
Nodes (10): ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartStyle(), ChartTooltipContent(), getPayloadConfigFromPayload() (+2 more)

### Community 34 - "navigation-menu.tsx"
Cohesion: 0.22
Nodes (9): NavigationMenu(), NavigationMenuContent(), NavigationMenuIndicator(), NavigationMenuItem(), NavigationMenuLink(), NavigationMenuList(), NavigationMenuTrigger(), navigationMenuTriggerStyle (+1 more)

### Community 35 - "alerts.py"
Cohesion: 0.25
Nodes (3): AlertUpdate, list_alerts(), update_alert()

### Community 36 - "AuthContext.tsx"
Cohesion: 0.33
Nodes (7): auth, firebaseConfig, googleProvider, isFirebaseConfigured, AuthContext, AuthContextValue, firebase

### Community 37 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, tailwindcss, @tailwindcss/vite, @types/react, @types/react-dom, typescript, vite, @vitejs/plugin-react

### Community 38 - "vite-env.d.ts"
Cohesion: 0.29
Nodes (5): ImportMeta, ImportMetaEnv, SpeechRecognition, SpeechRecognitionEvent, Window

### Community 39 - "input-otp.tsx"
Cohesion: 0.33
Nodes (3): InputOTP(), InputOTPGroup(), InputOTPSlot()

### Community 41 - "vite.config.ts"
Cohesion: 0.33
Nodes (3): @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 44 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, preview

## Knowledge Gaps
- **4 isolated node(s):** `tailwindcss`, `@types/react`, `@types/react-dom`, `typescript`
  These have ≤1 connection - possible missing edges. (Counts symbols only; 368 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **16 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `App.tsx`, `cn`, `sidebar.tsx`, `alert-dialog.tsx`, `command.tsx`, `toggle-group.tsx`, `menubar.tsx`, `context-menu.tsx`, `dropdown-menu.tsx`, `package.json`, `carousel.tsx`, `form.tsx`, `drawer.tsx`, `select.tsx`, `sheet.tsx`, `chart.tsx`, `navigation-menu.tsx`, `AuthContext.tsx`, `input-otp.tsx`, `popover.tsx`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **What connects `tailwindcss`, `@types/react`, `@types/react-dom` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05721339630742808 - nodes in this community are weakly interconnected._
- **Why does `cn()` connect `cn` to `sheet.tsx`, `chart.tsx`, `navigation-menu.tsx`, `sidebar.tsx`, `react`, `input-otp.tsx`, `alert-dialog.tsx`, `popover.tsx`, `command.tsx`, `toggle-group.tsx`, `menubar.tsx`, `context-menu.tsx`, `dropdown-menu.tsx`, `carousel.tsx`, `form.tsx`, `drawer.tsx`, `select.tsx`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Should `agent_orchestrator.py` be split into smaller, more focused modules?**
  _Cohesion score 0.06778476589797344 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `App.tsx` to `sheet.tsx`, `navigation-menu.tsx`, `cn`, `sidebar.tsx`, `react`, `input-otp.tsx`, `alert-dialog.tsx`, `command.tsx`, `menubar.tsx`, `context-menu.tsx`, `dropdown-menu.tsx`, `package.json`, `carousel.tsx`, `select.tsx`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `get_settings` be split into smaller, more focused modules?**
  _Cohesion score 0.07149758454106281 - nodes in this community are weakly interconnected._