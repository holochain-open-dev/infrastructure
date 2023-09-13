import { is_promise } from "svelte/internal";
import { Readable } from "svelte/store";

import { derived } from "./derived.js";
import { AsyncReadable, AsyncStatus } from "./async-readable.js";

export type PipeStep<T> = AsyncReadable<T> | Readable<T> | Promise<T> | T;

function pipeStep<T, U>(
  store: AsyncReadable<T>,
  stepFn: (arg: T) => PipeStep<U>
): AsyncReadable<U> {
  return derived(store, (value, set) => {
    if (value.status === "error") set(value);
    else if (value.status === "pending") set(value);
    else {
      const v = stepFn(value.value);

      if ((v as Readable<any>).subscribe) {
        return (v as Readable<any>).subscribe((value) => {
          if ((value as AsyncStatus<U>).status) {
            set(value);
          } else {
            set({ status: "complete", value });
          }
        });
      } else if (is_promise(v)) {
        set({ status: "pending" });
        Promise.resolve(v)
          .then((v) => {
            set({ status: "complete", value: v });
          })
          .catch((error) => {
            set({
              status: "error",
              error,
            });
          });
        return () => {};
      } else {
        set({ status: "complete", value: v as U });
        return () => {};
      }
    }
    return undefined;
  });
}

/**
 * Takes an AsyncReadable store and derives it with the given functions
 * Each step may return an `AsyncReadable`, `Readable`, `Promise` or just a raw value
 *
 * ```js
 *  const asyncReadableStore = lazyLoad(async () => {
 *    await sleep(1);
 *    return 1;
 *  });
 *  const pipeStore = pipe(
 *    asyncReadableStore,
 *    (n1) =>
 *      lazyLoad(async () => {  // Step with `AsyncReadable`
 *        await sleep(1);
 *        return n1 + 1;
 *      }),
 *    (n2) => readable(n2 + 1), // Step with `Readable`
 *    async (n3) => {           // Step with `Promise`
 *      await sleep(1);
 *      return n3 + 1;
 *    },
 *    (n4) => n4 + 1            // Step with raw value
 *  );
 *  pipeStore.subscribe(value => console.log(value)); // Use like any other store, will print "5" after 3 milliseconds
 * ```
 */
export function pipe<T, U>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => PipeStep<U>
): AsyncReadable<U>;
export function pipe<T, U, V>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => PipeStep<U>,
  fn2: (arg: U) => PipeStep<V>
): AsyncReadable<V>;
export function pipe<T, U, V, W>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => PipeStep<U>,
  fn2: (arg: U) => PipeStep<V>,
  fn3: (arg: V) => PipeStep<W>
): AsyncReadable<W>;
export function pipe<T, U, V, W, X>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => PipeStep<U>,
  fn2: (arg: U) => PipeStep<V>,
  fn3: (arg: V) => PipeStep<W>,
  fn4: (arg: W) => PipeStep<X>
): AsyncReadable<X>;
export function pipe<T, U, V, W, X, Y>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => PipeStep<U>,
  fn2: (arg: U) => PipeStep<V>,
  fn3: (arg: V) => PipeStep<W>,
  fn4: (arg: W) => PipeStep<X>,
  fn5: (arg: X) => PipeStep<Y>
): AsyncReadable<Y>;
export function pipe<T, U, V, W, X, Y, Z>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => PipeStep<U>,
  fn2: (arg: U) => PipeStep<V>,
  fn3: (arg: V) => PipeStep<W>,
  fn4: (arg: W) => PipeStep<X>,
  fn5: (arg: X) => PipeStep<Y>,
  fn6: (arg: Y) => PipeStep<Z>
): AsyncReadable<Z>;
export function pipe<T, U, V, W, X, Y, Z>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => PipeStep<U>,
  fn2?: (arg: U) => PipeStep<V>,
  fn3?: (arg: V) => PipeStep<W>,
  fn4?: (arg: W) => PipeStep<X>,
  fn5?: (arg: X) => PipeStep<Y>,
  fn6?: (arg: Y) => PipeStep<Z>
): AsyncReadable<Z> {
  let s: AsyncReadable<any> = pipeStep(store, fn1);

  if (fn2) {
    s = pipeStep(s, fn2);
  }
  if (fn3) {
    s = pipeStep(s, fn3);
  }
  if (fn4) {
    s = pipeStep(s, fn4);
  }
  if (fn5) {
    s = pipeStep(s, fn5);
  }
  if (fn6) {
    s = pipeStep(s, fn6);
  }

  return s;
}
