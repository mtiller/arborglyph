import { childrenOfNode, ListChildren, walkTree } from "../arbor";
import { NodeNotFoundError } from "../errors";
import { Attribute } from "../kinds/attributes";
import { InheritedAttributeDefinition } from "../kinds/definitions";
import {
  CommonInheritedOptions,
  InheritedAttributeEvaluator,
  ParentFunc,
  ParentInformation,
} from "../kinds/inherited";
import { Just, Maybe, Nothing } from "purify-ts/Maybe";

/**
 * This is the function that takes a description of an inherited
 * attribute and returns an actual implementation capable of computing
 * the inherited attribute for any node in the tree.
 *
 * @param tree Tree we are associating this inherited attribute with
 * @param evaluator The function that evaluates the inherited attribute
 * @param opts Various options we have when reifying
 * @returns
 */
export function reifyInheritedAttribute<T extends object, R>(
  root: T,
  list: ListChildren<T>,
  def: InheritedAttributeDefinition<T, R>,
  p: ParentFunc<T> | null,
  opts: CommonInheritedOptions
): Attribute<T, R> {
  /** Check what level of memoization is requested */
  const memo = opts.memoize;
  const eager = opts.eager;

  if (memo) {
    /** If memoization is requested, first create storage for memoized values. */
    const storage = new WeakMap<T, R>();

    /**
     * Now create a special memoized wrapper that checks for memoized values and
     * caches any attributes actually evaluated.
     **/
    const memoizeEvaluator: InheritedAttributeEvaluator<T, R> = (args) => {
      if (storage.has(args.node)) return storage.get(args.node) as R;
      const ret = def.f(args);
      storage.set(args.node, ret);
      return ret;
    };

    /** Create an attribute function using a memoizing attribute evaluator */
    const memoed = baseInheritedAttributeCalculation(
      root,
      list,
      memoizeEvaluator,
      p
    );

    /* If precomputing of the attribute for all nodes was selected... */
    // TODO: Defer this until the very first time the attribute is evaluated? (e.g., lazier)
    if (eager) {
      // Walk the tree and invoke the function for every child
      walkTree(root, list, memoed);
    }

    // Return the memoizing attribute function.
    return memoed;
  }

  const evaluator: InheritedAttributeEvaluator<T, R> = def.f;

  /** Build a function that can compute our attribute but doesn't use caching */
  return baseInheritedAttributeCalculation(root, list, evaluator, p);
}

/**
 * This is the basic function for computing an inherited attribute.
 * @param tree Tree we are associating the attribute with
 * @param f The function that evaluates the inherited attribute
 * @param p An optional "parent function" (to save searching the tree for `x`)
 * @returns A function that takes a node and returns the attribute value
 */
function baseInheritedAttributeCalculation<T, R>(
  root: T,
  list: ListChildren<T>,
  f: InheritedAttributeEvaluator<T, R>,
  p: ParentFunc<T> | null
): Attribute<T, R> {
  return (x: T): R => {
    /**
     * If a parent function was supplied, then this is very easy
     */
    if (p !== null) {
      const information = parentInformation(x, p, f);
      return f({ node: x, parent: information });
    }

    /**
     * Otherwise (e.g., if the inherited attribute is meant to compute parents), then this is
     * a bit tricker
     **/
    const search = findNodeAnEvaluateInherited(root, list, f, x, root, Nothing);
    return search.caseOf({
      Nothing: () => {
        throw new NodeNotFoundError<T>(x, root);
      },
      Just: (x) => x,
    });
  };
}

/**
 * This function searches the tree for node `x` and once it finds it, it
 * evaluates the inherited attribute for it.
 *
 * @param tree Tree we are associating the inherited attribute with
 * @param f The function that evaluates the inherited attribute
 * @param x The node for which we want the attribute evaluated
 * @param cur The current node in our search
 * @param parent The parent of the current node
 * @returns
 */
function findNodeAnEvaluateInherited<T, R>(
  root: T,
  list: ListChildren<T>,
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
  const children = childrenOfNode(list, cur);

  /**
   * Construct the parent information for the current node (since the current
   * node will be the parent for its children).
   **/
  const information: ParentInformation<T, R> = {
    node: cur,
    get attr() {
      return attr();
    },
  };

  for (const child of children) {
    /** Call this function recursively to continue the search for `x` */
    const result = findNodeAnEvaluateInherited(
      root,
      list,
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
    return {
      node: x,
      get attr() {
        return attr();
      },
    };
  });
}
