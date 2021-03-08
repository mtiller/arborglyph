import { InheritedAttributeDefinition } from "./inherited";
import { NodeAttributeDefinition } from "./nodeattr";
import { SyntheticAttributeDefinition } from "./synthetic";

/**
 * An attribute is simply a function that we can call passing in the node
 * identifier and getting back some value.  The details of how the value
 * is computed (lazy, caching, etc) are hidden.
 */
export interface Attribute<R> {
  (nid: string): R;
}

/**
 * The `AttributeTypes` type is simply a mapping of attribute name
 * to the type of that attribute.
 */
export type AttributeTypes = Record<string, any>;

/**
 * Given an `AttributesTypes` type, formulate the type of the
 * `attrs` argument containing previously defined attributes
 * when evaluating a new attribute.
 */
export type DefinedAttributes<A extends AttributeTypes> = {
  [P in keyof A]: Attribute<A[P]>;
};

/**
 * This is the union of all possile attribute definitions.
 */
export type AttributeDefinition<T, A extends Attributes<any>, R> =
  | SyntheticAttributeDefinition<T, A, R>
  | InheritedAttributeDefinition<T, A, R>
  | NodeAttributeDefinition<T, A, R>;

export type AttributeDefinitionReturnType<F> = F extends AttributeDefinition<
  any,
  any,
  infer R
>
  ? R
  : undefined;

/**
 * A collection of attribute definitions that all operate on nodes of type `T`
 */
export type AttributeDefinitions<T> = {
  [key: string]: AttributeDefinition<T, any, any>;
};

export type AttributeTypesFromDefinitions<
  D extends AttributeDefinitions<any>
> = {
  [P in keyof D]: AttributeDefinitionReturnType<D[P]>;
};

export type NodeType<F> = F extends AttributeDefinitions<infer T>
  ? T
  : undefined;

export type AddAttribute<
  T,
  A extends AttributeDefinitions<T>,
  N extends string,
  F extends AttributeDefinition<T, AttributeTypesFromDefinitions<A>, any>
> = { [P in keyof A]: A[P] } & { [P in N]: F };

export type Attributes<F extends AttributeDefinitions<any>> = {
  // These are the "builtin" attributes
  // parent: Attribute<string>;
} & {
  [K in keyof F]: Attribute<AttributeDefinitionReturnType<F[K]>>;
};
