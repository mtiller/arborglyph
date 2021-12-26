import {
  computed,
  IComputedValue,
  IComputedValueOptions,
  observable,
} from "mobx";
import {
  AttributeDefinition,
  derived,
  inherited,
  synthetic,
  transformer,
} from "../kinds/definitions";
import { InheritedArgs, InheritedAttributeEvaluator } from "../kinds/inherited";
import {
  SyntheticArg,
  SyntheticAttributeEvaluator,
  CommonSyntheticOptions,
} from "../kinds/synthetic";
import { assertUnreachable } from "../utils";

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

export const mobx = {
  synthetic<T, R>(
    description: string,
    f: SyntheticAttributeEvaluator<T, R>,
    opts?: Partial<CommonSyntheticOptions>
  ) {
    return {
      type: "syn",
      description,
      f,
      prev: [],
      opts: opts ?? {},
    };
  },
};

// export function computableValue<T extends object, R>(
//   d: AttributeDefinition<T, R>,
//   opts?: IComputedValueOptions<R>
// ): AttributeDefinition<T, IComputedValue<R>> {
//   const desc = `CV of ${d.description}`;
//   switch (d.type) {
//     case "syn": {
//       return synthetic(desc, computeableSynthetic(d.f, opts));
//     }
//     case "inh": {
//       return inherited(desc, computeableInherited(d.f, opts));
//     }
//     case "der": {
//       return derived<T, IComputedValue<R>>(`CV of ${d.description}`, (args) =>
//         computed(() => d.f(args), opts)
//       );
//     }
//     case "trans": {
//       throw new Error("Unimplemented");
//     }
//   }
//   return assertUnreachable(d);
// }

// export function computable<T extends object, R>(
//   d: AttributeDefinition<T, R>,
//   opts?: IComputedValueOptions<R>
// ) {
//   const inter = computableValue(d, opts);
//   return transformer(inter, "unwrap CV", (x) => x.get());
// }
