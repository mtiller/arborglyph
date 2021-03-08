import { Maybe } from "purify-ts/Maybe";
import { AttributeTypes, DefinedAttributes } from "./attributes";

export type InheritedFunction<
  T,
  A extends AttributeTypes,
  R,
  PV extends R = R
> = (
  parent: PV,
  parentId: Maybe<string>,
  attrs: DefinedAttributes<A>,
  node: T,
  nid: string
) => R;

export interface InheritedAttributeDefinition<
  T,
  A extends AttributeTypes,
  R,
  PV extends R
> {
  type: "inherited";
  evaluate: InheritedFunction<T, A, R, PV>;
  options: {};
}
