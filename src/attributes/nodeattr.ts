import { AttributeTypes } from "./attributes";

export interface NodeAttributeDefinition<T, A extends AttributeTypes, R> {
  type: "node";
  evaluate: (node: T, attrs: A, nid: string) => R;
  options: {};
}
