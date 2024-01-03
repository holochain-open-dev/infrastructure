/**
 * Deeply convert nulls into undefineds, and buffers into Uint8Array
 *
 * When msgpack is used to decode() in nodejs, it returns hashes as buffers
 * and nulls instead of undefineds.
 * This is mostly fine, except in tryorama tests when using deepEqual. This function
 * is useful in that case, to allow objects constructed in the tests to deeply equal
 * the return of calls to @holochain/client
 */
export function cleanNodeDecoding(object: any): any {
  return deepMap(object, (value) => {
    if (typeof Buffer !== "undefined" && Buffer.isBuffer(value))
      return new Uint8Array(value);
    if (value === null) return undefined;
    return value;
  });
}

function mapObject(obj, fn) {
  return Object.keys(obj).reduce((res, key) => {
    res[key] = fn(obj[key]);
    return res;
  }, {});
}

function deepMap(obj, fn) {
  const deepMapper = (val) =>
    typeof val === "object" && !Buffer.isBuffer(val)
      ? deepMap(val, fn)
      : fn(val);
  if (Array.isArray(obj)) {
    return obj.map(deepMapper);
  }
  if (obj === null) {
    return fn(obj);
  } else if (typeof obj === "object") {
    return mapObject(obj, deepMapper);
  }
  return obj;
}
