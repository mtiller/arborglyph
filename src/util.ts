export function isObject(x: any): boolean {
  return (
    (typeof x === "object" || typeof x === "function") &&
    x !== null &&
    !Array.isArray(x)
  );
}
