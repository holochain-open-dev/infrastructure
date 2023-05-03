import { asyncDeriveStore } from "./async-derived.js";
import { AsyncReadable } from "./async-readable.js";

// Takes an AsyncReadable store and derives it with the given functions
export function pipe<T, U>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => AsyncReadable<U>
): AsyncReadable<U>;
export function pipe<T, U, V>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => AsyncReadable<U>,
  fn2: (arg: U) => AsyncReadable<V>
): AsyncReadable<V>;
export function pipe<T, U, V, W>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => AsyncReadable<U>,
  fn2: (arg: U) => AsyncReadable<V>,
  fn3: (arg: V) => AsyncReadable<W>
): AsyncReadable<W>;
export function pipe<T, U, V, W>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => AsyncReadable<U>,
  fn2?: (arg: U) => AsyncReadable<V>,
  fn3?: (arg: V) => AsyncReadable<W>
): AsyncReadable<W> {
  let s: AsyncReadable<any> = asyncDeriveStore(store, fn1);

  if (fn2) {
    s = asyncDeriveStore(s, fn2);
  }
  if (fn3) {
    s = asyncDeriveStore(s, fn3);
  }

  return s;
}
