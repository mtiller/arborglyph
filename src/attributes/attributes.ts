import { TreeMap } from "../maps";

/**
 * An attribute is simply a function that we can call passing in the node
 * identifier and getting back some value.  The details of how the value
 * is computed (lazy, caching, etc) are hidden.
 */
export interface Attribute<T, R> {
  (nid: T): R;
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
export type DefinedAttributes<T extends object, A extends AttributeTypes> = {
  [P in keyof A]: Attribute<T, A[P]>;
};

export type ExtendedBy<
  T extends object,
  A extends AttributeTypes,
  N extends string,
  R
> = DefinedAttributes<T, A & Record<N, R>>;

export type AttributeConstructor<
  N extends string,
  T extends object,
  D extends AttributeTypes, // What this function **depends** on, it can be passed more than this
  R
> = <A extends D>(
  tree: TreeMap<T>,
  base: DefinedAttributes<T, D>,
  ext: DefinedAttributes<T, A>
) => ExtendedBy<T, A, N, R>;
