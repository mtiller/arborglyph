import { DerivedEvaluator } from "./kinds/derived";
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
import { Attribute } from "./kinds/attributes";
import { AttributeDefinition } from "./kinds/definitions";
import { assertUnreachable } from "./utils";

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

export interface ArborOptions<T> {
  // wrappers
  // inh (options, no R)
  // syn (options, no R)
}

/** A potentially convenient class, not sure what I think about it yet. */
export class Arbor<T extends object> {
  protected reified: Map<AttributeDefinition<any, any>, Attribute<any, any>>;
  constructor(
    public root: T,
    public list: ListChildren<T>,
    opts: ArborOptions<T> = {}
  ) {
    this.reified = new Map();
  }
  add<R>(def: AttributeDefinition<T, R>): Attribute<T, R> {
    if (this.reified.has(def)) {
      return this.reified.get(def) as Attribute<T, R>;
    }
    switch (def.type) {
      case "syn": {
        const r = reifySyntheticAttribute<T, R>(
          this.root,
          this.list,
          def.f,
          {}
        );
        this.reified.set(def, r);
        return r;
      }
      case "inh": {
        const r = reifyInheritedAttribute<T, R>(
          this.root,
          this.list,
          def.f,
          {}
        );
        this.reified.set(def, r);
        return r;
      }
      case "der": {
        // TODO: As attribute gets expanded, more will probably be needed here.
        const ret = (x: T) => def.f(x);
        this.reified.set(def, ret);
        return ret;
      }
      case "trans": {
        const attr = this.add(def.attr);
        const ret = (x: T) => def.f(attr(x));
        this.reified.set(def, ret);
        return ret;
      }
    }
    return assertUnreachable(def);
  }
  inh<R>(
    f: InheritedAttributeEvaluator<T, R>,
    opts: InheritedOptions<T, R> = {}
  ): Attribute<T, R> {
    return reifyInheritedAttribute<T, R>(this.root, this.list, f, opts);
  }
  syn<R>(
    f: SyntheticAttributeEvaluator<T, R>,
    opts: SyntheticOptions<T, R> = {}
  ): Attribute<T, R> {
    return reifySyntheticAttribute<T, R>(this.root, this.list, f, opts);
  }
  // There are no options here mainly because memoization probably isn't useful.
  der<R>(f: DerivedEvaluator<T, R>): Attribute<T, R> {
    // TODO: As attribute gets expanded, more will probably be needed here.
    return (x: T) => f(x);
  }
}

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
