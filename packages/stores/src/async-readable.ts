import { readable, Readable, Unsubscriber } from "svelte/store";

export type AsyncStatus<T> =
  | { status: "pending" }
  | { status: "complete"; value: T }
  | { status: "error"; error: any };

export type AsyncReadable<T> = Readable<AsyncStatus<T>>;

export function lazyLoad<T>(load: () => Promise<T>): AsyncReadable<T> {
  return readable<AsyncStatus<T>>({ status: "pending" }, (set) => {
    load()
      .then((v) => {
        set({ status: "complete", value: v });
      })
      .catch((e) => set({ status: "error", error: e }));

    return () => {};
  });
}

export function lazyLoadAndPoll<T>(
  load: () => Promise<T>,
  pollIntervalMs: number
): AsyncReadable<T> {
  return readable<AsyncStatus<T>>({ status: "pending" }, (set) => {
    let interval = undefined;
    async function l() {
      try {
        const v = await load();
        set({ status: "complete", value: v });
      } catch (e) {
        set({ status: "error", error: e });
      }
    }
    l().then(() => {
      interval = setInterval(() => l(), pollIntervalMs);
    });
    return () => {
      if (interval) clearInterval(interval);
    };
  });
}

export function lazyLoadAndListen<T>(
  load: () => Promise<T>,
  listen: (update: (updater: (oldVal: T) => T) => void) => Unsubscriber
): AsyncReadable<T> {
  return readable<AsyncStatus<T>>({ status: "pending" }, (set) => {
    let subscription: Unsubscriber | undefined;
    load()
      .then((v) => {
        set({ status: "complete", value: v });
        if (listen) {
          const update = (updater: (oldVal: T) => T) => {
            v = updater(v);
            set({ status: "complete", value: v });
          };
          subscription = listen(update);
        }
      })
      .catch((e) => set({ status: "error", error: e }));

    return () => {
      if (subscription) subscription();
    };
  });
}
