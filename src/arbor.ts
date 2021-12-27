import { Attribute } from "./kinds/attributes";
import { AttributeDefinition } from "./kinds/definitions";
import { assertUnreachable } from "./utils";
import { ArborPlugin } from "./plugin";
import { Reifier } from "./reify/reifier";
import { StandardReifier } from "./reify/standard";
import {
  ArborEmitter,
  ArborMonitor,
  MutationEmitter,
  typedEmitter,
} from "./events";
import { Maybe } from "purify-ts/Maybe";
import { ReificationOptions } from "./kinds/options";
import { ListChildren } from "./children";

/**
 * These are options associated with the operation of an Arbor instance.
 */
export interface ArborOptions<T extends object> {
  /** Indicates the underlying tree is immutable (i.e., the nodes in the tree will never be changed) (default: true) */
  immutable: boolean;
  /** A list of potential plugins. (default: []) */
  plugins: ArborPlugin<T>[];
  /** Default reification options (if any) to be applied to all attributes (default: {}) */
  reification: Partial<ReificationOptions>;
  /** Default reifier for attributes in this tree. (default: `StandardReifier`) */
  reifier: Reifier<object>;
}

/**
 * The `Arbor` class is used to manage creation of attributes associated with a tree.
 * The `root` of the tree is provided along with a function, `list`.  Given any node
 * the tree, the `list` function should list all children associated with that node.
 * Finally, the `opts` argument allows any of the default `ArborOption` values
 * to be overriden.
 */
export class Arbor<T extends object> {
  /** The attribute that returns the parent of any node in the tree */
  protected parentAttr: Attribute<T, Maybe<T>>;
  /** A map of already reified attributes (and the definitions they were reified from) */
  protected reified = new Map<
    AttributeDefinition<any, any>,
    Attribute<any, any>
  >();
  /** An event emitter for tracking attributes (creation, invocation, etc.) */
  protected events: ArborEmitter<T> = typedEmitter();
  /** An event emitter for tracking events related to the tree and its structure */
  protected mutations: MutationEmitter<T> = typedEmitter();
  /** The (current) root of the tree */
  protected treeRoot: T;
  /** The options associated with this tree (with defaults filled in where necessary) */
  protected options: ArborOptions<T>;

  constructor(
    /** Initial tree root node */
    root: T,
    /** Function to provide children for any given node */
    public list: ListChildren<T>,
    /** Option overrides, if any */
    opts: Partial<ArborOptions<T>> = {}
  ) {
    /** Record initial root node */
    this.treeRoot = root;

    /** Normalize the options (fill in deafults) */
    this.options = normalizeOptions(this, this.events, opts);

    /**
     * Now that plugins are connected (via `normalizeOptions`), it makes sense
     * to start emitting events.
     */
    this.events.emit("initialized", this.options.reification);

    /** Set the initial root (this assignment keeps the compiler happy) */
    this.parentAttr = this.setRoot(root);

    /** Setup listener to handle future changes in root node */
    this.mutations.on("reroot", this.setRoot);
  }
  get root() {
    return this.treeRoot;
  }
  get monitor(): ArborMonitor<T> {
    return this.events;
  }
  get parent(): Attribute<T, Maybe<T>> {
    return this.parentAttr;
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
        reifier = reifier ?? this.options.reifier;
        const r: Attribute<T, R> = reifier.synthetic(
          this.treeRoot,
          this.list,
          def,
          this.events,
          this.completeOptions(def, opts)
        );
        this.reified.set(def, r);
        this.events.emit("added", def, r);
        return r;
      }
      case "inh": {
        reifier = reifier ?? this.options.reifier;

        const r = reifier.inherited(
          this.root,
          this.list,
          def,
          this.events,
          this.parentAttr,
          this.completeOptions(def, opts)
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
  protected completeOptions(
    def: AttributeDefinition<T, any>,
    opts?: Partial<ReificationOptions>
  ): Partial<ReificationOptions> {
    return {
      ...this.options.reification,
      ...def.opts,
      ...opts,
    };
  }
  protected setRoot(newroot: T) {
    this.treeRoot = newroot;
    /**
     * If this tree is immutable, we freeze it so that any modifications
     * trigger an exception.
     */
    if (this.options.immutable) {
      /** Recursively freeze everything in the tree */
      deepFreeze(newroot);
      this.mutations.on("mutation", () => {
        console.error("Mutation event issued for immutable tree!");
      });
    }
    this.parentAttr = this.options.reifier.parent(
      this.treeRoot,
      this.list,
      this.events
    );
    return this.parentAttr;
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

function deepFreeze(object: any) {
  // Retrieve the property names defined on object
  const propNames = Object.getOwnPropertyNames(object);

  // Freeze properties before freezing self

  for (const name of propNames) {
    const value = object[name];

    if (value && typeof value === "object") {
      deepFreeze(value);
    }
  }

  return Object.freeze(object);
}
