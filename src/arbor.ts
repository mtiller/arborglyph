import { DerivedEvaluator } from "./kinds/derived";
import {
  InheritedOptions,
  InheritedReifier,
  ireifier,
  reifyInheritedAttribute,
} from "./kinds/inherited";
import {
  sreifier,
  SyntheticOptions,
  SyntheticReifier,
} from "./kinds/synthetic";
import { Attribute } from "./kinds/attributes";
import { AttributeDefinition } from "./kinds/definitions";
import { assertUnreachable } from "./utils";
import { ArborPlugin } from "./plugin";
import { Reifier } from "./plugins/reifier";

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
  invocation<R>(d: AttributeDefinition<T, R>, n: T, result: R): R;
  evaluation<R>(d: Attribute<T, R>, n: T, result: R): R;
}

export interface ArborOptions<T> {
  plugins?: ArborPlugin<T>[];
  inheritOptions?: Partial<InheritedOptions>;
  syntheticOptions?: Partial<SyntheticOptions>;
  reifier?: Reifier<T>;
  syntheticReifier?: SyntheticReifier<T>;
  inheritedReifier?: InheritedReifier<T>;
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
      invocation: <R>(d: AttributeDefinition<T, R>, n: T, result: R): R => {
        this.plugins.forEach((p) => {
          if (p.recordInvocation) {
            p.recordInvocation(d, n, result);
          }
        });
        return result;
      },
      evaluation: <R>(a: Attribute<T, any>, n: T, result: R) => {
        this.plugins.forEach((p) => {
          if (p.recordEvaluation) {
            p.recordEvaluation(a, n, result);
          }
        });
        return result;
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
    const def = plugins.reduce(
      (r, p) =>
        p.remapDef ? this.instrumentDefinition(p.remapDef(r, this.notify)) : r,
      this.instrumentDefinition(d)
    );
    switch (def.type) {
      case "syn": {
        const popts = { ...this.opts.syntheticOptions, ...def.opts };
        const opts: SyntheticOptions = {
          memoize: popts.memoize ?? false,
        };
        const reifier: SyntheticReifier<T> =
          this.opts.syntheticReifier ||
          this.opts.reifier?.synthetic ||
          sreifier(opts);
        const r = reifier(def, this.root, this.list, def.f);
        // const r = reifier(def, this.root, this.list, def.f)reifySyntheticAttribute<T, R>(
        //   def,
        //   this.root,
        //   this.list,
        //   def.f,
        //   opts
        // );
        this.reified.set(def, r);
        return this.instrumentAttribute(
          plugins.reduce((ret, p) => (p.remapAttr ? p.remapAttr(ret) : ret), r)
        );
      }
      case "inh": {
        const popts = { ...this.opts.inheritOptions, ...def.opts };
        const opts: InheritedOptions = {
          // TODO: Set this to false.  But for this to work, we need parent as a built-in
          // memoized, eagerly evaluated attribute because that's a precondition for having
          // lazily evaluated inherited attributes.
          eager: popts.eager ?? true,
          memoize: popts.memoize ?? true,
        };
        const reifier: InheritedReifier<T> =
          this.opts.inheritedReifier ||
          this.opts.reifier?.inherited ||
          ireifier(opts);

        const r = reifier(this.root, this.list, def, null);
        // const r = reifyInheritedAttribute<T, R>(
        //   this.root,
        //   this.list,
        //   def,
        //   null,
        //   opts
        // );
        this.reified.set(def, r);
        return this.instrumentAttribute(
          plugins.reduce((ret, p) => (p.remapAttr ? p.remapAttr(ret) : ret), r)
        );
      }
      case "der": {
        // TODO: As attribute gets expanded, more will probably be needed here.
        const r = (x: T) => def.f(x);
        this.reified.set(def, r);
        return this.instrumentAttribute(
          plugins.reduce((ret, p) => (p.remapAttr ? p.remapAttr(ret) : ret), r)
        );
      }
      case "trans": {
        const attr = this.add(def.attr);
        const r = (x: T) => def.f(attr(x));
        this.reified.set(def, r);
        return this.instrumentAttribute(
          plugins.reduce((ret, p) => (p.remapAttr ? p.remapAttr(ret) : ret), r)
        );
      }
    }
    return assertUnreachable(def);
  }
  protected instrumentAttribute<R>(attr: Attribute<T, R>): Attribute<T, R> {
    const ret = (n: T): R => this.notify.evaluation(ret, n, attr(n));
    return ret;
  }
  protected instrumentDefinition<R>(
    def: AttributeDefinition<T, R>
  ): AttributeDefinition<T, R> {
    switch (def.type) {
      case "syn": {
        const ret: typeof def = {
          ...def,
          f: (args) => this.notify.invocation(def, args.node, def.f(args)),
        };
        return ret;
      }
      case "inh": {
        const ret: typeof def = {
          ...def,
          f: (args) => this.notify.invocation(def, args.node, def.f(args)),
        };
        return ret;
      }
      case "der": {
        const ret: typeof def = {
          ...def,
          f: (n) => this.notify.invocation(def, n, def.f(n)),
        };
        return ret;
      }
      case "trans": {
        return def;
      }
    }
    return assertUnreachable(def);
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
