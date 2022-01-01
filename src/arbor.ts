import { Attribute } from "./kinds/attributes";
import { AttributeDefinition } from "./kinds/definitions";
import { assertUnreachable, walkTree } from "./utils";
import { ArborPlugin } from "./plugin";
import { Reifier } from "./reify/reifier";
import { StandardReifier } from "./reify/standard";
import {
  ArborEmitter,
  ArborMonitor,
  MutationEmitter,
  MutationMonitor,
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
  protected parentAttr!: Attribute<T, Maybe<T>>;
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

    this.parentAttr = this.options.reifier.parent(
      this.treeRoot,
      this.list,
      this.mutations
    );

    /** Set the initial root */
    this.setRoot(root);
  }
  /** The current root of the tree */
  get root() {
    return this.treeRoot;
  }
  /** Use this to subscribe to attribute related events */
  get eventMonitor(): ArborMonitor<T> {
    return this.events;
  }
  get mutationMonitor(): MutationMonitor<T> {
    return this.mutations;
  }
  /** An attribute for retrieving the parent of any node in the tree */
  get parent(): Attribute<T, Maybe<T>> {
    return this.parentAttr;
  }
  /** Use `attach` to perform bulk operations on the `Arbor` instance using a function. */
  attach<R>(f: (x: this) => R) {
    return f(this);
  }
  /**
   * Add an attribute to the tree by providing a definition of the attribute and (optionally)
   * any reification options or even a custom reifier.
   **/
  add<R>(
    def: AttributeDefinition<T, R>,
    opts?: Partial<ReificationOptions>,
    reifier?: Reifier<T>
  ): Attribute<T, R> {
    /** Check if this definition was already reified. */
    if (this.reified.has(def)) {
      return this.reified.get(def) as Attribute<T, R>;
    }

    /** Use default reifier if one wasn't provided. */
    reifier = reifier ?? this.options.reifier;

    /** Based on the type of attribute, we reify things differently */
    switch (def.type) {
      case "syn": {
        const r: Attribute<T, R> = reifier.synthetic(
          this.treeRoot,
          this.list,
          def,
          this.events,
          this.mutations,
          this.completeOptions(def, opts)
        );
        this.reified.set(def, r);
        this.events.emit("added", def as any, r);
        return r;
      }
      case "inh": {
        const r = reifier.inherited(
          this.root,
          this.list,
          def,
          this.events,
          this.mutations,
          this.parentAttr,
          this.completeOptions(def, opts)
        );
        this.reified.set(def, r);
        this.events.emit("added", def as any, r);
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
  /**
   * This is a helper function that overlays various partial options
   * on top of each other.  The result is still partial, but it represents
   * the relative priority of the various ways to override the options.
   */
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
  public invalidateAttribute(d: AttributeDefinition<T, any>): void {
    this.mutations.emit("invalidateAttribute", d);
  }
  /**
   * This method should be called for a mutable tree when an update has been
   * made to a given node.
   *
   * @param n
   */
  public update<N extends T>(n: N): void {
    this.performInvalidation(n);
    this.mutations.emit("finalize");
  }

  protected performInvalidation(n: T) {
    /** These will be the sets of synthetic and inherited attributes that need their caches invalidated. */
    const synthetics: Set<T> = new Set();
    const inherited: Set<T> = new Set();

    /** The updated node is in both sets */
    synthetics.add(n);
    inherited.add(n);

    /** Walk the tree and add all children to the inherited set */
    walkTree(n, this.list, (x) => inherited.add(x));

    /** Iterate over all parents and invalidate any synthetic attributes. */
    for (
      let cur = this.parentAttr(n);
      cur.isJust();
      cur = cur.chain(this.parentAttr)
    ) {
      cur.map((x) => synthetics.add(x));
    }

    /** Now invalidate the cache entries */
    this.mutations.emit("invalidate", synthetics, inherited);
  }
  /**
   * This method is used to change the root of the tree
   *
   * @param newroot The new root of the tree
   * @returns The new parent attribute
   */
  public setRoot(newroot: T) {
    this.performInvalidation(this.treeRoot);
    this.treeRoot = newroot;
    /**
     * If this tree is immutable, we freeze it so that any modifications
     * trigger an exception.
     */
    if (this.options.immutable) {
      /** Recursively freeze everything in the tree */
      deepFreeze(newroot);
    }

    /** Inform anybody who is interested that we have rerooted the tree */
    this.mutations.emit("reroot", this.treeRoot);
    this.mutations.emit("finalize");
  }
}

/**
 * This function takes a `Partial` instance of `ArborOptions` and
 * normalizes it with default values to create a non-`Partial` version.
 *
 * @param tree The `Arbor` instance
 * @param events An `EventEmitter`
 * @param opts Any `ArborOptions` overrides
 * @returns
 */
function normalizeOptions<T extends object>(
  tree: Arbor<T>,
  events: ArborEmitter<T>,
  opts?: Partial<ArborOptions<T>>
): ArborOptions<T> {
  /** Formulate the list of plugins (insert default if necessary) */
  const plugins = opts?.plugins ?? [];

  /** Iterate over plugins and connect them to the `Arbor` instance */
  plugins.forEach((plugin) => {
    plugin.connect ? plugin.connect(tree) : undefined;
    events.emit("connected", plugin);
  });

  /** Determine the reifier to be used (injecting default if necessary) */
  const reifier = opts?.reifier ?? new StandardReifier();

  /**
   * Iterate over plugins and process any "overrides" they might wish to
   * inject into the reification options.
   */
  const reification = plugins.reduce(
    (cur, plugin) =>
      plugin.reificationOptions ? plugin.reificationOptions(cur) : cur,
    opts?.reification ?? {}
  );

  /** Return the resulting complete, concrete options. */
  return {
    immutable: opts?.immutable ?? true,
    plugins: plugins,
    reification: reification,
    reifier: reifier,
  };
}

/**
 * Perform a recursive freeze of all nodes in the tree.
 * @param object The root of the tree to freeze
 * @returns void
 */
function deepFreeze(object: any): void {
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
