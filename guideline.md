# AI Coding Agent Guidelines

## TypeScript Error Prevention
Use proper type assertions when accessing Supabase query results with nested objects.
Handle asynchronous functions correctly for API routes that return Promises.
Check for null/undefined values before accessing object properties.
Never use async/await in React Client Components.
Always use specific values instead of empty strings for SelectItem components.

## Linting Error Prevention
Use `const` instead of `let` when variables are not reassigned.
Avoid async functions in React Client Components where possible.

## Supabase Query Handling
Avoid complex relational queries that return arrays instead of objects.
Fetch related data in separate queries for clearer type handling.
Use type assertions for nested object structures from database joins.

## Authentication Implementation
Include Supabase session tokens in API requests using axios interceptors.
Handle asynchronous authentication functions properly.
Use `await` when calling authentication helper functions.
Add Authorization headers with Bearer tokens for protected endpoints.

## Code Quality
Maintain consistent variable declaration patterns.
Use appropriate error handling for database operations.
Validate response data against defined schemas.

## Next.js App Router
Remove 'use client' directive when using async/await in page components.
Use Promise types for params and searchParams in Server Components.
Initialize state with non-empty string values for Select components.

## Component Design
Avoid empty string values in SelectItem components.
Use descriptive placeholder values like 'all', 'none', or 'default'.
Implement proper conditional rendering for UI state management.

## Hono API Routes
Always include `/api` prefix in Hono route paths.
Use proper error handling with `success`/`failure`/`respond` patterns.
Validate request data with zod schemas before processing.

## Environment Variables
Always validate environment variables with fallbacks.
Use `NEXT_PUBLIC_SUPABASE_URL` as fallback when `SUPABASE_URL` is not available.

## React Hooks and State Management
Follow React Query patterns for server state management.
Use proper cache keys that include relevant parameters.
Handle loading and error states appropriately in UI components.
Call all hooks at the top level of component body before any conditional logic or early returns.
Never call hooks inside loops, conditions, or nested functions; maintain consistent hook call order across renders.
Ensure hooks are called in the same order on every render to prevent state misalignment and "rules of hooks" violations.
Track completion state explicitly when handling async multiple items (e.g., Set<string> for loaded IDs) instead of relying only on object existence; always account for empty/error cases to prevent infinite loading states.

## Foreign Key Constraints
Be aware of Supabase auth.users foreign key relationships.
Only insert records when referenced auth users exist.
Comment out code that would violate foreign key constraints with instructions.

## Zod Schema Validation
Validate all API inputs and outputs with zod schemas.
Use proper error handling when schema validation fails.
Apply transforms when necessary to convert data formats.

## Response Handler Functions
Always call `respond(c, result)` with context parameter, not `respond(status, data)`.
Use `respond()` function to convert HandlerResult to HTTP Response for Hono routes.
Apply `as any` type assertion when necessary for complex generic types.
Return `respond(c, result)` for all Hono route handlers to ensure proper HTTP responses.

## API Endpoint Routing
Use correct API endpoint paths consistently across application.
Update redirect paths to match actual route definitions after path changes.
Auto-login after signup using signInWithPassword for session establishment.

## Hono Route Handler Types
Always specify `Hono<AppEnv>` type for route registrars.
Use `c.get('supabase')`, `c.get('logger')`, `c.get('user')` instead of `c.get('dependencies')`.
Apply `zValidator` type assertions with `as any` when middleware order conflicts.
Manually parse request body with `c.req.json()` when zValidator has type issues.

## Supabase Nested Relationships
Handle Supabase nested query results as either objects or arrays.
Use conditional checks to determine if nested data is array or object: `Array.isArray(data) ? data[0] : data`.
Remove `!inner` operator from relationship selects to avoid forced array returns.
Access nested properties safely after type assertions for nested structures.

## Dashboard and Authentication
Unify profile fetching across all dashboard pages using same API endpoint.
Use `useCurrentUser()` hook consistently for authentication state.
Implement role-based access control by checking `user.role` against expected value.
Ensure auto-login after signup to establish session before dashboard redirect.

## Generic Type Constraints
Use `typeof errorCodes[keyof typeof errorCodes]` for error code generic types.
Never use custom error type unions when string literal type works.
Apply proper type constraints in HandlerResult<Data, ErrorCode, Details>.

