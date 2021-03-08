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
 * In this context, `OV` stands for "other values" and that
 * means the value of child in the synthetic case and parents
 * in the inherited case.  In practice, these two types should
 * be identical.  But this can prevent us from inferring R as
 * the return type from the evaluation functions (since child
 * values is an argument and it is greedily inferred over return type.)
 */
export type AttributeDefinition<
  T,
  A extends Attributes<any>,
  R,
  OV extends R
> =
  | SyntheticAttributeDefinition<T, A, R, OV>
  | InheritedAttributeDefinition<T, A, R>
  | NodeAttributeDefinition<T, A, R>;

export type AttributeDefinitionReturnType<F> = F extends AttributeDefinition<
  any,
  any,
  infer R,
  any
>
  ? R
  : undefined;

/**
 * A collection of attribute definitions that all operate on nodes of type `T`
 */
export type AttributeDefinitions<T> = {
  [key: string]: AttributeDefinition<T, any, any, any>;
};

export type AttributeTypesFromDefinitions<
  D extends AttributeDefinitions<any>
> = {
  [P in keyof D]: AttributeDefinitionReturnType<D[P]>;
};

export type AttributeTypeFromDefinition<
  N extends keyof D,
  D extends AttributeDefinitions<any>
> = AttributeDefinitionReturnType<D[N]>;

export type NodeType<F> = F extends AttributeDefinitions<infer T>
  ? T
  : undefined;

export type AddAttribute<T, A extends AttributeTypes, N extends string, R> = A &
  { [P in N]: R };

export type Attributes<F extends AttributeDefinitions<any>> = {
  // These are the "builtin" attributes
  // parent: Attribute<string>;
} & {
  [K in keyof F]: Attribute<AttributeDefinitionReturnType<F[K]>>;
};
