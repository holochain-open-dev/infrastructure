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
export function pipe<T, U, V, W, X>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => AsyncReadable<U>,
  fn2: (arg: U) => AsyncReadable<V>,
  fn3: (arg: V) => AsyncReadable<W>,
  fn4: (arg: W) => AsyncReadable<X>
): AsyncReadable<X>;
export function pipe<T, U, V, W, X, Y>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => AsyncReadable<U>,
  fn2: (arg: U) => AsyncReadable<V>,
  fn3: (arg: V) => AsyncReadable<W>,
  fn4: (arg: W) => AsyncReadable<X>,
  fn5: (arg: X) => AsyncReadable<Y>
): AsyncReadable<Y>;
export function pipe<T, U, V, W, X, Y, Z>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => AsyncReadable<U>,
  fn2: (arg: U) => AsyncReadable<V>,
  fn3: (arg: V) => AsyncReadable<W>,
  fn4: (arg: W) => AsyncReadable<X>,
  fn5: (arg: X) => AsyncReadable<Y>,
  fn6: (arg: Y) => AsyncReadable<Z>
): AsyncReadable<Z>;
export function pipe<T, U, V, W, X, Y, Z>(
  store: AsyncReadable<T>,
  fn1: (arg: T) => AsyncReadable<U>,
  fn2?: (arg: U) => AsyncReadable<V>,
  fn3?: (arg: V) => AsyncReadable<W>,
  fn4?: (arg: W) => AsyncReadable<X>,
  fn5?: (arg: X) => AsyncReadable<Y>,
  fn6?: (arg: Y) => AsyncReadable<Z>
): AsyncReadable<Z> {
  let s: AsyncReadable<any> = asyncDeriveStore(store, fn1);

  if (fn2) {
    s = asyncDeriveStore(s, fn2);
  }
  if (fn3) {
    s = asyncDeriveStore(s, fn3);
  }
  if (fn4) {
    s = asyncDeriveStore(s, fn4);
  }
  if (fn5) {
    s = asyncDeriveStore(s, fn5);
  }
  if (fn6) {
    s = asyncDeriveStore(s, fn6);
  }

  return s;
}
