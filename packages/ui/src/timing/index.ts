export interface DebounceOptions {
  readonly wait: number;
  readonly leading?: boolean;
  readonly trailing?: boolean;
}

export type CreateDebouncedFn<TArgs extends readonly unknown[]> = ((...args: TArgs) => void) & {
  cancel: () => void;
  flush: () => void;
};

export function debounce<TArgs extends readonly unknown[]>(
  fn: (...args: TArgs) => void,
  options: DebounceOptions,
): CreateDebouncedFn<TArgs> {
  const { wait, leading = false, trailing = true } = options;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: TArgs | null = null;
  let windowStartedAt: number | null = null;
  let didFireInWindow = false;

  const debounced = (...args: TArgs) => {
    const now = Date.now();
    lastArgs = args;
    const inActiveWindow = windowStartedAt !== null && now - windowStartedAt < wait;
    if (inActiveWindow) {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        windowStartedAt = null;
        if (trailing && lastArgs !== null) {
          fn(...lastArgs);
          lastArgs = null;
        } else {
          lastArgs = null;
        }
      }, wait);
      return;
    }
    windowStartedAt = now;
    didFireInWindow = false;
    if (leading) {
      fn(...args);
      didFireInWindow = true;
      lastArgs = null;
      timer = setTimeout(() => {
        timer = null;
        windowStartedAt = null;
        didFireInWindow = false;
      }, wait);
      return;
    }
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      windowStartedAt = null;
      if (trailing && lastArgs !== null) {
        fn(...lastArgs);
        lastArgs = null;
      } else {
        lastArgs = null;
      }
    }, wait);
    void didFireInWindow;
  };

  debounced.cancel = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    lastArgs = null;
    windowStartedAt = null;
    didFireInWindow = false;
  };

  debounced.flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (lastArgs !== null) {
      fn(...lastArgs);
      lastArgs = null;
    }
    windowStartedAt = null;
    didFireInWindow = false;
  };

  return debounced as CreateDebouncedFn<TArgs>;
}

export function leadingDebounce<TArgs extends readonly unknown[]>(
  fn: (...args: TArgs) => void,
  wait: number,
): CreateDebouncedFn<TArgs> {
  return debounce(fn, { wait, leading: true, trailing: false });
}

export function rafThrottle<TArgs extends readonly unknown[]>(
  fn: (...args: TArgs) => void,
): (...args: TArgs) => void {
  let scheduled = false;
  let lastArgs: TArgs | null = null;
  return (...args: TArgs) => {
    lastArgs = args;
    if (scheduled) return;
    scheduled = true;
    if (typeof globalThis.requestAnimationFrame === "function") {
      globalThis.requestAnimationFrame(() => {
        scheduled = false;
        if (lastArgs !== null) {
          fn(...lastArgs);
          lastArgs = null;
        }
      });
    } else {
      setTimeout(() => {
        scheduled = false;
        if (lastArgs !== null) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, 16);
    }
  };
}
