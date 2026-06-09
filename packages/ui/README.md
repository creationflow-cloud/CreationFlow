# @creationflow/ui

Shared UI helpers and types for CreationFlow apps.

## What's inside

This package intentionally stays framework-agnostic. It exports pure
TypeScript modules so admin, editor, and renderer can all use the
same primitives without pulling in a CSS library.

| Module        | Exports                                                          |
| ------------- | ---------------------------------------------------------------- |
| `format`      | `cx`, `cxWith`, `formatNumber`, `formatPercent`, `clamp`, `isShallowEqual` |
| `timing`      | `debounce`, `leadingDebounce`, `rafThrottle`                     |
| `events`      | `createEmitter`, `Emitter`, `EventListener` types                |

## Usage

```ts
import { cx, debounce, createEmitter, type Emitter } from "@creationflow/ui";

const className = cx("btn", isPrimary && "btn-primary", { hidden: false });
const debouncedSave = debounce(save, { wait: 200 });

interface MyEvents {
  change: [string];
}
const emitter: Emitter<MyEvents> = createEmitter();
emitter.on("change", (value) => console.log(value));
```

## Testing

```
pnpm --filter @creationflow/ui test
```

24 unit tests cover the helpers.
