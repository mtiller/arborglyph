import { Just, Maybe, Nothing } from "purify-ts/Maybe";
import { ScalarFunction } from "./attributes";
import { NodeNotFoundError } from "./errors";
import { TreeType, walkTree } from "./treetypes";

/** A parent function takes a given node and returns its parent, if it has one. */
export type ParentFunc<T> = (x: T) => Maybe<T>;

/** This is the information available when evaluating an inherited attribute. */
export interface InheritedArgs<T, R> {
  /** The node for which we are evaluating the attribute. */
  node: T;
  /** Information about the parent (if this node has a parent) */
  parent: Maybe<ParentInformation<T, R>>;
}

/**
 * An inherited attribute evaluator takes `InheritedArgs` as an argument and
 * returns the attribute value.
 **/
export type InheritedAttributeEvaluator<T, R> = (
  args: InheritedArgs<T, R>
) => R;
/** A parent attribute is a special case of an inherited attribute */
export type ParentAttribute<T> = InheritedAttributeEvaluator<T, Maybe<T>>;

/**
 * This is the information the inherited attribute evaluator is given about the
 * parent node **if it exists**.
 **/
export interface ParentInformation<T, R> {
  node: T;
  attr: () => R;
}

/** Options when reifying an inherited attribute */
export interface InheritedOptions<T> {
  p?: ParentFunc<T>;
  memoize?: "no" | "yes" | "pre";
}

/**
 * This is the function that takes a description of an inherited
 * attribute and returns an actual implementation capable of computing
 * the inherited attribute for any node in the tree.
 *
 * @param tree Tree we are associating this inherited attribute with
 * @param f The function that evaluates the inherited attribute
 * @param opts Various options we have when reifying
 * @returns
 */
export function reifyInheritedAttribute<T extends object, R>(
  tree: TreeType<T>,
  f: InheritedAttributeEvaluator<T, R>,
  opts: InheritedOptions<T> = {}
): ScalarFunction<T, R> {
  /** Check what level of memoization is requested */
  const memo = opts.memoize ?? "no";

  if (memo === "no") {
    /** Build a function that can compute our attribute */
    return baseInheritedAttributeCalculation(tree, f, opts.p);
  }

  /** If memoization is requested, first create storage for memoized values. */
  const storage = new WeakMap<T, R>();

  /**
   * Now create a special memoized wrapper that checks for memoized values and
   * caches any attributes actually evaluated.
   **/
  const mf: InheritedAttributeEvaluator<T, R> = (args) => {
    if (storage.has(args.node)) return storage.get(args.node) as R;
    const ret = f(args);
    storage.set(args.node, ret);
    return ret;
  };

  /** Create an attribute function using a memoizing attribute evaluator */
  const memoed = baseInheritedAttributeCalculation(tree, mf, opts.p);

  /* If precomputing of the attribute for all nodes was selected... */
  if (memo === "pre") {
    // Walk the tree and invoke the function for every child
    walkTree(tree.root, tree, memoed);
  }

  // Return the memoizing attribute function.
  return memoed;
}

/**
 * This is the basic function for computing an inherited attribute.
 * @param tree Tree we are associating the attribute with
 * @param f The function that evaluates the inherited attribute
 * @param p An optional "parent function" (to save searching the tree for `x`)
 * @returns A function that takes a node and returns the attribute value
 */
function baseInheritedAttributeCalculation<T, R>(
  tree: TreeType<T>,
  f: InheritedAttributeEvaluator<T, R>,
  p?: ParentFunc<T>
): ScalarFunction<T, R> {
  return (x: T): R => {
    /**
     * If a parent function was supplied, then this is very easy
     */
    if (p) {
      const information = parentInformation(x, p, f);
      return f({ node: x, parent: information });
    }

    /**
     * Otherwise (e.g., if the inherited attribute is meant to compute parents), then this is
     * a bit tricker
     **/
    const search = findNodeAnEvaluateInherited(tree, f, x, tree.root, Nothing);
    return search.caseOf({
      Nothing: () => {
        throw new NodeNotFoundError<T>(x, tree);
      },
      Just: (x) => x,
    });
  };
}

/**
 *
 * @param tree Tree we are associating the inherited attribute with
 * @param f The function that evaluates the inherited attribute
 * @param x The node for which we want the attribute evaluated
 * @param cur The current node in our search
 * @param parent The parent of the current node
 * @returns
 */
function findNodeAnEvaluateInherited<T, R>(
  tree: TreeType<T>,
  f: InheritedAttributeEvaluator<T, R>,
  x: T,
  cur: T,
  parent: Maybe<ParentInformation<T, R>>
): Maybe<R> {
  /** Construct a function to compute the attribute for the current node */
  const attr = () => f({ node: cur, parent: parent });

  /**
   * If we have found `x` (i.e., it is the current node), then evaluate
   * the attribute and return in wrapped in a `Just`.
   */
  if (x === cur) {
    return Just(attr());
  }

  /** Next consider all children of the current node */
  const children = tree.children(cur);

  /**
   * Construct the parent information for the current node (since the current
   * node will be the parent for its children).
   **/
  const information: ParentInformation<T, R> = {
    node: cur,
    attr: attr,
  };

  /** If the children are presented as an array... */
  if (Array.isArray(children)) {
    /** ...loop over them. */
    for (const child of children) {
      /** Call this function recursively to continue the search for `x` */
      const result = findNodeAnEvaluateInherited(
        tree,
        f,
        x,
        child,
        Just(information)
      );
      if (result.isJust()) {
        // I'd like to return result, but that doesn't work.
        return Just(result.extract());
      }
    }
  } else {
    /** If this tree has named children */
    for (const child of Object.entries(children)) {
      const result = findNodeAnEvaluateInherited(
        tree,
        f,
        x,
        child[1],
        Just(information)
      );
      if (result.isJust()) {
        // I'd like to return result, but that doesn't work.
        return Just(result.extract());
      }
    }
  }
  return Nothing;
}

/**
 * This function constructs information about a parent node.
 */
function parentInformation<T, R>(
  x: T,
  pf: ParentFunc<T>,
  f: InheritedAttributeEvaluator<T, R>
): Maybe<ParentInformation<T, R>> {
  return pf(x).map((parent) => {
    // This is called only if the node `x` has a parent.
    const attr = (): R => {
      const info = parentInformation(parent, pf, f);
      return f({ parent: info, node: x });
    };
    return { node: x, attr: attr };
  });
}
