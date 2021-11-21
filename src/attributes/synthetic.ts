import { TreeMap } from "../maps/treemap";
import {
  DefinedAttributes,
  AttributeTypes,
  Attribute,
  ExtendedBy,
  AttributeConstructor,
} from "./attributes";
import { memoizeEvaluator } from "./memoize";

/**
 * Arguments available when computing a synthetic attribute.
 */
export interface SyntheticArg<T, A extends AttributeTypes = {}> {
  children: Array<T & A>;
  node: T & A;
  anno: (n: T) => T & A;
}

/**
 * Type signature of the function that computes synthetic attributes.
 */
export type SyntheticFunction<
  N extends string,
  T,
  A extends AttributeTypes,
  R
> = (args: SyntheticArg<T, A & Record<N, R>>) => R;

export interface NamedSyntheticFunction<
  N extends string,
  T,
  A extends AttributeTypes,
  R
> {
  name: N;
  f: SyntheticFunction<N, T, A, R>;
}

export function namedSynthetic<N extends string>(key: N) {
  return <T, A extends AttributeTypes, R>(
    f: (args: SyntheticArg<T, A>) => R
  ): NamedSyntheticFunction<N, T, A, R> => {
    return {
      name: key,
      f: f,
    };
  };
}

/**
 * Options associated with computed synthetic attributes.
 */
export interface SyntheticOptions {
  memoize?: boolean;
}

/**
 * This function creates an `Attribute` that returns the value of the synthetic
 * attribute.  It will invoke the provided `evaluate` function to do this, but
 * it will try to minimize the invocation of that function.  It also manages
 * "walking the tree" to retrieve child values on demand.
 * @param evaluate
 * @param tree
 * @param attrs
 * @param memoize
 * @returns
 */
export function syntheticAttribute<N extends string, T extends object, A, R>(
  f: SyntheticFunction<N, T, A, R>,
  tree: TreeMap<T>,
  attrs: DefinedAttributes<T, A>,
  memoize: boolean
): Attribute<T, R> {
  /**
   * This case is necessary because we lied to the TypeScript compiler about
   * the fact that `R` and `CV` are different types.  But they aren't really.
   */
  const evaluate: SyntheticFunction<N, T, A, R> = f as any;
  const ret = memoizeEvaluator((node: T): R => {
    const children = tree.children(node).map((x) => x as T & A & Record<N, R>);
    return evaluate({
      node: node as T & A & Record<N, R>,
      children,
      anno: (n) => n as T & A & Record<N, R>,
    });
  }, memoize);
  return ret;
}

export function synthetic<
  N extends string,
  T extends object,
  D extends AttributeTypes,
  R
>(
  name: N,
  f: SyntheticFunction<N, T, D, R>,
  memoize: boolean = false
): AttributeConstructor<N, T, D, R> {
  /**
   * The A parameter here represents some superset of D.  In other words,
   * this function can be pass a value for `ext` that has **more** attributes
   * than D (the set of attributes we require).  That's fine.  So the type of
   * the attributes actually passed in `A` which is some superset of `D`.  But
   * we need this type here to imply the constraint that what we return will
   * also contain `A` plus whatever attribute we are adding (and not just return
   * the requires set `D` plus what we are adding).
   */
  return <A extends D>(
    tree: TreeMap<T>,
    base: DefinedAttributes<T, D>,
    ext: DefinedAttributes<T, A>
  ): ExtendedBy<T, A, N, R> => {
    const attr = syntheticAttribute<N, T, D, R>(f, tree, base, memoize);
    const attrs: DefinedAttributes<T, A & Record<N, R>> = {
      ...ext,
      [name]: attr,
    };
    return attrs;
  };
}
