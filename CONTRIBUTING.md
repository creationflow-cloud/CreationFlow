# Contributing to CreationFlow

Thank you for contributing to CreationFlow. This guide covers how to work with this repository.

## Branch Naming

Use the following convention for branch names:

```
feature/short-description
fix/short-description
docs/short-description
refactor/short-description
test/short-description
```

Examples:

- `feature/pdf-text-rendering`
- `fix/editor-zoom-pan`
- `docs/add-api-reference`
- `refactor/surface-helpers`

## Commit Messages

Use conventional commit format:

```
type(scope): short description

Longer description if needed.
```

**Types:**

- `feat` — new feature
- `fix` — bug fix
- `docs` — documentation changes
- `style` — formatting, no code change
- `refactor` — code refactoring
- `test` — adding or updating tests
- `chore` — maintenance, dependencies, config

**Examples:**

```
feat(pdf-engine): add text rendering with font loading
fix(editor): resolve zIndex sorting for grouped elements
docs(api): add endpoint documentation for render jobs
refactor(schema): extract branded types into separate module
test(importers): add SVG import test for path surfaces
```

## Pull Requests

- Keep PRs small and focused on a single topic
- Include a clear description of what changed and why
- Reference related issues or tasks
- Ensure all checks pass before requesting review
- Squash merge for clean history

## Before You Commit

Always run these checks before committing:

```bash
# Type-check all workspaces
pnpm typecheck

# Lint all workspaces
pnpm lint

# Format code
pnpm format

# Or check formatting without modifying files
pnpm format:check

# Run tests
pnpm -r --if-present test
```

## Code Style

- **TypeScript strict mode** is required for all new code
- **ESLint** enforces code quality rules
- **Prettier** handles formatting — do not manually format
- **Export public APIs** through `index.ts` in each package
- **Use shared types** from `@creationflow/schema`
- **No hardcoded assumptions** about specific merch partners in the core

## Architecture Rules

- **Apps orchestrate** — handle user flows and API integration
- **Packages implement** — contain reusable domain and business logic
- **Keep business logic in packages**, not hidden inside apps
- **WooCommerce plugin is an adapter** — do not put core logic in it
- **JSON document model is the source of truth** — keep it renderer-independent

## Security

- **Never commit secrets**, credentials, API keys, or tokens
- **Use placeholders** for example configuration
- **License validation stays outside** this public repository
- **Customer data is self-hosted** by default

## Working with the Monorepo

### Install Dependencies

```bash
pnpm install
```

### Start Development

```bash
# Start API, Admin, and Editor concurrently
pnpm dev:all

# Or start individual apps
pnpm --filter @creationflow/api dev
pnpm --filter @creationflow/admin dev
pnpm --filter @creationflow/editor dev
```

### Build

```bash
pnpm build
```

### Database

```bash
# Run migrations
pnpm --filter @creationflow/database prisma migrate dev

# Seed demo data
DEMO_SEED=true pnpm --filter @creationflow/api dev
```

## Documentation

- Update documentation when code changes affect public APIs or workflows
- Keep `docs/` files in sync with implementation status
- Update `STATUS.md` when features are completed or changed
- Update `ROADMAP.md` when tasks are completed or priorities shift
