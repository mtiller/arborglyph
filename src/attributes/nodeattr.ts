import { TreeMap } from "../maps/treemap";
import { Attribute, AttributeTypes, DefinedAttributes } from "./attributes";

export type NodeFunction<T, A extends AttributeTypes, R> = (
  node: T,
  attrs: DefinedAttributes<A>,
  nid: string
) => R;

export function eagerNodeAttribute<T, A, R>(
  evaluate: NodeFunction<T, A, R>,
  map: TreeMap<T>,
  attrs: DefinedAttributes<A>
): Attribute<R> {
  const ret = (nid: string): R => {
    const node = map.node(nid);
    return evaluate(node, attrs, nid);
  };
  return ret;
}
