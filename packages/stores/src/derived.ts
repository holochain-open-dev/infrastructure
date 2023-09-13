import { derived as nativeDerive, Readable, Unsubscriber } from "svelte/store";

export interface Derived<T> extends Readable<T> {
  derivedFrom: Array<Readable<any>>;
}

/** One or more `Readable`s. */
type Stores =
  | Readable<any>
  | [Readable<any>, ...Array<Readable<any>>]
  | Array<Readable<any>>;

/** One or more values from `Readable` stores. */
type StoresValues<T> = T extends Readable<infer U>
  ? U
  : { [K in keyof T]: T[K] extends Readable<infer U> ? U : never };

/**
 * Derived value store by synchronizing one or more readable stores and
 * applying an aggregation function over its input values.
 *
 * @param stores - input stores
 * @param fn - function callback that aggregates the values
 * @param initial_value - when used asynchronously
 */
export function derived<S extends Stores, T>(
  stores: S,
  fn: (values: StoresValues<S>, set: (value: T) => void) => Unsubscriber | void,
  initial_value?: T
): Derived<T>;

/**
 * Derived value store by synchronizing one or more readable stores and
 * applying an aggregation function over its input values.
 *
 * @param stores - input stores
 * @param fn - function callback that aggregates the values
 * @param initial_value - initial value
 */
export function derived<S extends Stores, T>(
  stores: S,
  fn: (values: StoresValues<S>) => T,
  initial_value?: T
): Derived<T>;

/**
 * Derived value store by synchronizing one or more readable stores and
 * applying an aggregation function over its input values.
 *
 * @param stores - input stores
 * @param fn - function callback that aggregates the values
 */
export function derived<S extends Stores, T>(
  stores: S,
  fn: (values: StoresValues<S>) => T
): Derived<T>;

export function derived<T>(
  stores: Stores,
  fn: Function,
  initial_value?: T
): Derived<T> {
  const store = nativeDerive(stores, fn as any, initial_value);

  return {
    ...store,
    derivedFrom: Array.isArray(stores) ? stores : [stores],
  };
}
