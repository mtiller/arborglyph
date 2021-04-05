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
export interface SyntheticArg<T, R, A extends AttributeTypes = {}> {
  childAttrs: (x: T) => R;
  childIds: string[];
  childValues: () => R[];
  attrs: DefinedAttributes<A>;
  node: T & A;
  nid: string;
}

/**
 * Type signature of the function that computes synthetic attributes.
 */
export type SyntheticFunction<T, A extends AttributeTypes, R> = (
  args: SyntheticArg<T, R, A>,
  r?: R
) => R;

export interface NamedSyntheticFunction<
  N extends string,
  T,
  A extends AttributeTypes,
  R
> {
  name: N;
  f: SyntheticFunction<T, A, R>;
}

export function namedSynthetic<N extends string>(key: N) {
  return <T, A extends AttributeTypes, R>(
    f: (args: SyntheticArg<T, R, A>) => R
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
export function syntheticAttribute<T extends object, A, R>(
  f: SyntheticFunction<T, A, R>,
  tree: TreeMap<T>,
  attrs: DefinedAttributes<A>,
  memoize: boolean
): Attribute<R> {
  /**
   * This case is necessary because we lied to the TypeScript compiler about
   * the fact that `R` and `CV` are different types.  But they aren't really.
   */
  const evaluate: SyntheticFunction<T, A, R> = f as any;
  const ret = memoizeEvaluator((nid: string): R => {
    const node = tree.node(nid) as T & A;
    const childIds = tree.children(nid);

    const childNodes = childIds.map((x) => tree.node(x));
    const childValues = () => {
      return childIds.map((n) => ret(n));
    };
    const childAttrs = (x: T): R => {
      const idx = childNodes.indexOf(x);
      if (idx === -1) throw new Error(`Requested index of non-child node`);
      return ret(childIds[idx]);
    };
    return evaluate({
      childIds,
      childValues,
      childAttrs,
      attrs,
      node,
      nid,
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
  f: SyntheticFunction<T, D, R>,
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
    base: DefinedAttributes<D>,
    ext: DefinedAttributes<A>
  ): ExtendedBy<A, N, R> => {
    const attr = syntheticAttribute<T, D, R>(f, tree, base, memoize);
    const attrs: DefinedAttributes<A & Record<N, R>> = {
      ...ext,
      [name]: attr,
    };
    return attrs;
  };
}
