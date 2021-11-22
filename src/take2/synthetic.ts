import { ScalarFunction } from "./attributes";
import { NodeSuchChild as NoSuchChild } from "./errors";
import { childrenOfNode, TreeType, walkTree } from "./treetypes";
import LRUCache from "lru-cache";

export interface ChildInformation<T, R> {
  node: T;
  attr: R;
}

/**
 * Arguments available when computing a synthetic attribute.
 *
 * Sometimes we will want to request the attribute value for a specific
 * child.  In that case, we can use `attr`.  In other cases, we might wish
 * to iterate over the children.  In that case, we use `children`.
 */
export interface SyntheticArg<T, R> {
  // siblings: Array<ChildInformation<T, R>>;
  node: T;
  attr: (child: T) => R;
  children: Array<ChildInformation<T, R>>;
}

export type SyntheticAttributeEvaluator<T, R> = (x: SyntheticArg<T, R>) => R;

export interface SyntheticOptions<T, R> {
  memoize?: "no" | "weakmap" | "lru";
  lru?: LRUCache.Options<T, R>;
}

/**
 * This is the function that takes a description of a synthetic
 * attribute and returns an actual implementation capable of computing
 * the synthetic attribute for any node in the tree.
 *
 * @param tree Tree we are associating this synthetic attribute with
 * @param evaluator The function that evaluates the synthetic attribute
 * @param opts Various options we have when reifying
 * @returns
 */
export function reifySyntheticAttribute<T extends object, R>(
  tree: TreeType<T>,
  evaluator: SyntheticAttributeEvaluator<T, R>,
  opts: SyntheticOptions<T, R> = {}
): ScalarFunction<T, R> {
  /** Check what level of memoization is requested */
  const memo = opts.memoize ?? "no";

  if (memo === "weakmap" || memo === "lru") {
    /** If memoization is requested, first create storage for memoized values. */
    const storage =
      memo === "weakmap" ? new WeakMap<T, R>() : new LRUCache<T, R>(opts.lru);

    /**
     * Now create a special memoized wrapper that checks for memoized values and
     * caches any attributes actually evaluated.
     **/
    const memoizeEvaluator: SyntheticAttributeEvaluator<T, R> = (args) => {
      if (storage.has(args.node)) return storage.get(args.node) as R;
      const ret = evaluator(args);
      storage.set(args.node, ret);
      return ret;
    };

    /** Create an attribute function using a memoizing attribute evaluator */
    const memoed = baseSyntheticAttributeCalculation(tree, memoizeEvaluator);

    // NB - I don't see any value to precomputing of synthetic attributes.  It doesn't really
    // avoid the search that precomputing inherited attributes does.

    // Return the memoizing attribute function.
    return memoed;
  }
  /** Build a function that can compute our attribute */
  return baseSyntheticAttributeCalculation(tree, evaluator);
}

function baseSyntheticAttributeCalculation<T, R>(
  tree: TreeType<T>,
  f: SyntheticAttributeEvaluator<T, R>
): ScalarFunction<T, R> {
  const ret = (x: T): R => {
    // TODO: If we *cached* the children of a given node and check if they
    // changed, we could avoid all this recreation of args (ala React.memo(()
    // => ..., [x, childNodes])) This in turn, would allow us to enable
    // "weakmap" caching of IComputedValues from MobX (I think).  So, potential
    // performance gain.
    const childNodes = childrenOfNode<T>(tree, x);
    const children = childNodes.map((c): ChildInformation<T, R> => {
      return {
        node: c,
        get attr() {
          const result = ret(c);
          return result;
        },
      };
    });
    const args: SyntheticArg<T, R> = {
      node: x,
      children: children,
      attr: (n: T) => {
        const child = children.find((c) => c.node === n);
        if (child === undefined) throw new NoSuchChild(x, n, tree);
        return child.attr;
      },
    };
    const result = f(args);
    return result;
  };
  return ret;
}
