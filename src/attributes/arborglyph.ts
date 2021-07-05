import { TreeMap } from "../maps/treemap";
import {
  AttributeConstructor,
  AttributeTypes,
  DefinedAttributes,
} from "./attributes";

/**
 * This class is responsible for annotating an underlying tree (`tree`) with
 * attributes.  For each attribute type, we first define the attribute by its
 * name and associated evaluation function.
 *
 * Each attribute is defined simply by a function that ultimately adds an
 * attribute to the `attributes` collection.  Once the ArborGlyph class is closed
 * via the `done` method, all nodes in the tree are annotated with the additional
 * attributes as (getter properties).
 */
export class ArborGlyph<T extends object, A extends AttributeTypes = {}> {
  /**
   * Manage a given tree with a set of attributes associated with it.  Normally,
   * this constructor is invoked with only the first argument and additional
   * attributes are added via the methods in this class.  Once each attribute
   * is added (or when the ArborGlyph is closed), a new ArborGlyph instance
   * (with updated attributes) is created.
   */
  constructor(
    protected tree: TreeMap<T>,
    protected attributes: DefinedAttributes<T, A> = {} as any,
    protected unique: Symbol = Symbol(),
    protected closed: boolean = false
  ) {}

  /**
   * This method is used to add attributes.  This method is agnostic as to
   * the kind of attribute (inherited, synthetic, etc).  This is because how
   * each attribute is evaluated is _external_ this this method and encapsulated
   * in the provided `AttributeConstructor` function.
   *
   * @param acon The function to construct a new `attributes` value.
   * @returns A new `ArborGlyph` with the additional attribute included.
   */
  add<N extends string, R>(
    acon: AttributeConstructor<N, T, A, R>
  ): ArborGlyph<T, A & Record<N, R>> {
    if (this.closed)
      throw new Error(`Cannot add attributes to a closed ArborGlyph instance`);
    const deps: DefinedAttributes<T, A> = this.attributes;
    const attrs = acon<A>(this.tree, deps, deps);
    return new ArborGlyph(this.tree, attrs, this.unique, false);
  }

  /** The names of all attributes currently associated with this `ArborGlyph` */
  get attrs(): Set<keyof A> {
    return new Set(Object.keys(this.attributes));
  }

  /**
   * This method is invoked once all attributes have been added
   * to the ArborGlyph.  At that point, the tree is annotated with
   * the attributes defined here (by adding new getter properties
   * to each node).
   *
   * @returns A new, closed ArborGlyph
   */
  done() {
    const ret = new ArborGlyph(this.tree, this.attributes, this.unique, true);
    for (const node of ret.tree.nodes) {
      ret.annotateNode(node);
    }
    return ret;
  }

  /**
   * Redo the steps normally performaed when the ArborGlyph is marked as `done`.
   * This is done in response to topology changes.
   **/
  reannotate(from: T) {
    this.tree.rewalk(from)
    for (const node of this.tree.nodes) {
      if (node.hasOwnProperty(this.unique.valueOf())) continue;
      this.annotateNode(node);
    }
  }

  /**
   * This method returns the "annotated" version of the given node.  Assuming the
   * `ArborGlyph` is closed (which this method checks), the node has already been
   * annotated with all attributes.  As a result, this method doesn't need to
   * actually do anything except a type cast.
   *
   * @param n The node to "annotate"
   * @returns Version of the node with attributes defined
   */
  anno(n: T): T & A {
    if (!this.closed)
      throw new Error(
        `Cannot annotate nodes until all attributes have been defined`
      );
      if (n.hasOwnProperty(this.unique.valueOf())) return n as T & A;
      throw new Error(`Node is not annotated.  Did you make a topological change and forget to run 'redo()?'`)
  }

  /**
   * This method is the method that actually does the node annotation.  It
   * does this be adding additional getter properties to the specified node.
   * @param n Node to annotate
   */
  protected annotateNode(n: T): void {
    /**
     * If this ArborGlyph hasn't already been closed, the
     * nodes cannot (yet) be annotated.
     */
    if (!this.closed)
      throw new Error(
        `Cannot annotate nodes until all attributes have been defined`
      );
    /**
     * This method is normally called just once for each node.  This
     * detects if the same node has already been annotated **by this
     * `ArborGlyph`**.
     */
    if (n.hasOwnProperty(this.unique.valueOf())) {
      throw new Error(
        `Found a node that has already been annotated even though the ArborGlyph was just closed (duplicate?)`
      );
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

    /**
     * We add this property so we know the node has been annotated
     * (**by this ArborGlyph**).
     */
    Object.defineProperty(n, this.unique.valueOf(), {
      get: function () {
        return true;
      },
    });
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
