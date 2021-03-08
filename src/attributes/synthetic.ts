import { TreeMap } from "../maps/treemap";
import { DefinedAttributes, AttributeTypes, Attribute } from "./attributes";
import { memoizeEvaluator } from "./memoize";

/**
 * Arguments available when computing a synthetic attribute.
 */
export interface SyntheticArg<T, R, A extends AttributeTypes = {}> {
  childAttrs: (x: T) => R;
  childIds: string[];
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
    const childAttrs = (x: T): R => {
      const idx = childNodes.indexOf(x);
      if (idx === -1) throw new Error(`Requested index of non-child node`);
      return ret(childIds[idx]);
    };
    return evaluate({ childIds, childAttrs, attrs, node, nid });
  }, memoize);
  return ret;
}