## Compile Error Prevention
Ensure all imported functions are actually exported from modules.
Match function parameter types exactly with expected service function signatures.
Apply type assertions for Supabase query results due to schema inference limitations.
Test build before assuming all type errors are resolved.

## Variable Scope Management
Never declare variables with the same name in nested scopes (e.g., `supabase` in same function).
Check variable re-declaration before writing new code in existing blocks.

## Handler Result Type Safety
Use `.data` property for successful results, `.error` for failures in HandlerResult.
Never use `.value` when accessing HandlerResult contents.
Access error properties via `(result as any).error?.message` for error state handling.

## Error Code Format Consistency
Define error codes as string literals, not objects: `ERROR_CODE: 'ERROR_CODE'`.
Use `(typeof errorCodes)[keyof typeof errorCodes]` pattern for error code typing.
Standardize error code format across all feature modules (assignment, course, enrollment, etc).

## Failure Function Parameter Order
Call `failure(statusCode, errorCode, message, details?)` with correct parameter sequence.
Never swap status code and error code positions in failure calls.

## Domain Entity Status Enums
Verify schema-defined status values before using in code conditionals.
For course status: use `'published' | 'draft' | 'archived'`, never `'active'`.
Create separate type definitions for different status enums (CourseStatus, ReportStatus, etc).

## Logger Type Consistency
Use `AppLogger` type from `@/backend/hono/context` for all logger implementations.
Never import external logger libraries like `pino` without verification.
Use AppLogger methods: `info()`, `error()`, `warn()`, `debug()` only.

## API Response Schema Design
Distinguish between base entity schema (Course) and detailed schema (CourseDetailResponse).
Include additional fields in detail schemas (e.g., instructor_name, category object).
Fetch supplementary data in service layer before returning to client.

## Supabase Nested Query Handling
Split complex relational queries into separate sequential queries.
Avoid `.select('table(nested_field)')` patterns for type safety.
Query foreign key relationships separately: fetch parent, then child by ID.

## StatusCode Type Validation
Use only valid HTTP status codes from Hono's ContentfulStatusCode type.
Avoid non-standard codes like 204; use 200 for success responses.
Verify status code availability in type definitions before implementation.

## Dependency Module Imports
Check all imported modules exist before compilation.
Verify @/components/ui/* components are installed in project.
Use `shadcn-ui` CLI to install missing UI components before usage.

## Type Object vs Primitive Handling
Distinguish between object properties (e.g., `category: CategorySchema`) and IDs (e.g., `category_id: number`).
Handle rendering logic: check if property is object or string before accessing nested fields.
Use conditional rendering: `typeof field === 'string' ? field : field.name`.

## Cast Assertion Usage
Use `as const` for immutable literals in error code definitions.
Apply `as any` only when TypeScript inference fails; document reason.
Prefer explicit types over excessive type assertions.

## Assignment Management Pages
Assignment management split into: `/assignments` (dashboard) and `/courses/[courseId]/assignments` (course-specific).
When modifying student routes, ensure these assignment pages remain linked and functional.

## Instructor Pages Styling
All instructor role pages use consistent heading style: `text-3xl font-bold tracking-tight` for h1 and `mt-2 text-gray-600` for subtitle.
When referencing course/assignment names in instructor pages, use `text-blue-600` for emphasis (e.g., course name in assignment page headers).

## Database Schema Migration Completeness
Include all DB columns used in service code within migrations. Missing columns cause 500 errors.
Review service layer insert/update queries before writing migrations to identify all required columns.

## Authentication Logout Implementation
Client-side Supabase `signOut()` must be called first to clear session before API logout. Server-side API cannot fully remove user sessions.
Always call `supabase.auth.signOut()` on client, then refresh user context state, finally redirect to login.

## Role-Based Page Modifications
Isolate student-page changes to student-specific components/hooks/endpoints; never modify shared API logic without role branching.
Test instructor pages after any shared layer changes to ensure instructor functionality is unaffected.

## Client-Side Route Link Consistency
Verify that all internal navigation links point to routes that are actually defined in the app router. Always match link href paths with corresponding page.tsx files.
When updating route paths, search entire codebase for hardcoded navigation links and update them consistently to prevent 404 errors from broken client-side navigation.