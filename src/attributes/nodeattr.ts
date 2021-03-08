import { Attributes } from "./attributes";

export interface NodeAttributeDefinition<T, A extends Attributes<any>, R> {
  type: "node";
  evaluate: (node: T, attrs: A, nid: string) => R;
  options: {};
}
