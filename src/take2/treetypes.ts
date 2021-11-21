/**
 * This file contains a couple different ways to represent a tree.  It is
 * worth noting that these are all "top down".  This is really the only
 * practical representation because a bottom up tree isn't really traversable
 * because you'd have to know all the leaves in order to ensure that you could
 * visit every node.
 */

/** A tree where children are represented as an array */
export interface IndexedTreeType<T> {
  root: T;
  children: (x: T) => T[];
}
/** A tree where children are named */
export interface NamedTreeType<T> {
  root: T;
  children: (x: T) => Record<string, T>;
}

/** A union of both tree types. */
export type TreeType<T> = IndexedTreeType<T> | NamedTreeType<T>;
