import { computed, IComputedValue, IComputedValueOptions } from "mobx";
import { InheritedArgs, InheritedAttributeEvaluator } from "./kinds/inherited";
import { SyntheticArg, SyntheticAttributeEvaluator } from "./kinds/synthetic";

/**
 * THE TRICK
 *
 * So I think I may have finally cracked the code on how to use mobx observable
 * values without really having to change much in the tree walking.  The trick
 * seems to be that we need to wrap everything in lazily computed
 * `IComputedValue`s.  So instead of our attributes being functions that return
 * `R`, they should return `IComputeValue<R>`.
 *
 * This file contains some simple function that transoform attribute evaluation
 * functions into ones that provide mobx compatible `IComputedValue` values.
 *
 * NB - Regarding caching, if you do not plan to make any structural changes to
 * the tree, you can probably enable "weakmap" caching.  But if there are going
 * to be structural changes, you'll wind up "memoizing" information about the
 * structure that will lead to errors when evaluating (because the traversal
 * will be based on stale information).
 *
 * Along these lines, the issue with "weakmap" caching is that the evaluation
 * code can't detect when the children have changed and that information gets
 * backed into the "args".  If that doesn't get recomputed, then calls to
 * computedValue.get() lead to traversal over stale elements of the tree.  If,
 * however, children were also computed values (automatically recalculated when
 * observables changed) or otherwise invalidated on structural changes, then we
 * could avoid stale data getting memoized.
 */

/**
 * Make an existing synthetic attribute evaluator into a "computable" one.
 * Making it computable means that it can track observable data.  The net effect
 * is that the attribute will now return an instance of `IComputedValue` which
 * lazily evaluates its result, memoizes the result AND automatically
 * invalidates the cached value if any of the values used to compute it were
 * changed!
 * @param f Original synthetic attribute evaluator
 * @returns
 */
export function computeableSynthetic<T, R>(
  f: SyntheticAttributeEvaluator<T, R>,
  options?: IComputedValueOptions<R>
): SyntheticAttributeEvaluator<T, IComputedValue<R>> {
  /** We take args where any precomputed child attributes are assumed to be stored as IComputedValues */
  return (args) => {
    /** In order to provide children with normal "attr" method, we need to unwrap these computed values. */
    const children = args.children.map((c) => {
      return {
        node: c.node,
        get attr() {
          return c.attr.get(); // Unwrapping happens here
        },
      };
    });
    /** Now we create an `args` value compatible with the wrapped evaluator */
    const nargs: SyntheticArg<T, R> = {
      node: args.node,
      children: children,
      attr: (n: T) => {
        const child = children.find((c) => c.node === n);
        if (child === undefined) throw new Error("No such child");
        return child.attr;
      },
    };
    /** And then wrap the evaluator with computed so it returns a computed value */
    return computed(() => f(nargs), options);
  };
}

/**
 * Make an existing inherited attribute evaluator into a "computable" one.
 * Making it computable means that it can track observable data.  The net effect
 * is that the attribute will now return an instance of `IComputedValue` which
 * lazily evaluates its result, memoizes the result AND automatically
 * invalidates the cached value if any of the values used to compute it were
 * changed!
 * @param f Original inherited attribute evaluator
 * @returns
 */
export function computeableInherited<T, R>(
  f: InheritedAttributeEvaluator<T, R>,
  options?: IComputedValueOptions<R>
): InheritedAttributeEvaluator<T, IComputedValue<R>> {
  /** We take args where any precomputed parent attribute is assumed to be stored as IComputedValues */
  return (args) => {
    /** In order to provide parent with normal "attr" method, we need to unwrap these computed values. */
    const parent = args.parent.map((p) => {
      return {
        node: p.node,
        get attr() {
          return p.attr.get(); // Unwrapping happens here
        },
      };
    });
    /** Now we create an `args` value compatible with the wrapped evaluator */
    const nargs: InheritedArgs<T, R> = {
      node: args.node,
      parent: parent,
    };
    /** And then wrap the evaluator with computed so it returns a computed value */
    return computed(() => f(nargs), options);
  };
}
