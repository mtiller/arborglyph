import { DerivedEvaluator } from "./kinds/derived";
import { InheritedOptions, reifyInheritedAttribute } from "./kinds/inherited";
import {
  reifySyntheticAttribute,
  SyntheticAttributeEvaluator,
  SyntheticOptions,
} from "./kinds/synthetic";
import { Attribute } from "./kinds/attributes";
import { AttributeDefinition, AttributeEvaluator } from "./kinds/definitions";
import { assertUnreachable } from "./utils";
import { ArborPlugin } from "./plugin";
import { repmin } from "./former/attributes/testing/tree";

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
export interface EvaluationNotifications<T> {
  invocation(d: AttributeDefinition<T, any>, n: T): void;
  evaluation(d: Attribute<T, any>, n: T): void;
}

export interface ArborOptions<T> {
  plugins?: ArborPlugin<T>[];
  inheritOptions?: Partial<InheritedOptions<T>>;
  syntheticOptions?: Partial<SyntheticOptions>;
  // wrappers
  // inh (options, no R)
  // syn (options, no R)
}

/** A potentially convenient class, not sure what I think about it yet. */
export class Arbor<T extends object> {
  protected reified: Map<AttributeDefinition<any, any>, Attribute<any, any>>;
  public readonly root: T;
  protected plugins: ArborPlugin<T>[];
  protected notify: EvaluationNotifications<T>;
  constructor(
    root: T,
    public list: ListChildren<T>,
    protected opts: ArborOptions<T> = {}
  ) {
    this.plugins = opts.plugins ?? [];
    this.root = this.plugins.reduce(
      (r, p) => (p.remapRoot ? p.remapRoot(r) : r),
      root
    );
    this.reified = new Map();
    this.notify = {
      invocation: (d: AttributeDefinition<T, any>, n: T) => {
        this.plugins.forEach((p) => {
          if (p.recordInvocation) {
            p.recordInvocation(d, n);
          }
        });
      },
      evaluation: (a: Attribute<T, any>, n: T) => {
        this.plugins.forEach((p) => {
          if (p.recordEvaluation) {
            p.recordEvaluation(a, n);
          }
        });
      },
    };
  }
  attach<R>(f: (x: this) => R) {
    return f(this);
  }
  add<R>(d: AttributeDefinition<T, R>): Attribute<T, R> {
    if (this.reified.has(d)) {
      return this.reified.get(d) as Attribute<T, R>;
    }
    const plugins = this.plugins ?? [];
    const def = plugins.reduce((r, p) => (p.remapDef ? p.remapDef(r) : r), d);
    switch (def.type) {
      case "syn": {
        const popts = { ...this.opts.syntheticOptions, ...def.opts };
        const opts: SyntheticOptions = {
          memoize: popts.memoize ?? false,
        };
        const r = reifySyntheticAttribute<T, R>(
          def,
          this.root,
          this.list,
          def.f,
          this.notify,
          opts
        );
        this.reified.set(def, r);
        return plugins.reduce(
          (ret, p) => (p.remapAttr ? p.remapAttr(ret) : ret),
          r
        );
      }
      case "inh": {
        const popts = { ...this.opts.inheritOptions, ...def.opts };
        const opts: InheritedOptions<T> = {
          eager: popts.eager ?? true,
          p: popts.p ?? null,
          memoize: popts.memoize ?? true,
        };
        const r = reifyInheritedAttribute<T, R>(
          this.root,
          this.list,
          def,
          this.notify,
          opts
        );
        this.reified.set(def, r);
        return plugins.reduce(
          (ret, p) => (p.remapAttr ? p.remapAttr(ret) : ret),
          r
        );
      }
      case "der": {
        // TODO: As attribute gets expanded, more will probably be needed here.
        const r = (x: T) => def.f(x);
        this.reified.set(def, r);
        return plugins.reduce(
          (ret, p) => (p.remapAttr ? p.remapAttr(ret) : ret),
          r
        );
      }
      case "trans": {
        const attr = this.add(def.attr);
        const r = (x: T) => def.f(attr(x));
        this.reified.set(def, r);
        return plugins.reduce(
          (ret, p) => (p.remapAttr ? p.remapAttr(ret) : ret),
          r
        );
      }
    }
    return assertUnreachable(def);
  }
  // syn<R>(
  //   f: SyntheticAttributeEvaluator<T, R>,
  //   opts: SyntheticOptions<T, R> = {}
  // ): Attribute<T, R> {
  //   return reifySyntheticAttribute<T, R>(
  //     this.root,
  //     this.list,
  //     f,
  //     this.notify,
  //     opts
  //   );
  // }
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
