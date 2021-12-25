import { CommonInheritedOptions } from "./kinds/inherited";
import { CommonSyntheticOptions } from "./kinds/synthetic";
import { Attribute } from "./kinds/attributes";
import { AttributeDefinition } from "./kinds/definitions";
import { assertUnreachable } from "./utils";
import { ArborPlugin } from "./plugin";
import { Reifier } from "./reify/reifier";
import { StandardReifier } from "./reify/standard";
import { ArborEmitter, ArborMonitor, createEmitter } from "./events";

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
  plugins?: ArborPlugin<T>[];
  inheritOptions?: Partial<CommonInheritedOptions>;
  syntheticOptions?: Partial<CommonSyntheticOptions>;
  reifier?: Reifier<T>;
  // wrappers
}

/** A potentially convenient class, not sure what I think about it yet. */
export class Arbor<T extends object> {
  protected reified: Map<AttributeDefinition<any, any>, Attribute<any, any>>;
  public readonly monitor: ArborMonitor<T>;
  protected events: ArborEmitter<T>;
  public readonly root: T;
  protected plugins: ArborPlugin<T>[];
  protected reifier: Reifier<T>;
  constructor(
    root: T,
    public list: ListChildren<T>,
    protected opts: ArborOptions<T> = {}
  ) {
    this.root = root;
    this.events = createEmitter<T>();
    this.monitor = this.events;
    this.events.emit("created");
    this.plugins = opts.plugins ?? [];
    this.plugins.forEach((plugin) => {
      plugin.connect ? plugin.connect(this) : undefined;
      this.events.emit("connected", plugin);
    });
    this.reifier = opts.reifier ?? new StandardReifier();
    this.reified = new Map();

    this.opts.inheritOptions = this.plugins.reduce(
      (cur, plugin) =>
        plugin.inheritedOptions ? plugin.inheritedOptions(cur) : cur,
      opts.inheritOptions ?? {}
    );
    this.opts.syntheticOptions = this.plugins.reduce(
      (cur, plugin) =>
        plugin.syntheticOptions ? plugin.syntheticOptions(cur) : cur,
      opts.syntheticOptions ?? {}
    );
    this.events.emit(
      "options",
      this.opts.inheritOptions,
      this.opts.syntheticOptions
    );
  }
  attach<R>(f: (x: this) => R) {
    return f(this);
  }
  add<R>(
    def: AttributeDefinition<T, R>,
    reifier?: Reifier<T>
  ): Attribute<T, R> {
    if (this.reified.has(def)) {
      return this.reified.get(def) as Attribute<T, R>;
    }
    const plugins = this.plugins ?? [];
    switch (def.type) {
      case "syn": {
        const mergedPartialOptions = {
          ...this.opts.syntheticOptions,
          ...def.opts,
        };
        reifier = reifier ?? this.reifier;
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
          ...this.opts.inheritOptions,
          ...def.opts,
        };
        reifier = reifier ?? this.reifier;

        const r = this.reifier.inherited(
          this.root,
          this.list,
          def,
          this.events,
          null,
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
