import { readable, Readable, Subscriber, Unsubscriber } from "svelte/store";

export type AsyncStatus<T> =
  | { status: "pending" }
  | { status: "complete"; value: T }
  | { status: "error"; error: any };

export type AsyncReadable<T> = Readable<AsyncStatus<T>>;

export function asyncReadable<T>(
  load: (set: Subscriber<T>) => Promise<Unsubscriber | void>
): AsyncReadable<T> {
  return readable<AsyncStatus<T>>({ status: "pending" }, (set) => {
    const asyncSet = (v) => set({ status: "complete", value: v });
    let unsubscribe: Unsubscriber | void;
    load(asyncSet)
      .then((u) => (unsubscribe = u))
      .catch((e) => set({ status: "error", error: e }));

    return () => unsubscribe && unsubscribe();
  });
}

function lazyLoad<T>(load: () => Promise<T>): AsyncReadable<T> {
  return readable<AsyncStatus<T>>({ status: "pending" }, (set) => {
    load()
      .then((v) => {
        set({ status: "complete", value: v });
      })
      .catch((e) => set({ status: "error", error: e }));

    return () => {};
  });
}

function lazyLoadAndPoll<T>(
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

function lazyLoadAndListen<T>(
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
