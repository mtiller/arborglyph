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
