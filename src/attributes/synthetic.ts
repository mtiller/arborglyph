import { Attributes } from "./attributes";

export type SyntheticFunction<T, A extends Attributes<any>, R> = (
  childValues: R[],
  childIds: string[],
  attrs: A,
  node: T,
  nid: string
) => R;

export interface SyntheticOptions {}

export interface SyntheticAttributeDefinition<T, A extends Attributes<any>, R> {
  type: "synthetic";
  evaluate: SyntheticFunction<T, A, R>;
  options: SyntheticOptions;
}
