import { TreeMap } from "../maps/treemap";
import { ArborGlyph } from "./arborglyph";
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
  node: T;
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
export function syntheticAttribute<T, A, R>(
  f: SyntheticFunction<T, A, R>,
  tree: TreeMap<T>,
  attrs: DefinedAttributes<A>,
  memoize: boolean
): Attribute<R> {
  /**
   * This case is necessary because we lied to the TypeScript compiler about
   * the fact that `R` and `CV` are different types.  But they aren't really.
   */
  const evaluate: SyntheticFunction<T, any, R> = f as any;
  const ret = memoizeEvaluator((nid: string): R => {
    const node = tree.node(nid);
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
    return evaluate({ childIds, childValues, childAttrs, attrs, node, nid });
  }, memoize);
  return ret;
}

export function synthetic<N extends string, T, A extends AttributeTypes, R>(
  name: N,
  f: SyntheticFunction<T, A, R>,
  memoize: boolean = false
): AttributeConstructor<N, T, A, R> {
  return (
    tree: TreeMap<T>,
    base: DefinedAttributes<A>
  ): ExtendedBy<A, N, R> => {
    const attr = syntheticAttribute<T, A, R>(f, tree, base, memoize);
    const attrs: DefinedAttributes<A & Record<N, R>> = {
      ...base,
      [name]: attr,
    };
    return attrs;
  };
}
