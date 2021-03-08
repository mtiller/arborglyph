import { Maybe } from "purify-ts/Maybe";
import { TreeMap } from "../maps/treemap";
import { Attribute, AttributeTypes, DefinedAttributes } from "./attributes";

export type InheritedFunction<
  T,
  A extends AttributeTypes,
  R,
  PV extends R = R
> = (
  parent: Maybe<PV>,
  parentId: Maybe<string>,
  attrs: DefinedAttributes<A>,
  node: T,
  nid: string
) => R;

export interface InheritedOptions {}

export function eagerInheritedAttribute<T, A, R, CV extends R>(
  f: InheritedFunction<T, A, R, CV>,
  map: TreeMap<T>,
  attrs: DefinedAttributes<A>
): Attribute<R> {
  /**
   * This case is necessary because we lied to the TypeScript compiler about
   * the fact that `R` and `CV` are different types.  But they aren't really.
   */
  const evaluate: InheritedFunction<T, any, R, R> = f as any;
  const ret = (nid: string): R => {
    const node = map.node(nid);
    const parent = map.parent(nid);
    const parentValue = parent.map((_) => ret(_));
    return evaluate(parentValue, parent, attrs, node, nid);
  };
  return ret;
}
