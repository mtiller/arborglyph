import { TreeMap } from "../maps/treemap";
import {
  Attribute,
  AttributeConstructor,
  AttributeTypes,
  DefinedAttributes,
  ExtendedBy,
} from "./attributes";
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
export class ArborGlyph<T extends object, A extends AttributeTypes = {}> {
  /**
   * Manage a given tree with a set of attributes associated with it.  Normally,
   * this constructor is invoked with only the first argument and additional
   * attributes are added via the methods in this class.
   */
  constructor(
    protected tree: TreeMap<T>,
    protected attributes: DefinedAttributes<A> = {} as any,
    protected unique: Symbol = Symbol()
  ) {}
  add<N extends string, R>(
    acon: AttributeConstructor<N, T, A, R>
  ): ArborGlyph<T, A & Record<N, R>> {
    const deps: DefinedAttributes<A> = this.attributes;
    const attrs = acon<A>(this.tree, deps, deps);
    return new ArborGlyph(this.tree, attrs, this.unique);
  }
  /**
   * This is the first step in creating a synthetic attribute.  Synthetic attributes are
   * attributes that depend only on the contents of the node and the value of *this* attribute
   * associated with each child.  Note, any given attribute can depend on the value of
   * *any* previously defined attributes for any node in the tree.
   * @param f synthetic attribute evaluation function
   * @param options
   * @returns
   */
  synthetic<N extends string, R>(
    name: N,
    f: SyntheticFunction<T, A, R>,
    options: SyntheticOptions = {}
  ) {
    const attr = syntheticAttribute<T, A, R>(
      f,
      this.tree,
      this.attributes,
      options.memoize ?? true
    );
    const attrs: DefinedAttributes<A & Record<N, R>> = {
      ...this.attributes,
      [name]: attr,
    };
    return new ArborGlyph(this.tree, attrs, this.unique);
  }

  synthetic2<R>(f: SyntheticFunction<T, A, R>, options: SyntheticOptions = {}) {
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
  anno(n: T): T & A {
    const nid = this.tree.find(n);
    if (nid.isNothing())
      throw new Error(`Node cannot be annotated, it isn't in the tree`);
    const id = nid.unsafeCoerce();
    if (n.hasOwnProperty(this.unique.valueOf())) {
      // Already annotated
      return n as T & A;
    }
    for (const [key, attr] of Object.entries(this.attributes)) {
      Object.defineProperty(n, key, {
        get: function () {
          return attr(id);
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
  proxy(n: T): T {
    if ((n as any)[this.unique.valueOf()] !== undefined) {
      console.log("Was already a proxy!");
      return n;
    }
    return new Proxy<T>(n, {
      get: (target, prop, receiver) => {
        /** The 'unique' property reveals the underlying target */
        if (prop === this.unique.valueOf()) return target;
        /**
         * Check if the property is a string (attributes
         * are named only by strings)
         **/
        if (typeof prop === "string") {
          /**
           * Find the id for the given target (if it exists
           * in the tree at all)
           **/
          const n = this.tree.find(target);
          if (n.isJust() && this.attributes.hasOwnProperty(prop)) {
            /** If it exists, extract the named attribute */
            const attr = this.attributes[prop];
            if (attr !== undefined) {
              /**
               * If the attribute exists (and the id exists),
               * then evaluate the attribute and return the
               * result.
               **/
              const nid = n.unsafeCoerce();
              return attr(nid);
            }
          }
        }
        /**
         * This isn't an attribute, so use the Reflect API to get
         * the result of a 'get' on this target.
         */
        const possibleChild = Reflect.get(target, prop, receiver);

        /** If this isn't an object, then it cannot be a child. */
        if (typeof possibleChild !== "object") return possibleChild;

        /** Check to see if this is a child (exists in the tree)... */
        const child = this.tree.find(possibleChild);
        return child
          .map((c) => this.proxy(possibleChild)) // If so, return a proxy around it.
          .orDefault(possibleChild); // If not, just return its normal value.
      },
      set: (obj, prop, value) => {
        return Reflect.set(obj, prop, value);
      },
    });
  }

  /**  */
  find(n: T) {
    const base = (n as any)[this.unique.valueOf()] ?? n;
    if (this.tree.contains(base)) return this.proxy(n);
  }

  /** Extract the underlying attribute */
  attr<K extends keyof A>(attr: K): Attribute<A[K]> {
    return this.attributes[attr];
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
        return new ArborGlyph(map, attrs, this.unique);
      },
    };
  }
}
