# Testing

This document covers the testing strategy and how to run tests in CreationFlow.

## Test Framework

Tests use **Vitest** (or the test runner configured per workspace). Test files use the `.test.ts` extension and live next to the source files.

## Running Tests

### Run All Tests

```bash
pnpm -r --if-present test
```

### Run Tests for a Specific Workspace

```bash
pnpm --filter @creationflow/api test
pnpm --filter @creationflow/editor test
pnpm --filter @creationflow/pdf-engine test
pnpm --filter @creationflow/importers test
pnpm --filter @creationflow/schema test
```

### Run Tests in Watch Mode

```bash
pnpm --filter @creationflow/api test -- --watch
```

## Test Structure

### Unit Tests

Test individual functions and modules in isolation.

```
packages/pdf-engine/src/
  renderDocumentToPdf.ts
  renderDocumentToPdf.test.ts

packages/importers/src/
  importSvgSurfaces.ts
  importSvgSurfaces.test.ts

packages/schema/src/
  index.ts
  index.test.ts
```

### Integration Tests

Test API endpoints and database interactions.

```
apps/api/src/routes/
  asset-file.test.ts

apps/api/src/services/
  render-job-renderer.test.ts
```

### UI Tests

Test editor helpers and component logic.

```
apps/editor/src/helpers/
  selection-helpers.test.ts

apps/editor/src/api/
  render-jobs.test.ts
```

## Existing Tests

| File | What It Tests |
|------|---------------|
| `packages/schema/src/index.test.ts` | Schema types and document creation |
| `packages/pdf-engine/src/renderDocumentToPdf.test.ts` | PDF generation and coordinate conversion |
| `packages/importers/src/importSvgSurfaces.test.ts` | SVG parsing and surface extraction |
| `apps/api/src/routes/asset-file.test.ts` | Asset upload and download endpoints |
| `apps/api/src/services/render-job-renderer.test.ts` | Render job processing |
| `apps/editor/src/helpers/selection-helpers.test.ts` | Element selection logic |
| `apps/editor/src/api/render-jobs.test.ts` | Render job API calls |

## Writing Tests

### Naming

- Test files: `source-file.test.ts`
- Test suites: `describe('functionName', ...)`
- Test cases: `it('should do something when condition', ...)`

### Structure

```typescript
import { describe, it, expect } from 'vitest';
import { functionName } from './source-file';

describe('functionName', () => {
  it('should return expected value for valid input', () => {
    const result = function validInput();
    expect(result).toEqual(expected);
  });

  it('should throw error for invalid input', () => {
    expect(() => function invalidInput()).toThrow();
  });
});
```

### Mocking

#### Database

Use in-memory SQLite or mock the Prisma client for database tests:

```typescript
// Mock Prisma client
const mockPrisma = {
  workspace: {
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 'test-id' }),
  },
};
```

#### API

Mock external API calls with `vi.mock()`:

```typescript
vi.mock('@creationflow/api-client', () => ({
  createConfiguration: vi.fn().mockResolvedValue({ id: 'config-id' }),
}));
```

#### Storage

Use `MemoryStorageProvider` for tests instead of filesystem:

```typescript
import { MemoryStorageProvider } from '@creationflow/storage';

const storage = new MemoryStorageProvider();
```

### Test Data

Create test documents using schema helpers:

```typescript
import { createEmptyDocument } from '@creationflow/core';

const testDocument = createEmptyDocument({
  workspaceId: 'test-workspace',
  productId: 'test-product',
});
```

## Test Coverage Goals

| Area | Target |
|------|--------|
| Schema & Core | 90%+ |
| PDF Engine | 80%+ |
| API Routes | 80%+ |
| Editor Helpers | 70%+ |
| Importers | 80%+ |
| Admin UI | 50%+ (growing) |

## Continuous Integration

Tests should pass before merging. The CI pipeline runs:

1. `pnpm typecheck` — type-check all workspaces
2. `pnpm lint` — lint all workspaces
3. `pnpm format:check` — verify formatting
4. `pnpm -r --if-present test` — run all tests

## Known Gaps

- No E2E tests yet
- No integration tests for full render pipeline
- No UI component tests for Admin or Editor
- No API integration tests with real database
- Coverage is incomplete across most workspaces

## Priority Areas for New Tests

1. **PDF Engine** — text rendering, image rendering, shape rendering
2. **API Routes** — all CRUD endpoints with proper validation
3. **Editor** — element manipulation, undo/redo, save logic
4. **Rules Engine** — rule evaluation and dependency resolution
5. **WooCommerce Adapter** — product mapping, cart/order hooks (PHP unit tests)
