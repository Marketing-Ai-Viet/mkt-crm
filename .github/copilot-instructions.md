# Copilot Instructions for this CRM Repository

## Build, test, and lint commands

Use Nx project targets for most tasks.

### Development
- `yarn start` (starts `twenty-front`, `twenty-server`, and `twenty-server:worker`)
- `npx nx start twenty-front`
- `npx nx start twenty-server`
- `npx nx run twenty-server:worker`

### Build
- `npx nx build twenty-front`
- `npx nx build twenty-server`

### Lint / typecheck / format
- `npx nx lint twenty-front`
- `npx nx lint twenty-server`
- `npx nx lint twenty-front --fix`
- `npx nx typecheck twenty-front`
- `npx nx typecheck twenty-server`
- `npx nx fmt twenty-front`
- `npx nx fmt twenty-server`

### Tests
- `npx nx test twenty-front`
- `npx nx test twenty-server`
- `npx nx run twenty-server:test:integration:with-db-reset`
- `npx nx storybook:serve-and-test:static`

### Run a single test
- Frontend file: `npx nx run twenty-front:test --testFile=src/path/to/file.test.tsx`
- Backend file: `npx nx run twenty-server:test --testFile=src/path/to/file.spec.ts`
- Single test case name: `npx nx run twenty-server:test --testFile=src/path/to/file.spec.ts --testNamePattern="should do X"`
- Single integration test file: `npx nx run twenty-server:jest -- --config ./jest-integration.config.ts --testPathPattern=test/integration/path/to/file.integration-spec.ts`

### Useful maintenance
- `npx nx reset` (use when Nx daemon/cache/project-graph is stuck or inconsistent)

## High-level architecture

- Nx monorepo (`packages/` as apps/libs workspace layout) with main apps `twenty-front` (React) and `twenty-server` (NestJS).
- Frontend boots from `packages/twenty-front/src/index.tsx` and renders `App`, which wires global providers (Recoil, Lingui, error boundaries, Helmet, UI contexts), then composes route-level providers in `AppRouterProviders` (Apollo, auth, metadata, prefetch, theme, dialog/snackbar, workspace/user effects).
- Backend boots from `packages/twenty-server/src/main.ts` and `AppModule`, exposing GraphQL Yoga APIs (`/graphql`, `/metadata`) plus REST and MCP modules, with upload/session middleware at bootstrap.
- `CoreEngineModule` is the central backend composition module and imports `MktCoreModule`, which brings custom business domains (orders, payments, customers, departments, product integration, license integration, user management, etc.).
- Worker processing is a separate runtime (`twenty-server:worker`) and should be considered part of normal local/dev execution.

## Key conventions specific to this codebase

- `mkt-core` is a first-class extension layer; prefer extending inside `packages/twenty-server/src/mkt-core/` rather than scattering custom business logic.
- Keep standard object/field IDs stable: do not change values in `packages/twenty-server/src/mkt-core/constants/mkt-object-ids.ts` (and corresponding field ID constants).
- For date/time logic in `mkt-core`, use `DateTimeUtils` (`packages/twenty-server/src/mkt-core/utils/date-time.utils`) instead of direct `Date`/`Date.now()` usage.
- For money calculations, use `MoneyUtils` (`packages/twenty-server/src/mkt-core/utils/money.utils`) instead of manual floating-point arithmetic.
- For JSON serialization/deserialization in `mkt-core`, use `safeJsonParse` / `safeJsonStringify` helpers (`packages/twenty-server/src/mkt-core/utils/json.util`) instead of raw `JSON.parse` / `JSON.stringify`.
- Entity modeling in custom domains follows the Twenty workspace entity pattern (`@WorkspaceEntity`, `@WorkspaceField`, `@WorkspaceRelation`) with immutable standard IDs.
- Repository-wide style constraints used by existing assistant configs: named exports only, prefer `type` over `interface` (except third-party extension), avoid `any`, prefer early returns, and avoid `forEach`.
