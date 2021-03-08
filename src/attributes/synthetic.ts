import { TreeMap } from "../maps/treemap";
import { DefinedAttributes, AttributeTypes, Attribute } from "./attributes";

export interface SyntheticArg<T, R, A extends AttributeTypes = {}> {
  childValues: R[];
  childAttrs: (x: T) => R;
  childIds: string[];
  attrs: DefinedAttributes<A>;
  node: T;
  nid: string;
}

export type SyntheticFunction<T, A extends AttributeTypes, R> = (
  args: SyntheticArg<T, R, A>
) => R;

export interface SyntheticOptions<R> {
  sample?: R;
}

export function synOpts<R>(
  opts: SyntheticOptions<R> = {}
): SyntheticOptions<R> {
  return opts;
}

export function eagerSyntheticAttribute<T, A, R>(
  f: SyntheticFunction<T, A, R>,
  map: TreeMap<T>,
  attrs: DefinedAttributes<A>
): Attribute<R> {
  /**
   * This case is necessary because we lied to the TypeScript compiler about
   * the fact that `R` and `CV` are different types.  But they aren't really.
   */
  const evaluate: SyntheticFunction<T, any, R> = f as any;
  const ret = (nid: string): R => {
    const node = map.node(nid);
    const childIds = map.children(nid);
    const childValues = childIds.map((id) => ret(id));
    const childNodes = childIds.map((x) => map.node(x));
    const childAttrs = (x: T): R => {
      const idx = childNodes.indexOf(x);
      if (idx === -1) throw new Error(`Requested index of non-child node`);
      return childValues[idx];
    };
    return evaluate({ childValues, childIds, childAttrs, attrs, node, nid });
  };
  return ret;
}
