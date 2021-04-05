import { TreeMap } from "../maps";

/**
 * An attribute is simply a function that we can call passing in the node
 * identifier and getting back some value.  The details of how the value
 * is computed (lazy, caching, etc) are hidden.
 */
export interface Attribute<R> {
  (nid: string): R;
  // TODO: Get rid of this
  invalidate(): void;
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

export type ExtendedBy<
  A extends AttributeTypes,
  N extends string,
  R
> = DefinedAttributes<A & Record<N, R>>;

export type AttributeConstructor<
  N extends string,
  T,
  D extends AttributeTypes, // What this function depends on
  R
> = <A extends D>(
  tree: TreeMap<T>,
  base: DefinedAttributes<D>,
  ext: DefinedAttributes<A>
) => ExtendedBy<A, N, R>;
