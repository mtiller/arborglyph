import { ListChildren } from "../children";
import { Attribute } from "../kinds/attributes";
import { InheritedAttributeDefinition } from "../kinds/definitions";
import {
  InheritedAttributeEvaluator,
  ParentFunc,
  ParentInformation,
} from "../kinds/inherited";
import { Maybe } from "purify-ts/Maybe";
import { ArborEmitter, MutationMonitor } from "../events";
import { CacheStorage } from "../kinds/cache";
import { walkTree } from "../utils";
import { ReificationOptions } from "../kinds/options";

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
  monitor: MutationMonitor<T>,
  p: ParentFunc<T>,
  opts: ReificationOptions
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
    monitor.on("invalidate", (_, inherited) =>
      inherited.forEach((x) => storage.delete(x))
    );

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
    const memoed = baseInheritedAttributeCalculation(
      def2,
      memoizeEvaluator,
      p,
      emitter
    );

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

  // NB - We don't perform eager evaluation here because there would be no point,
  // the results would just be lost.  Yes, we might "observe them", but computing all
  // nodes just because a few might be observed seems wasteful.

  /** Build a function that can compute our attribute but doesn't use caching */
  return baseInheritedAttributeCalculation(def2, evaluator, p, emitter);
}

/**
 * This is the basic function for computing an inherited attribute.
 * @param tree Tree we are associating the attribute with
 * @param f The function that evaluates the inherited attribute
 * @param p An optional "parent function" (to save searching the tree for `x`)
 * @returns A function that takes a node and returns the attribute value
 */
function baseInheritedAttributeCalculation<T extends object, R, DR>(
  def: InheritedAttributeDefinition<T, DR>,
  f: InheritedAttributeEvaluator<T, R>,
  p: ParentFunc<T>,
  emitter: ArborEmitter<T>
): Attribute<T, R> {
  const ret = (x: T): R => {
    /**
     * If a parent function was supplied, then this is very easy
     */
    const information = parentInformation(x, p, ret);
    const result = f({
      node: x,
      parent: information,
    });
    emitter.emit("evaluation", def as any, x, result);
    return result;
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
