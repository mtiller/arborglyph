/**
 * This file contains a couple different ways to represent a tree.  It is
 * worth noting that these are all "top down".  This is really the only
 * practical representation because a bottom up tree isn't really traversable
 * because you'd have to know all the leaves in order to ensure that you could
 * visit every node.
 */

/** Used if children of a node are stored in an array or otherwise ordered. */
export type IndexedChildren<T> = (x: T) => T[];
/** Used if the children of a node are properties of their parent node */
export type NamedChildren<T> = (x: T) => Record<string, T>;
/** Union of both types */
export type ListChildren<T> = IndexedChildren<T> | NamedChildren<T>;
