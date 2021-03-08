import { TreeMap } from "../maps/treemap";
import { Attribute, AttributeTypes, DefinedAttributes } from "./attributes";
import { derivedAttribute, DerivedFunction, DerivedOptions } from "./derived";
import {
  inheritedAttribute,
  InheritedFunction,
  InheritedOptions,
} from "./inherited";
import {
  syntheticAttribute,
  SyntheticFunction,
  SyntheticOptions,
} from "./synthetic";

/**
 * This class is responsible for annotating an underlying tree (`tree`)
 * with attributes.  For each attribute type, we first define the attribute
 * via an evaluation function and then we name it using the `named` method.
 * This "currying" was necessary to maximize the amount of type inferencing
 * possible which allow ambiguous attributes to be type annotated (without
 * triggering the need to annotate everything).
 */
export class ArborGlyph<T, A extends AttributeTypes> {
  /**
   * Manage a given tree with a set of attributes associated with it.  Normally,
   * this constructor is invoked with only the first argument and additional
   * attributes are added via the methods in this class.
   */
  constructor(
    protected tree: TreeMap<T>,
    protected attributes: DefinedAttributes<A> = {} as any
  ) {}
  /**
   * This is the first step in creating a synthetic attribute.  Synthetic attributes are
   * attributes that depend only on the contents of the node and the value of *this* attribute
   * associated with each child.  Note, any given attribute can depend on the value of
   * *any* previously defined attributes for any node in the tree.
   * @param f synthetic attribute evaluation function
   * @param options
   * @returns
   */
  synthetic<R>(f: SyntheticFunction<T, A, R>, options: SyntheticOptions = {}) {
    const attr = syntheticAttribute<T, A, R>(
      f,
      this.tree,
      this.attributes,
      options.memoize ?? true
    );
    return this.deferNaming(this.attributes, attr, this.tree);
  }
  /**
   * This creates a derived attribute.  A derived attribute is one that simply depends on
   * the information contained in the node itself and any previously defined attributes.
   * @param f
   * @param options
   * @returns
   */
  derived<R>(f: DerivedFunction<T, A, R>, options: DerivedOptions = {}) {
    const attr = derivedAttribute<T, A, R>(
      f,
      this.tree,
      this.attributes,
      options.memoize ?? true
    );
    return this.deferNaming(this.attributes, attr, this.tree);
  }
  /**
   * This is the first step in creating an inherited attribute.  Inherited attributes are
   * attributes that depend only on the contents of the node and the value of *this* attribute
   * on the parent node (if it exists).  Note, any given attribute can depend on the value of
   * *any* previously defined attributes for any node in the tree.
   * @param f synthetic attribute evaluation function
   * @param options
   * @returns
   */
  inherited<R>(f: InheritedFunction<T, A, R>, options: InheritedOptions = {}) {
    const attr = inheritedAttribute<T, A, R>(
      f,
      this.tree,
      this.attributes,
      options.memoize ?? true
    );
    return this.deferNaming<R>(this.attributes, attr, this.tree);
  }
  /** All attributes currently associated with this `ArborGlyph` */
  get attrs(): Set<keyof A> {
    return new Set(Object.keys(this.attributes));
  }
  /** Request the value of an attribute on a given node id */
  query<N extends keyof A>(attr: N, nid: string): A[N] {
    return this.attributes[attr](nid);
  }
  /** Request the value of an attribute on a given node */
  queryNode<N extends keyof A>(attr: N, n: T): A[N] {
    return this.tree
      .find(n)
      .map((nid) => this.attributes[attr](nid))
      .orDefaultLazy(() => {
        throw new Error(`Specified node does not exist in the tree`);
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

  /**
   * This is a helper method that takes a given, already formulated attribute,
   * and returns an object with a single method `named` that, when executed,
   * injects that attribute into an existing set of attributes and then creates
   * an ArborGlyph with the new attribute in it.
   * @param attributes
   * @param attr
   * @param map
   * @returns
   */
  private deferNaming<R>(
    attributes: DefinedAttributes<A>,
    attr: Attribute<R>,
    map: TreeMap<T>
  ) {
    return {
      named: <N extends string>(n: N) => {
        const attrs: DefinedAttributes<A & Record<N, R>> = {
          ...attributes,
          [n]: attr,
        };
        return new ArborGlyph(map, attrs);
      },
    };
  }
}
