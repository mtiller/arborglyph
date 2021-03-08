/**
 * A method for determining if a given value is an object (and not an array).
 * @param x
 * @returns
 */
export function isObject(x: any): boolean {
  return (
    (typeof x === "object" || typeof x === "function") &&
    x !== null &&
    !Array.isArray(x)
  );
}
