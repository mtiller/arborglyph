import { DefinedAttributes, Attributes, AttributeTypes } from "./attributes";

export type SyntheticFunction<T, A extends AttributeTypes, R> = (
  childValues: R[],
  childIds: string[],
  attrs: DefinedAttributes<A>,
  node: T,
  nid: string
) => R;

export interface SyntheticOptions {}

export interface SyntheticAttributeDefinition<T, A extends AttributeTypes, R> {
  type: "synthetic";
  evaluate: SyntheticFunction<T, A, R>;
  options: SyntheticOptions;
}

export type SyntheticDefintionFromEval<F> = F extends SyntheticFunction<
  infer T,
  infer A,
  infer R
>
  ? SyntheticAttributeDefinition<T, A, R>
  : undefined;
