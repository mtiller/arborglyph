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

export type AddAttribute<T, A extends AttributeTypes, N extends string, R> = A &
  { [P in N]: R };
