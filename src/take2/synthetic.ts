/**
 * Arguments passed when computing synthetic attributes
 * when children are indexed.
 */
export interface SyntheticArgsIndexed<T> {
  children: Array<T>;
  node: T;
}

/**
 * Arguments passed when computing synthetic attributes
 * when children are named.
 */
export interface SyntheticArgsNamed<T> {
  children: Record<string, T>;
  node: T;
}

export interface ChildInformation<T, R> {
  node: T;
  attr: () => R;
}
/**
 * Arguments available when computing a synthetic attribute.
 */
export interface SyntheticArg<T, R> {
  // siblings: Array<ChildInformation<T, R>>;
  node: T;
  children: Array<ChildInformation<T, R>>;
}
