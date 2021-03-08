import { InheritedAttributeDefinition } from "./inherited";
import { NodeAttributeDefinition } from "./nodeattr";
import { SyntheticAttributeDefinition } from "./synthetic";

export interface Attribute<R> {
  (nid: string): R;
}

export type AttributeDefinition<T, A extends Attributes<any>, R> =
  | SyntheticAttributeDefinition<T, A, R>
  | InheritedAttributeDefinition<T, A, R>
  | NodeAttributeDefinition<T, A, R>;

export type AttributeType<F> = F extends AttributeDefinition<any, any, infer R>
  ? R
  : undefined;

export type AttributeDefinitions<T> = {
  [key: string]: AttributeDefinition<T, any, any>;
};

export type NodeType<F> = F extends AttributeDefinitions<infer T>
  ? T
  : undefined;

export type AddAttribute<
  T,
  A extends AttributeDefinitions<T>,
  N extends string,
  F extends AttributeDefinition<T, Attributes<A>, any>
> = { [P in keyof A]: A[P] } & { [P in N]: F };

export type Attributes<F extends AttributeDefinitions<any>> = {
  // These are the "builtin" attributes
  // parent: Attribute<string>;
} & {
  [K in keyof F]: Attribute<AttributeType<F[K]>>;
};
