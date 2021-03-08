import { TreeMap } from "../maps/treemap";
import { DefinedAttributes, AttributeTypes, Attribute } from "./attributes";

export type SyntheticFunction<
  T,
  A extends AttributeTypes,
  R,
  CV extends R = R
> = (
  childValues: CV[],
  childIds: string[],
  attrs: DefinedAttributes<A>,
  node: T,
  nid: string
) => R;

export interface SyntheticOptions {}

export function eagerSyntheticAttribute<T, A, R, CV extends R>(
  f: SyntheticFunction<T, A, R, CV>,
  map: TreeMap<T>,
  attrs: DefinedAttributes<A>
): Attribute<R> {
  /**
   * This case is necessary because we lied to the TypeScript compiler about
   * the fact that `R` and `CV` are different types.  But they aren't really.
   */
  const evaluate: SyntheticFunction<T, any, R, R> = f as any;
  const ret = (nid: string): R => {
    const node = map.node(nid);
    const childIds = map.children(nid);
    const childValues = childIds.map((id) => ret(id));
    return evaluate(childValues, childIds, attrs, node, nid);
  };
  return ret;
}
