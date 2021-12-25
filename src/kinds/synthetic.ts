import { CacheProvider } from "./cache";

export type SyntheticEvaluationWrapper<T> = <S extends T, R>(
  e: SyntheticAttributeEvaluator<S, R>
) => SyntheticAttributeEvaluator<S, R>;

// Merge with Inherited options?
export interface CommonSyntheticOptions {
  memoize: boolean;
  /** Pre-evaluate all nodes */
  eager: boolean;
  cacheProvider: CacheProvider;
}

export interface ChildInformation<T, R> {
  node: T;
  attr: R;
}

/**
 * Arguments available when computing a synthetic attribute.
 *
 * Sometimes we will want to request the attribute value for a specific
 * child.  In that case, we can use `attr`.  In other cases, we might wish
 * to iterate over the children.  In that case, we use `children`.
 */
export interface SyntheticArg<T, R> {
  // siblings: Array<ChildInformation<T, R>>;
  node: T;
  attr: (child: T) => R;
  children: Array<ChildInformation<T, R>>;
  createMap: <K, V>() => Map<K, V>;
}

export type SyntheticAttributeEvaluator<T, R> = (x: SyntheticArg<T, R>) => R;
