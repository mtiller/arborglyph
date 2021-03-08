import { TreeMap } from "../maps/treemap";
import { DefinedAttributes, AttributeTypes, Attribute } from "./attributes";
import { memoizeEvaluator } from "./memoize";

export interface SyntheticArg<T, R, A extends AttributeTypes = {}> {
  childValues: R[];
  childAttrs: (x: T) => R;
  childIds: string[];
  attrs: DefinedAttributes<A>;
  node: T;
  nid: string;
}

export type SyntheticFunction<T, A extends AttributeTypes, R> = (
  args: SyntheticArg<T, R, A>,
  r?: R
) => R;

export interface SyntheticOptions {
  memoize?: boolean;
}

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
    // TODO: Get rid of this.  It will evaluate the whole subtree even if the attribute doesn't need these values.
    const childValues = childIds.map((id) => ret(id));
    const childNodes = childIds.map((x) => tree.node(x));
    const childAttrs = (x: T): R => {
      const idx = childNodes.indexOf(x);
      if (idx === -1) throw new Error(`Requested index of non-child node`);
      return childValues[idx];
    };
    return evaluate({ childValues, childIds, childAttrs, attrs, node, nid });
  }, memoize);
  return ret;
}
