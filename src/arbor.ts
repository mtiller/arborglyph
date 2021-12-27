import { Attribute } from "./kinds/attributes";
import { AttributeDefinition } from "./kinds/definitions";
import { assertUnreachable } from "./utils";
import { ArborPlugin } from "./plugin";
import { Reifier } from "./reify/reifier";
import { StandardReifier } from "./reify/standard";
import { ArborEmitter, ArborMonitor, createEmitter } from "./events";
import { Maybe } from "purify-ts/Maybe";
import { ReificationOptions } from "./kinds/options";

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

export interface ArborOptions<T extends object> {
  immutable: boolean; // Whether modifications to the tree are allowed (default: true)
  plugins: ArborPlugin<T>[];
  reification: Partial<ReificationOptions>;
  reifier: Reifier<object>;
}

/** A potentially convenient class, not sure what I think about it yet. */
export class Arbor<T extends object> {
  protected reified: Map<AttributeDefinition<any, any>, Attribute<any, any>>;
  protected events: ArborEmitter<T> = createEmitter<T>();
  public readonly monitor: ArborMonitor<T> = this.events;
  public readonly root: T;
  public readonly parentAttr: Attribute<T, Maybe<T>>;
  protected options: ArborOptions<T>;
  constructor(
    root: T,
    public list: ListChildren<T>,
    opts: Partial<ArborOptions<T>> = {}
  ) {
    this.root = root;
    this.events.emit("created");
    this.reified = new Map();

    this.options = normalizeOptions(this, this.events, opts);
    this.events.emit("options", this.options.reification);

    // TODO: Any change in tree structure will require re-evaluating parent
    // attributes.
    this.parentAttr = this.options.reifier.parent(
      this.root,
      this.list,
      this.events
    );
  }
  attach<R>(f: (x: this) => R) {
    return f(this);
  }
  add<R>(
    def: AttributeDefinition<T, R>,
    opts?: Partial<ReificationOptions>,
    reifier?: Reifier<T>
  ): Attribute<T, R> {
    if (this.reified.has(def)) {
      return this.reified.get(def) as Attribute<T, R>;
    }
    switch (def.type) {
      case "syn": {
        const mergedPartialOptions = {
          ...this.options.reification,
          ...def.opts,
          ...opts,
        };
        reifier = reifier ?? this.options.reifier;
        const r: Attribute<T, R> = reifier.synthetic(
          this.root,
          this.list,
          def,
          this.events,
          mergedPartialOptions
        );
        this.reified.set(def, r);
        this.events.emit("added", def, r);
        return r;
      }
      case "inh": {
        const mergedPartialOptions = {
          ...this.options.reification,
          ...def.opts,
          ...opts,
        };
        reifier = reifier ?? this.options.reifier;

        const r = reifier.inherited(
          this.root,
          this.list,
          def,
          this.events,
          this.parentAttr,
          mergedPartialOptions
        );
        this.reified.set(def, r);
        this.events.emit("added", def, r);
        return r;
      }
      case "der": {
        // TODO: As attribute gets expanded, more will probably be needed here.
        const r = (x: T) => def.f(x);
        this.reified.set(def, r);
        this.events.emit("added", def, r);
        return r;
      }
      case "trans": {
        const attr = this.add(def.attr);
        const r = (x: T) => def.f(attr(x));
        this.reified.set(def, r);
        this.events.emit("added", def, r);
        return r;
      }
    }
    return assertUnreachable(def);
  }
}

function normalizeOptions<T extends object>(
  tree: Arbor<T>,
  events: ArborEmitter<T>,
  opts?: Partial<ArborOptions<T>>
): ArborOptions<T> {
  const plugins = opts?.plugins ?? [];
  plugins.forEach((plugin) => {
    plugin.connect ? plugin.connect(tree) : undefined;
    events.emit("connected", plugin);
  });
  const reifier = opts?.reifier ?? new StandardReifier();
  const reification = plugins.reduce(
    (cur, plugin) =>
      plugin.reificationOptions ? plugin.reificationOptions(cur) : cur,
    opts?.reification ?? {}
  );

  return {
    immutable: opts?.immutable ?? true,
    plugins: plugins,
    reification: reification,
    reifier: reifier,
  };
}
