import { ListChildren } from "../arbor";
import { Attribute } from "../kinds/attributes";
import { InheritedAttributeDefinition } from "../kinds/definitions";
import {
  CommonInheritedOptions,
  InheritedAttributeEvaluator,
  ParentFunc,
  ParentInformation,
} from "../kinds/inherited";
import { Just, Maybe, Nothing } from "purify-ts/Maybe";
import { ArborEmitter } from "../events";
import { CacheStorage } from "../kinds/cache";
import { childrenOfNode, walkTree } from "../utils";

/**
 * A special function used to reify the parent.  This follows a special procedure
 * since it doesn't have a priori parent information so it must be evaluated eagerly
 * and for the entire tree.
 */
export function reifyParent<T extends object>(
  root: T,
  list: ListChildren<T>,
  emitter: ArborEmitter<T>
): Attribute<T, Maybe<T>> {
  const parentCache = new WeakMap<T, Maybe<T>>();
  walkTree(root, list, (n: T, parent: Maybe<T>) => {
    parentCache.set(n, parent);
  });
  return (x: T): Maybe<T> => {
    const p = parentCache.get(x);
    if (p) return p;
    throw new Error("No parent entry found for node");
  };
}

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
export function reifyInheritedAttribute<T extends object, DR, R>(
  root: T,
  list: ListChildren<T>,
  def2: InheritedAttributeDefinition<T, DR>,
  f: InheritedAttributeEvaluator<T, R>,
  emitter: ArborEmitter<T>,
  p: ParentFunc<T>,
  opts: CommonInheritedOptions
): Attribute<T, R> {
  /** Check whether this attribute should be eagerly (vs. lazily) evaluated. */
  const eager = opts.eager;
  /**
   * If we are doing eager evaluation, we want memoization...otherwise we are just
   * throwing calculations away.
   */
  const memo = opts.memoize || eager;

  /** The only time `p` should be null is when we compute parents and in that case, it needs to be eager */
  if (p === null && !eager) throw new Error("Cannot compute parents lazily");

  if (memo) {
    /** If memoization is requested, first create storage for memoized values. */
    const storage = opts.cacheProvider() as CacheStorage<T, R>;

    /**
     * Now create a special memoized wrapper that checks for memoized values and
     * caches any attributes actually evaluated.
     **/
    const memoizeEvaluator: InheritedAttributeEvaluator<T, R> = (args) => {
      if (storage.has(args.node)) return storage.get(args.node) as R;
      const ret = f(args);
      /**
       * Record this **Before** calling emit because the emitter may trigger
       * other evaluations (because of stringifyNode + path attribute, for example).
       * So record this first.
       */
      storage.set(args.node, ret);
      emitter.emit(
        "invocation",
        def2 as InheritedAttributeDefinition<T, unknown>,
        args.node,
        ret
      );
      return ret;
    };

    /** Create an attribute function using a memoizing attribute evaluator */
    const memoed = baseInheritedAttributeCalculation(memoizeEvaluator, p);

    /* If precomputing of the attribute for all nodes was selected... */
    if (eager) {
      // Walk the tree and invoke the function for every child
      walkTree(root, list, memoed);
    }

    // Return the memoizing attribute function.
    return memoed;
  }

  const evaluator: InheritedAttributeEvaluator<T, R> = (args) => {
    const ret = f(args);
    emitter.emit(
      "invocation",
      def2 as InheritedAttributeDefinition<T, unknown>,
      args.node,
      ret
    );
    return ret;
  };

  /** Build a function that can compute our attribute but doesn't use caching */
  return baseInheritedAttributeCalculation(evaluator, p);
}

/**
 * This is the basic function for computing an inherited attribute.
 * @param tree Tree we are associating the attribute with
 * @param f The function that evaluates the inherited attribute
 * @param p An optional "parent function" (to save searching the tree for `x`)
 * @returns A function that takes a node and returns the attribute value
 */
function baseInheritedAttributeCalculation<T, R>(
  f: InheritedAttributeEvaluator<T, R>,
  p: ParentFunc<T>
): Attribute<T, R> {
  const ret = (x: T): R => {
    /**
     * If a parent function was supplied, then this is very easy
     */
    const information = parentInformation(x, p, ret);
    return f({ node: x, parent: information });
  };
  return ret;
}

// /**
//  * This function searches the tree for node `x` and once it finds it, it
//  * evaluates the inherited attribute for it.
//  *
//  * @param tree Tree we are associating the inherited attribute with
//  * @param f The function that evaluates the inherited attribute
//  * @param x The node for which we want the attribute evaluated
//  * @param cur The current node in our search
//  * @param parent The parent of the current node
//  * @returns
//  */
// function findNodeAnEvaluateInherited<T, R>(
//   root: T,
//   list: ListChildren<T>,
//   f: InheritedAttributeEvaluator<T, R>,
//   x: T,
//   cur: T,
//   parent: Maybe<ParentInformation<T, R>>
// ): Maybe<R> {
//   /** Construct a function to compute the attribute for the current node */
//   const attr = () => f({ node: cur, parent: parent });

//   /**
//    * If we have found `x` (i.e., it is the current node), then evaluate
//    * the attribute and return in wrapped in a `Just`.
//    */
//   if (x === cur) {
//     return Just(attr());
//   }

//   /** Next consider all children of the current node */
//   const children = childrenOfNode(list, cur);

//   /**
//    * Construct the parent information for the current node (since the current
//    * node will be the parent for its children).
//    **/
//   const information: ParentInformation<T, R> = {
//     node: cur,
//     get attr() {
//       return attr();
//     },
//   };

//   for (const child of children) {
//     /** Call this function recursively to continue the search for `x` */
//     const result = findNodeAnEvaluateInherited(
//       root,
//       list,
//       f,
//       x,
//       child,
//       Just(information)
//     );
//     if (result.isJust()) {
//       // I'd like to return result, but that doesn't work.
//       return Just(result.extract());
//     }
//   }
//   return Nothing;
// }

/**
 * This function constructs information about a parent node.
 */
function parentInformation<T, R>(
  x: T,
  pf: ParentFunc<T>,
  self: Attribute<T, R>
): Maybe<ParentInformation<T, R>> {
  const possibleParent = pf(x);
  return possibleParent.map((parent) => {
    if (x === parent) throw new Error("Node marked as its own parent");
    // This is called only if the node `x` has a parent.
    return {
      node: parent,
      get attr() {
        return self(parent);
      },
    };
  });
}
