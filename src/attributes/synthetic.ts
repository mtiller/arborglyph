import { TreeMap } from "../maps/treemap";
import {
  DefinedAttributes,
  Attributes,
  AttributeTypes,
  Attribute,
} from "./attributes";

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

export interface SyntheticAttributeDefinition<
  T,
  A extends AttributeTypes,
  R,
  CV extends R
> {
  type: "synthetic";
  evaluate: SyntheticFunction<T, A, R, CV>;
  options: SyntheticOptions;
}

export type SyntheticDefintionFromEval<F> = F extends SyntheticFunction<
  infer T,
  infer A,
  infer R,
  infer CV
>
  ? SyntheticAttributeDefinition<T, A, R, CV>
  : undefined;

export function eagerSyntheticAttribute<T, R>(
  def: SyntheticAttributeDefinition<T, any, R, R>,
  map: TreeMap<T>
): Attribute<R> {
  const ret = (nid: string): R => {
    const node = map.node(nid);
    const childIds = map.children(nid);
    const childValues = childIds.map((id) => ret(id));
    return def.evaluate(childValues, childIds, {} as any, node, nid);
  };
  return ret;
}
