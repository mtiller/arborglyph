/**
 * This file contains a couple different ways to represent a tree.  It is
 * worth noting that these are all "top down".  This is really the only
 * practical representation because a bottom up tree isn't really traversable
 * because you'd have to know all the leaves in order to ensure that you could
 * visit every node.
 */

export type IndexedChildren<T> = (x: T) => T[];
export type NamedChildren<T> = (x: T) => Record<string, T>;
export type ListChildren<T> = IndexedChildren<T> | NamedChildren<T>;
