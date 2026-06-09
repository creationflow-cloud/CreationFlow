export type EventName = string | symbol;

export type AppEvent = {
  readonly [key: string | symbol]: ReadonlyArray<unknown>;
};

export type EventListener<TArgs extends readonly unknown[]> = (...args: TArgs) => void;

export interface Emitter<TEventMap extends Record<string, readonly unknown[]>> {
  on<K extends keyof TEventMap>(
    event: K,
    listener: EventListener<TEventMap[K]>,
  ): () => void;
  off<K extends keyof TEventMap>(
    event: K,
    listener: EventListener<TEventMap[K]>,
  ): void;
  emit<K extends keyof TEventMap>(event: K, ...args: TEventMap[K]): void;
  clear(): void;
  listenerCount<K extends keyof TEventMap>(event: K): number;
}

type AnyListener = (...args: any[]) => void;
type ListenerSet = Set<AnyListener>;

export function createEmitter<
  TEventMap extends Record<string, readonly unknown[]>,
>(): Emitter<TEventMap> {
  const listeners = new Map<keyof TEventMap, ListenerSet>();

  function on<K extends keyof TEventMap>(
    event: K,
    listener: EventListener<TEventMap[K]>,
  ): () => void {
    const set: ListenerSet = listeners.get(event) ?? new Set();
    set.add(listener as AnyListener);
    listeners.set(event, set);
    return () => off(event, listener);
  }

  function off<K extends keyof TEventMap>(
    event: K,
    listener: EventListener<TEventMap[K]>,
  ): void {
    const set = listeners.get(event);
    if (!set) return;
    set.delete(listener as AnyListener);
    if (set.size === 0) listeners.delete(event);
  }

  function emit<K extends keyof TEventMap>(event: K, ...args: TEventMap[K]): void {
    const set = listeners.get(event);
    if (!set) return;
    for (const listener of [...set]) {
      try {
        listener(...(args as unknown as unknown[]));
      } catch (err) {
        if (typeof globalThis.console?.error === "function") {
          globalThis.console.error("listener threw", err);
        }
      }
    }
  }

  function clear(): void {
    listeners.clear();
  }

  function listenerCount<K extends keyof TEventMap>(event: K): number {
    return listeners.get(event)?.size ?? 0;
  }

  return { on, off, emit, clear, listenerCount };
}
