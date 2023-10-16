import { is_promise } from "svelte/internal";
import { Readable } from "svelte/store";

import { derived } from "./derived.js";
import { AsyncReadable, AsyncStatus } from "./async-readable.js";

export type PipeStep<T> = AsyncReadable<T> | Readable<T> | Promise<T> | T;

function pipeStep<T, U>(
  store: AsyncReadable<T>,
  stepFn: (arg: T, ...args: any[]) => PipeStep<U>,
  previousStores: Array<AsyncReadable<any>>
): AsyncReadable<U> {
  return derived([store, ...previousStores], (values, set) => {
    const value = values[0];
    if (value.status === "error") set(value);
    else if (value.status === "pending") set(value);
    else {
      const v = stepFn(
        value.value,
        ...values
          .slice(1)
          .map((v) => (v as any).value)
          .reverse()
      );

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
 * - Each step may return an `AsyncReadable`, `Readable`, `Promise` or just a raw value
 * - Each step receives the results of all the previous steps, normally you'll only need
 * the result for the latest one
 *
 * ```js
 *  const asyncReadableStore = lazyLoad(async () => {
 *    await sleep(1);
 *    return 1;
 *  });
 *  const pipeStore = pipe(
 *    asyncReadableStore,
 *    (n1) =>
 *      lazyLoad(async () => {    // Step with `AsyncReadable`
 *        await sleep(1);
 *        return n1 + 1;
 *      }),
 *    (n2) => readable(n2 + 1),   // Step with `Readable`
 *    async (n3, n2, n1) => {     // Step with `Promise`
 *      await sleep(1);
 *      return n3 + 1;
 *    },
 *    (n4, n3, n2, n1) => n4 + 1  // Step with raw value
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
  fn2: (arg: U, prevArg0: T) => PipeStep<V>
): AsyncReadable<V>;
export function pipe<T, U, V, W>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => PipeStep<U>,
  fn2: (arg: U, prevArg: T) => PipeStep<V>,
  fn3: (arg: V, prevArg0: U, prevArg1: T) => PipeStep<W>
): AsyncReadable<W>;
export function pipe<T, U, V, W, X>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => PipeStep<U>,
  fn2: (arg: U, prevArg: T) => PipeStep<V>,
  fn3: (arg: V, prevArg0: U, prevArg1: T) => PipeStep<W>,
  fn4: (arg: W, prevArg0: V, prevArg1: U, prevArg2: T) => PipeStep<X>
): AsyncReadable<X>;
export function pipe<T, U, V, W, X, Y>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => PipeStep<U>,
  fn2: (arg: U, prevArg: T) => PipeStep<V>,
  fn3: (arg: V, prevArg0: U, prevArg1: T) => PipeStep<W>,
  fn4: (arg: W, prevArg0: V, prevArg1: U, prevArg2: T) => PipeStep<X>,
  fn5: (
    arg: X,
    prevArg0: W,
    prevArg1: V,
    prevArg2: U,
    prevArg3: T
  ) => PipeStep<Y>
): AsyncReadable<Y>;
export function pipe<T, U, V, W, X, Y, Z>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => PipeStep<U>,
  fn2: (arg: U, prevArg: T) => PipeStep<V>,
  fn3: (arg: V, prevArg0: U, prevArg1: T) => PipeStep<W>,
  fn4: (arg: W, prevArg0: V, prevArg1: U, prevArg2: T) => PipeStep<X>,
  fn5: (
    arg: X,
    prevArg0: W,
    prevArg1: V,
    prevArg2: U,
    prevArg3: T
  ) => PipeStep<Y>,
  fn6: (
    arg: Y,
    prevArg0: X,
    prevArg1: W,
    prevArg2: V,
    prevArg3: U,
    prevArg4: T
  ) => PipeStep<Z>
): AsyncReadable<Z>;
export function pipe<T, U, V, W, X, Y, Z>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => PipeStep<U>,
  fn2?: (arg: U, prevArg: T) => PipeStep<V>,
  fn3?: (arg: V, prevArg0: U, prevArg1: T) => PipeStep<W>,
  fn4?: (arg: W, prevArg0: V, prevArg1: U, prevArg2: T) => PipeStep<X>,
  fn5?: (
    arg: X,
    prevArg0: W,
    prevArg1: V,
    prevArg2: U,
    prevArg3: T
  ) => PipeStep<Y>,
  fn6?: (
    arg: Y,
    prevArg0: X,
    prevArg1: W,
    prevArg2: V,
    prevArg3: U,
    prevArg4: T
  ) => PipeStep<Z>
): AsyncReadable<Z> {
  const s1: AsyncReadable<any> = pipeStep(store, fn1, []);

  if (!fn2) return s1;
  const s2 = pipeStep(s1, fn2, [store]);

  if (!fn3) return s2 as any;
  const s3 = pipeStep(s2, fn3, [store, s1]);

  if (!fn4) return s3 as any;
  const s4 = pipeStep(s3, fn4, [store, s1, s2]);

  if (!fn5) return s4 as any;
  const s5 = pipeStep(s4, fn5, [store, s1, s2, s3]);
  if (!fn6) return s5 as any;
  const s6 = pipeStep(s5, fn6, [store, s1, s2, s3, s4]);

  return s6;
}
