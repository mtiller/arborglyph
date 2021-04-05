import { TreeMap } from "../maps/treemap";
import {
  Attribute,
  AttributeConstructor,
  AttributeTypes,
  DefinedAttributes,
} from "./attributes";

/**
 * This class is responsible for annotating an underlying tree (`tree`)
 * with attributes.  For each attribute type, we first define the attribute
 * via an evaluation function and then we name it using the `named` method.
 * This "currying" was necessary to maximize the amount of type inferencing
 * possible which allow ambiguous attributes to be type annotated (without
 * triggering the need to annotate everything).
 */
export class ArborGlyph<T extends object, A extends AttributeTypes = {}> {
  /**
   * Manage a given tree with a set of attributes associated with it.  Normally,
   * this constructor is invoked with only the first argument and additional
   * attributes are added via the methods in this class.
   */
  constructor(
    protected tree: TreeMap<T>,
    protected attributes: DefinedAttributes<T, A> = {} as any,
    protected unique: Symbol = Symbol(),
    protected closed: boolean = false
  ) {}
  add<N extends string, R>(
    acon: AttributeConstructor<N, T, A, R>
  ): ArborGlyph<T, A & Record<N, R>> {
    if (this.closed)
      throw new Error(`Cannot add attributes to a closed ArborGlyph instance`);
    const deps: DefinedAttributes<T, A> = this.attributes;
    const attrs = acon<A>(this.tree, deps, deps);
    return new ArborGlyph(this.tree, attrs, this.unique, false);
  }
  /** All attributes currently associated with this `ArborGlyph` */
  get attrs(): Set<keyof A> {
    return new Set(Object.keys(this.attributes));
  }
  done() {
    const ret = new ArborGlyph(this.tree, this.attributes, this.unique, true);
    for (const node of ret.tree.nodes) {
      ret.anno(node);
    }
    return ret;
  }
  anno(n: T): T & A {
    /**
     * If this ArborGlyph hasn't already been closed, the
     * nodes cannot (yet) be annotated.
     */
    if (!this.closed)
      throw new Error(
        `Cannot annotate nodes until all attributes have been defined`
      );
    /**
     * This method is normally called just once for each node.  Each
     * subsequent time, we can just return the node since it has already
     * been annotated (as evidenced by the presence of the `unique` symbol)
     */
    if (n.hasOwnProperty(this.unique.valueOf())) {
      // Already annotated
      return n as T & A;
    }

    /**
     * If we get here, we are being asked to annotate a node
     * for the first time.
     */
    for (const [key, attr] of Object.entries(this.attributes)) {
      Object.defineProperty(n, key, {
        get: function () {
          return attr(n);
        },
      });
    }
    Object.defineProperty(n, this.unique.valueOf(), {
      get: function () {
        return true;
      },
    });

    return n as T & A;
  }

  /** Extract the underlying attribute */
  attr<K extends keyof A>(attr: K): Attribute<T, A[K]> {
    return this.attributes[attr];
  }
  /**
   * This method is useful in trying to understand what is going on with evaluation.
   * It traverses the tree and evaluates a given attribute for every node.
   * @param attr The attribute to visualize
   * @param cur Where to start (default is root of tree)
   * @param indent0 Initial indentation string
   * @param indent Successive indentation string
   */
  debug<N extends keyof A>(
    attr: N,
    cur = this.tree.root,
    indent0: string = "",
    indent: string = "  "
  ) {
    const val = this.attributes[attr](cur);
    console.log(`${indent0}${cur}: ${JSON.stringify(val)}`);
    const subprefix = indent0 + indent;
    for (const child of this.tree.children(cur)) {
      this.debug(attr, child, subprefix);
    }
  }
}
