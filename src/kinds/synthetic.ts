import { Attribute, AttributeDefinition } from "./attributes";
import { NodeSuchChild as NoSuchChild } from "../errors";
import { Arbor, childrenOfNode, ListChildren } from "../arbor";
import LRUCache from "lru-cache";

export function defineSynthetic<T extends object, R>(
  evaluator: SyntheticAttributeEvaluator<T, R>,
  opts: SyntheticOptions<T, R> = {}
): AttributeDefinition<T, R> {
  return {
    attach: (a: Arbor<T>) => {
      return reifySyntheticAttribute(a.root, a.list, evaluator, opts);
    },
  };
}

export type SyntheticEvaluationWrapper<T> = <S extends T, R>(
  e: SyntheticAttributeEvaluator<S, R>
) => SyntheticAttributeEvaluator<S, R>;

export interface SyntheticOptions<T, R> {
  wrapper?: SyntheticEvaluationWrapper<T>;
  memoize?: "no" | "weakmap" | "lru";
  lru?: LRUOptions;
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
  root: T,
  list: ListChildren<T>,
  evaluator: SyntheticAttributeEvaluator<T, R>,
  opts: SyntheticOptions<T, R> = {}
): Attribute<T, R> {
  /** Check what level of memoization is requested */
  const memo = opts.memoize ?? "no";

  if (memo === "weakmap") {
    return baseSyntheticAttributeCalculation(
      root,
      list,
      weakmapWrapper(evaluator)
    );
  }

  if (memo === "lru") {
    return baseSyntheticAttributeCalculation(
      root,
      list,
      lruWrapper(opts.lru)(evaluator)
    );
  }

  // if (memo === "weakmap" || memo === "lru") {
  //   /** If memoization is requested, first create storage for memoized values. */
  //   const resultStorage =
  //     memo === "weakmap" ? new WeakMap<T, R>() : new LRUCache<T, R>(opts.lru);
  //   const childStorage = memo === "weakmap" ? new WeakMap<T, T[]>() : null;

  //   /**
  //    * Now create a special memoized wrapper that checks for memoized values and
  //    * caches any attributes actually evaluated.
  //    **/
  //   const memoizeEvaluator: SyntheticAttributeEvaluator<T, R> = (args) => {
  //     const children = args.children.map((c) => c.node);
  //     const cachedChildren = childStorage?.get(args.node) ?? children;
  //     if (
  //       resultStorage.has(args.node) &&
  //       children.length === cachedChildren.length &&
  //       children.every((c, i) => c === cachedChildren[i])
  //     )
  //       return resultStorage.get(args.node) as R;
  //     const ret = evaluator(args);
  //     resultStorage.set(args.node, ret);
  //     childStorage?.set(args.node, children);
  //     return ret;
  //   };

  //   /** Create an attribute function using a memoizing attribute evaluator */
  //   const memoed = baseSyntheticAttributeCalculation(
  //     root,
  //     list,
  //     memoizeEvaluator
  //   );

  //   // NB - I don't see any value to precomputing of synthetic attributes.  It doesn't really
  //   // avoid the search that precomputing inherited attributes does.

  //   // Return the memoizing attribute function.
  //   return memoed;
  // }
  /** Build a function that can compute our attribute */
  return baseSyntheticAttributeCalculation(root, list, evaluator);
}

function baseSyntheticAttributeCalculation<T, R>(
  root: T,
  list: ListChildren<T>,
  f: SyntheticAttributeEvaluator<T, R>
): Attribute<T, R> {
  const ret = (x: T): R => {
    // TODO: If we *cached* the children of a given node and check if they
    // changed, we could avoid all this recreation of args (ala React.memo(()
    // => ..., [x, childNodes])) This in turn, would allow us to enable
    // "weakmap" caching of IComputedValues from MobX (I think).  So, potential
    // performance gain.
    const childNodes = childrenOfNode<T>(list, x);
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
        if (child === undefined) throw new NoSuchChild(x, n, root);
        return child.attr;
      },
    };
    const result = f(args);
    return result;
  };
  return ret;
}

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

export const weakmapWrapper: SyntheticEvaluationWrapper<object> = <
  T extends object,
  R
>(
  evaluator: SyntheticAttributeEvaluator<T, R>
): SyntheticAttributeEvaluator<T, R> => {
  const resultStorage = new WeakMap<T, R>();
  const childStorage = new WeakMap<T, T[]>();

  return (args) => {
    const children = args.children.map((c) => c.node);
    const cachedChildren = childStorage?.get(args.node) ?? children;
    if (
      resultStorage.has(args.node) &&
      children.length === cachedChildren.length &&
      children.every((c, i) => c === cachedChildren[i])
    )
      return resultStorage.get(args.node) as R;
    const ret = evaluator(args);
    resultStorage.set(args.node, ret);
    childStorage?.set(args.node, children);
    return ret;
  };
};

export interface LRUOptions {
  max?: number;
}

export function lruWrapper(
  opts?: LRUOptions
): SyntheticEvaluationWrapper<object> {
  return <T extends object, R>(
    evaluator: SyntheticAttributeEvaluator<T, R>
  ): SyntheticAttributeEvaluator<T, R> => {
    const resultStorage = new LRUCache<T, R>(opts);

    return (args) => {
      const children = args.children.map((c) => c.node);
      const cachedChildren = children;
      if (
        resultStorage.has(args.node) &&
        children.length === cachedChildren.length &&
        children.every((c, i) => c === cachedChildren[i])
      )
        return resultStorage.get(args.node) as R;
      const ret = evaluator(args);
      resultStorage.set(args.node, ret);
      return ret;
    };
  };
}
