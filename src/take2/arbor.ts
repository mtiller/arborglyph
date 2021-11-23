import {
  InheritedAttributeEvaluator,
  InheritedOptions,
  reifyInheritedAttribute,
} from "./kinds/inherited";
import {
  reifySyntheticAttribute,
  SyntheticAttributeEvaluator,
  SyntheticOptions,
} from "./kinds/synthetic";

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

/**
 * Walk the specified tree starting at node `cur`
 * @param cur Node we start walking from
 * @param tree The tree we are walking
 * @param f Function to evaluate at each node
 */
export function walkTree<T>(cur: T, list: ListChildren<T>, f: (x: T) => void) {
  f(cur);
  const children = list(cur);
  if (Array.isArray(children)) {
    /** If this is an indexed tree... */
    for (const child of children) {
      walkTree(child, list, f);
    }
  } else {
    /** If this tree has named children */
    for (const child of Object.entries(children)) {
      walkTree(child[1], list, f);
    }
  }
}

export function childrenOfNode<T>(list: ListChildren<T>, cur: T): Array<T> {
  const children = list(cur);
  return Array.isArray(children)
    ? children
    : Object.entries(children).map((x) => x[1]);
}

export interface ArborOptions<T> {
  // wrappers
  // inh (options, no R)
  // syn (options, no R)
}

/** A potentially convenient class, not sure what I think about it yet. */
export class Arbor<T extends object> {
  constructor(
    public root: T,
    public list: ListChildren<T>,
    opts: ArborOptions<T> = {}
  ) {}
  inh<R>(
    f: InheritedAttributeEvaluator<T, R>,
    opts: InheritedOptions<T, R> = {}
  ) {
    return reifyInheritedAttribute<T, R>(this.root, this.list, f, opts);
  }
  syn<R>(
    f: SyntheticAttributeEvaluator<T, R>,
    opts: SyntheticOptions<T, R> = {}
  ) {
    return reifySyntheticAttribute<T, R>(this.root, this.list, f, opts);
  }
}
