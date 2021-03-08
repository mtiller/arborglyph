import { Attributes } from "./attributes";

export interface InheritedAttributeDefinition<T, A extends Attributes<any>, R> {
  type: "inherited";
  evaluate: (
    childValues: R[],
    childIds: string[],
    attrs: A,
    node: T,
    nid: string
  ) => R;
  options: {};
}
