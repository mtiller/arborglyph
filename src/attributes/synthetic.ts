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
