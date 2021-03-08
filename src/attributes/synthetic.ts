import { DefinedAttributes, Attributes, AttributeTypes } from "./attributes";

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
