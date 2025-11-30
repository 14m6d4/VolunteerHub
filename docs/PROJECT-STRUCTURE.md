```
VolunteerHub                          // Monorepo root for the whole project (backend, frontend, docs)
├─ backend                            // Node/Express/MongoDB (API + business logic)
│  ├─ app.ts                          // Express app setup: apply middlewares, register routes, no server.listen here
│  ├─ config                          // Backend configuration modules (database, web push, env helpers)
│  │  ├─ db.ts                        // Mongo/Mongoose connection setup and configuration
│  │  └─ webpush.ts                   // Web Push API configuration (VAPID keys, push options)
│  ├─ controllers                     // Route handlers: translate HTTP to service calls, no heavy logic
│  │  ├─ admin.controller.ts          // Admin-only actions: event approval/rejection, user ban/unban, exports, view reports
│  │  ├─ auth.controller.ts           // Auth endpoints: login, register, OAuth callbacks, refresh, logout
│  │  ├─ discussion.controller.ts     // Discussion endpoints: create channels, posts, comments, likes
│  │  ├─ event.controller.ts          // Event CRUD endpoints used by managers/admins
│  │  ├─ feed.controller.ts           // Global feeds: trending events, personalized dashboards
│  │  ├─ notification.controller.ts   // Web push + in-app notification endpoints (register subscriptions, fetch list)
│  │  ├─ registration.controller.ts   // Event registration endpoints: register/unregister/mark completed
│  │  └─ user.controller.ts           // User-profile endpoints: get/update profile, change password, participation history etc.
│  ├─ middlewares                     // Cross-cutting HTTP middleware (auth, validation, error handling)
│  │  ├─ auth.middleware.ts           // JWT verification: attach user to req or reject as 401, protect routes
│  │  ├─ error.middleware.ts          // Central error handler: converts thrown errors to HTTP responses
│  │  ├─ role.middleware.ts           // Role-based guard (Volunteer/Manager/Admin) on protected routes
│  │  └─ validation.middleware.ts     // Wraps validation logic (e.g., Joi/Zod schemas) for incoming requests
│  ├─ models                          // Mongoose schemas (database structure + business rules via hooks)
│  │  ├─ Discussion.model.ts          // Schema for per-event channels and possibly channel metadata e.g. eventId, posts array
│  │  ├─ Event.model.ts               // Schema for events: title, date, location, status, managerId, CRITICAL: auto-create discussion on approval
│  │  ├─ Notification.model.ts        // Schema for stored notifications (push + in-app)
│  │  ├─ Post.model.ts                // Schema for posts in a discussion feed (content, author, likes, comments)
│  │  ├─ Registration.model.ts        // Schema for event registrations (volunteer, event, status) e.g. eventId, volunteerId, status, completionStatus
│  │  └─ User.model.ts                // Schema for users (roles, authProvider, status, profile info) e.g. email, password (hashed), role, isActive, methods for password comparison
│  ├─ package-lock.json               // Backend dependency lock file (npm)
│  ├─ package.json                    // Backend scripts and dependencies definition
│  ├─ routes                          // Route definitions: map URLs + HTTP verbs to controllers and middleware
│  │  ├─ admin.routes.ts              // `/api/admin/*` endpoints wiring -> admin.controller + guards
│  │  ├─ auth.routes.ts               // `/api/auth/*` endpoints -> auth.controller
│  │  ├─ discussion.routes.ts         // `/api/discussion/*` endpoints -> discussion.controller
│  │  ├─ event.routes.ts              // `/api/events/*` endpoints -> event.controller
│  │  ├─ feed.routes.ts               // `/api/feed/*` endpoints -> feed.controller
│  │  ├─ registration.routes.ts       // `/api/registrations/*` endpoints -> registration.controller
│  │  └─ user.routes.ts               // `/api/users/*` endpoints -> user.controller
│  ├─ server.ts                       // Entry point: import app, connect DB, start HTTP server on PORT
│  ├─ services                        // Business logic layer; orchestrates models, utils, and external services (CORE OF APPLICATION - reusable, testable)
│  │  ├─ auth.service.ts              // Auth logic: password hashing, JWT issuance, OAuth, OTP flows
│  │  ├─ discussion.service.ts        // Discussion logic: channel auto-creation, posts, comments, likes
│  │  ├─ event.service.ts             // Event lifecycle: create/update, status transitions, filtering, validation, approval side-effects
│  │  ├─ export.service.ts            // Data export logic: build CSV/JSON format
│  │  ├─ feed.service.ts              // Feed algorithm: calculate trending events, personalized recommendations
│  │  ├─ notification.service.ts      // Notification scheduling & sending (web push, in-app flags)
│  │  └─ registration.service.ts      // Registration lifecycle: register/unregister, capacity checks, completion
│  ├─ tsconfig.json                   // TypeScript compiler config for backend
│  ├─ types                           // Shared backend-only TypeScript types & interfaces
│  │  ├─ discussion.ts                // Types for discussions, posts, comments, like structures. Interfaces: IPost, IComment, ILike, IDiscussion
│  │  ├─ event.ts                     // Types for event entities, DTOs, filters, enums. Interfaces: IEvent, EventStatus, EventFilters
│  │  ├─ index.ts                     // Barrel file re-exporting the other type modules
│  │  └─ user.ts                      // Types for user entities, roles, auth-related DTOs. Interfaces: IUser, UserRole enum, JWT payload types
│  └─ utils                           // Utility functions (pure functions, helpers, no business logic)
│     ├─ appError.ts                  // Custom error class for consistent error handling
│     ├─ export.util.ts               // Helpers for generating CSV/JSON from data arrays. Helper functions: convertToCSV, convertToJSON
│     ├─ jwt.util.ts                  // JWT sign/verify helpers, token parsing
│     ├─ validators.ts                // Validation schemas using express-validator (email format, password strength, etc.)
│     └─ webpush.ts                   // Helpers wrapping web-push library (sendNotification, build payload)
├─ docs                               // Project documentation for devs
│  ├─ API.MD                          // Human-readable API documentation (endpoints, payloads)
│  ├─ DATABASE-SCHEMA.MD              // Database design: collections, relations, indexes
│  ├─ DEPLOYMENT.MD                   // How to deploy: env vars, build commands, hosting notes
│  ├─ FAQ.md                          // Frequently asked questions (for contributors/users)
│  ├─ FEATURES.MD                     // High-level feature list & roadmap
│  ├─ PROJECT-STRUCTURE.MD            // Explanation of this directory layout and conventions
│  └─ TODO.md                         // Task list/backlog for future work
├─ frontend                           // React/Vite/TS client app (UI + client-side logic)
│  ├─ components.json                 // shadcn-ui components registry/config
│  ├─ eslint.config.js                // ESLint rules for frontend code quality
│  ├─ index.html                      // Vite HTML entry, root `<div>` for React
│  ├─ package-lock.json               // Frontend dependency lock file (npm)
│  ├─ package.json                    // Frontend scripts and dependencies definition
│  ├─ pnpm-lock.yaml                  // Alternative lockfile (if pnpm is used)
│  ├─ public                          // Static assets served as-is
│  │  └─ vite.svg                     // Default Vite logo asset
│  ├─ README.md                       // Frontend-specific readme / setup notes
│  ├─ src                             // All frontend source code
│  │  ├─ App.css                      // Global styles for the App component (consider moving to styles/)
│  │  ├─ App.tsx                      // Root React component: layout + route container
│  │  ├─ assets                       // Frontend tatic assets imported in code (images, icons)
│  │  │  └─ react.svg                 // React logo asset (replace with app assets)
│  │  ├─ components                   // Reusable, presentational and layout components
│  │  │  ├─ common                    // Shared shell components used across pages
│  │  │  │  ├─ Footer.tsx             // Global footer component
│  │  │  │  ├─ Header.tsx             // Top header (branding, quick actions)
│  │  │  │  ├─ Navbar.tsx             // Navigation bar with main links
│  │  │  │  └─ Sidebar.tsx            // Side navigation for dashboards/admin panels
│  │  │  ├─ mode-toggle.tsx           // Light/dark mode toggle UI wired to theme-provider
│  │  │  ├─ theme-provider.tsx        // Context provider for theme (shadcn + Tailwind)
│  │  │  └─ ui                        // Shadcn-ui components (button, card, dialog, etc.) - generated by CLI
│  │  ├─ features                     // Feature-based UI modules (containers + local components)
│  │  │  ├─ auth                      // Auth-specific components (forms, guards) for login/register/etc. e.g. LoginForm, RegisterForm, AuthGuard
│  │  │  ├─ discussion                // Components for event wall, posts, comments, likes e.g. PostCard, CommentList, CreatePostForm
│  │  │  ├─ event                     // Components for event cards, filters, creation/edit forms. e.g. EventCard, EventForm, EventFilters, RegisterButton
│  │  │  ├─ feed                      // Components for dashboards and event feeds. e.g. TrendingEventsList, PersonalizedFeed
│  │  │  └─ notifications             // Components for notification list, toast center, indicators
│  │  ├─ hooks                        // Reusable React hooks encapsulating logic/state
│  │  │  ├─ use-mobile.ts             // Hook to detect mobile viewport / responsive behavior
│  │  │  ├─ useAuth.ts                // Hook wrapping auth.store + auth.service for login/logout
│  │  │  ├─ useDiscussion.ts          // Hook for discussion operations (fetch posts, create post, like/comment)
│  │  │  ├─ useEvents.ts              // Hook for event operations (fetch events, filters, pagination)
│  │  │  ├─ useFetch.ts               // Generic data fetching hook (loading/error abstraction)
│  │  │  └─ useNotifications.ts       // Hook for notification fetching, read/unread logic
│  │  ├─ index.css                    // Global Tailwind entry + base styles
│  │  ├─ lib                          // Small library-style helpers not specific to a feature
│  │  │  └─ utils.ts                  // Generic utilities (cn, className merge, etc.)
│  │  ├─ main.tsx                     // Frontend entry: createRoot, wrap App with providers, router
│  │  ├─ pages                        // Route-level screens wired to the router
│  │  │  ├─ admin                     // Pages specific to Admin role
│  │  │  │  └─ AdminPanel.tsx         // Admin dashboard: user management, event approvals, reports
│  │  │  ├─ auth                      // Auth-related pages
│  │  │  │  ├─ Login.tsx              // Login page UI + interaction
│  │  │  │  └─ Register.tsx           // Registration page UI + interaction
│  │  │  ├─ EventDetails.tsx          // Event detail page: view event info, register, access discussion (if approved)
│  │  │  ├─ EventsList.tsx            // Events listing page with filters/search
│  │  │  ├─ Feed.tsx                  // Feed page: trending events, recommendations
│  │  │  ├─ manager                   // Manager-specific pages
│  │  │  │  ├─ CreateEvent.tsx        // Create/edit event page: uses event/EventForm component
│  │  │  │  └─ ManageRegistrations.tsx// Page to review/approve/complete registrations
│  │  │  ├─ NotFound.tsx              // 404 fallback page
│  │  │  └─ volunteer                 // Placeholder for volunteer-specific pages (e.g., history, dashboard)
│  │  ├─ routes                       // Client-side route configuration and guards
│  │  ├─ services                     // API clients and front-end data access layer
│  │  │  ├─ admin.service.ts          // Admin API calls: approveEvent, banUser, exportData, viewReport
│  │  │  ├─ api.ts                    // Axios instance configuration: base URL, interceptors (auth token, error handling)
│  │  │  ├─ auth.service.ts           // Frontend calls for login/register/logout/refresh
│  │  │  ├─ discussion.service.ts     // Discussion API calls: getPosts, createPost, addComment, likePost
│  │  │  ├─ event.service.ts          // Event API calls: getEvents, createEvent, updateEvent, deleteEvent
│  │  │  └─ user.service.ts           // User API calls: getProfile, updateProfile, getParticipationHistory, etc
│  │  ├─ store                        // Global state management (likely Zustand or similar)
│  │  │  ├─ auth.store.ts             // Auth state: current user, token, login/logout actions
│  │  │  ├─ event.store.ts            // Event-related global state (selected event, filters, caches)
│  │  │  ├─ notification.store.ts     // Notification state (unread count, list)
│  │  │  └─ ui.store.ts               // UI state (theme, sidebar open/closed, loading states, modals)
│  │  ├─ styles                       // Additional CSS modules or global styles
│  │  │  └─ globals.css               // Shared global styles beyond Tailwind (e.g., body, layout tweaks)
│  │  ├─ types                        // Frontend TypeScript types (mirroring backend DTOs/Models)
│  │  │  ├─ discussion.ts             // Types for discussion entities used in UI
│  │  │  ├─ event.ts                  // Types for events and event filters
│  │  │  ├─ index.ts                  // Barrel exports for type modules
│  │  │  └─ user.ts                   // Types for users and auth responses on frontend
│  │  └─ utils                        // Frontend-only helper utilities
│  │     ├─ formatDate.ts             // Date/time display helpers
│  │     └─ validators.ts             // Client-side form validation helpers
│  ├─ tsconfig.app.json               // TS config for app source (Vite/React)
│  ├─ tsconfig.json                   // Base TS config (references app/node configs)
│  ├─ tsconfig.node.json              // TS config for node-specific files (vite config, tooling)
│  └─ vite.config.ts                  // Vite bundler config (aliases, dev server proxy)
└─ README.md                          // Root-level overview, setup instructions, and entry points
```
## 1. Deep Dive for Key Components
----------------------------

-   **backend/config**: Exists to centralize setup for external dependencies, avoiding hardcoding in main code. This promotes configurability (e.g., via .env) and ease of switching environments (dev/prod). Place: Only init/setup files like DB connections or service configs (e.g., db.ts for Mongoose.connect(), webpush.ts for setting VAPID details). No business logic here---just pure configuration.
-   **backend/controllers**: Exists to act as the "glue" between routes and services, handling HTTP specifics (req/res) without core logic. This keeps them thin for testability and reusability. Place: Functions that extract data from requests, call services, and format responses (e.g., try-catch wrappers). One file per domain (e.g., event.controller.ts for createEvent(req, res)). Avoid DB calls or complex computations here---delegate to services.
-   **backend/middlewares**: Exists for modular request pipeline enhancements, enabling reuse across routes (e.g., auth on multiple endpoints). This follows Express's middleware pattern for clean, composable code. Place: Functions like (req, res, next) => {...} for auth, validation, errors. E.g., auth.middleware.ts verifies JWT; validation.middleware.ts uses schemas to check inputs before controllers.
-   **backend/services**: Exists to encapsulate business logic, making it independent of HTTP (reusable in CLI/scripts). This enforces separation of concerns, easier unit testing, and scalability (e.g., microservices). Place: Core operations like event validation, auto-channel init in discussion.service.ts, or push sending in notification.service.ts. Include error throwing, but no req/res handling.
-   **backend/utils**: Exists for low-level, reusable helpers not tied to business domains. This prevents code duplication and keeps other folders focused. Place: Generic tools like custom errors (appError.ts), JWT utils, or validators. Avoid domain-specific logic---e.g., no event-related code here.
-   **frontend/src/components**: Exists for building reusable UI blocks, following atomic design. This promotes DRY code and composability. Place: Presentational components; subfolders like common for shared (Navbar.tsx), ui for Shadcn.
-   **frontend/src/hooks**: Exists to extract reusable logic from components, adhering to React's hooks pattern for cleaner, testable code. Place: Custom hooks like useEvents.ts for data fetching with dependencies (e.g., useEffect for API calls).
-   **frontend/src/services**: Exists to abstract API interactions, centralizing HTTP logic (e.g., error handling, auth headers). This makes switching backends easy and keeps components clean. Place: Axios wrappers like event.service.ts with functions (getEvents()).
-   **frontend/src/store**: Exists for global state management (e.g., via Zustand), avoiding prop drilling. This ensures consistent state across app. Place: Stores like auth.store.ts for user data.
-   **Other Config Files (e.g., tsconfig.json, vite.config.ts)**: Exist for build/tooling setup. tsconfig.json defines TypeScript rules for type safety; vite.config.ts customizes Vite (plugins, proxies). Place: Compiler/build options only---no app logic.


## 2. Feature implementation guide (example: "User Registration")
-----------------------------------------------------------

When you add a new feature, always think back-to-front in vertical slices. Here's a concrete flow for "User Registration," but the same pattern works for any feature.

2.1 Backend steps
-----------------
1.  Define/extend types
    -   Add or refine DTOs in `backend/types/user.ts` (e.g., `RegisterRequest`, `UserResponse`).
    -   Re-export from `backend/types/index.ts` so other layers can import from one place.
2.  Model updates (only if needed)
    -   If registration needs new user fields (e.g., `emailVerified`, `authProvider`), add them to `User.model.ts` with appropriate defaults and indexes.
3.  Validation rules
    -   Add registration-specific rules to `utils/validators.ts` (e.g., `validatePassword`, `isValidEmail`).
    -   Optionally define a Joi/Zod schema for the request body and plug it through `validation.middleware.ts` in the `auth.routes.ts` file.
4.  Service logic (business rules)
    -   In `services/auth.service.ts`:
        -   Implement `registerUser(data: RegisterRequest)`.
        -   Responsibilities:
            -   Check if email already exists (via `User.model`).
            -   Validate password strength (using `validators.ts`).
            -   Hash password.
            -   Create user doc.
            -   Optionally trigger welcome email / verification token generation.
            -   Return a clean `UserResponse` object (no password, no sensitive info).
        -   Handle domain errors by throwing `AppError` from `utils/appError.ts`.
5.  Controller endpoint
    -   In `controllers/auth.controller.ts`:
        -   Add `register` handler that:
            -   Assumes request body is already validated by middleware.
            -   Calls `authService.registerUser(req.body)`.
            -   Returns `res.status(201).json({ ... })`.
            -   Forwards any error via `next(error)`.
6.  Route wiring
    -   In `routes/auth.routes.ts`:
        -   Add `router.post('/register', validationMiddleware(registerSchema), authController.register);`
        -   No business logic in routes---only composition of middlewares + controller.
7.  Error & edge-case handling
    -   If new error codes/messages are needed (e.g., EMAIL_ALREADY_USED), define them near `AppError` usage and make sure `error.middleware.ts` formats them consistently.
8.  Update API docs
    -   Document the new endpoint and payload in `docs/API.MD`.
    -   If you changed the DB structure, update `docs/DATABASE-SCHEMA.MD`.
2.2 Frontend steps
------------------
1.  Types
    -   Define `RegisterPayload`, `AuthResponse`, `User` in `frontend/src/types/user.ts`.
    -   Update `index.ts` barrel export.
2.  Service
    -   In `frontend/src/services/auth.service.ts`:
        -   Add `register(payload: RegisterPayload)` that calls `api.post('/auth/register', payload)` and returns typed data.
3.  Store
    -   In `frontend/src/store/auth.store.ts`:
        -   Add an action `register` that internally calls `authService.register`, updates `currentUser` and/or redirect behavior.
        -   Keep this as the single source of truth for auth state.
4.  Hook
    -   In `frontend/src/hooks/useAuth.ts`:
        -   Expose a `register` function that delegates to the store, plus loading/error state if you centralize them there.
5.  Page & components
    -   `frontend/src/pages/auth/Register.tsx`:
        -   Build the form using shadcn-ui components.
        -   Use `frontend/src/utils/validators.ts` for client-side validation (email/password).
        -   On submit:
            -   Call `useAuth().register(formData)`.
            -   Show success/failure states (toast, redirect to login/dashboard).
    -   Extract reusable input groups into `frontend/src/features/auth` if logic/UI will be reused.
6.  Route configuration
    -   In `frontend/src/routes`:
        -   Ensure `/register` path is mapped to `<Register />`.
        -   Optionally redirect logged-in users away from `/register`.
7.  UX and docs
    -   If you adjust the flow (e.g., add email verification screen), describe it in `docs/FEATURES.MD`.

```
┌─────────────┐
│   CLIENT    │
│  (Browser)  │
└──────┬──────┘
       │ HTTP Request (POST /api/auth/register)
       │ { email, password, name, role }
       ▼
┌─────────────────────────────────────────────────┐
│              BACKEND SERVER                      │
│                                                   │
│  ┌────────────────────────────────────────┐     │
│  │  1. ROUTES (auth.routes.ts)            │     │
│  │     - Match HTTP method & path         │     │
│  │     - Apply middleware chain           │     │
│  └──────────────┬─────────────────────────┘     │
│                 │                                 │
│  ┌──────────────▼─────────────────────────┐     │
│  │  2. MIDDLEWARES                        │     │
│  │     - Validation (registerValidation)  │     │
│  │     - Sanitization                     │     │
│  └──────────────┬─────────────────────────┘     │
│                 │                                 │
│  ┌──────────────▼─────────────────────────┐     │
│  │  3. CONTROLLER (auth.controller.ts)    │     │
│  │     - Extract req.body                 │     │
│  │     - Call service method              │     │
│  │     - Format response                  │     │
│  └──────────────┬─────────────────────────┘     │
│                 │                                 │
│  ┌──────────────▼─────────────────────────┐     │
│  │  4. SERVICE (auth.service.ts)          │     │
│  │     - Business logic validation        │     │
│  │     - Check email uniqueness           │     │
│  │     - Call model methods               │     │
│  │     - Generate JWT                     │     │
│  └──────────────┬─────────────────────────┘     │
│                 │                                 │
│  ┌──────────────▼─────────────────────────┐     │
│  │  5. MODEL (User.model.ts)              │     │
│  │     - Mongoose schema validation       │     │
│  │     - Pre-save hook (hash password)    │     │
│  │     - Save to MongoDB                  │     │
│  └──────────────┬─────────────────────────┘     │
│                 │                                 │
└─────────────────┼─────────────────────────────────┘
                  │
       ┌──────────▼──────────┐
       │      MongoDB        │
       │  (Database Layer)   │
       └─────────────────────┘
                  │
                  │ Return saved user
                  ▼
       Response flows back up the chain:
       Model → Service → Controller → Client
```
## 3. Architecture Guardrails

Do's and Don'ts
---------------

These rules prevent spaghetti code, ensure scalability, and align with MERN/TypeScript best practices.

-   **Do**: Keep controllers thin---only handle req/res orchestration; delegate all logic to services.
-   **Don't**: Write business logic (e.g., validation rules, DB queries) in controllers; this bloats them and hinders testing.
-   **Do**: Use types everywhere for strict typing; import from types folders to catch errors early.
-   **Don't**: Skip types or use 'any'---this defeats TypeScript's purpose and leads to runtime bugs.
-   **Do**: Centralize API calls in frontend services; use hooks for logic reuse.
-   **Don't**: Make direct fetch/Axios calls in components or pages---this creates duplication and hard-to-maintain code.
-   **Do**: Apply middlewares per-route for security (e.g., role.middleware.ts on admin routes).
-   **Don't**: Hardcode auth/checks in controllers; reuse middlewares to avoid inconsistency.
-   **Do**: Decouple services from HTTP (no req/res in services); make them testable independently.
-   **Don't**: Access DB directly from controllers or utils---always go through services and models.
-   **Do**: Use stores for global state; avoid local state for shared data like user auth.
-   **Don't**: Prop drill deeply; use context/stores to keep components clean.
-   **Do**: Validate inputs at multiple layers (client utils/validators.ts, backend validation.middleware.ts).
-   **Don't**: Trust client data---always re-validate on server to prevent attacks.
-   **Do**: Document changes in docs (e.g., update API.MD for new endpoints).
-   **Don't**: Add features without updating TODO.md or FEATURES.md; this leads to outdated docs.
-   **Do**: Follow domain separation (e.g., one controller/route per feature like event/discussion).
-   **Don't**: Mix unrelated logic (e.g., no auth in event.service.ts)---keep folders focused.
-   **Do**: Handle errors consistently with appError.ts and error.middleware.ts.
-   **Don't**: Use console.log for errors; always throw structured errors for proper logging.