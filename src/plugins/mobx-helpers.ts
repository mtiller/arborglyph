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
import { memoize } from "./memoize";
import { ArborPlugin } from "../plugin";
import { Attribute } from "../kinds/attributes";

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

export function mobxPlugin<T extends object>(): ArborPlugin<T> {
  const map = new Map<Attribute<T, any>, Attribute<T, any>>();
  return {
    remapRoot: (root: any): any => {
      return observable(root);
    },
    // remapDef: <R>(
    //   attr: AttributeDefinition<any, R>
    // ): AttributeDefinition<any, R> => {
    //   // TODO: This is probably a bad a idea...I don't think we NEED to make everything computable.
    //   return computable(attr, { keepAlive: true });
    // },
    remapAttr: <R>(attr: Attribute<T, R>) => {
      const cached = map.get(attr);
      if (cached !== undefined) return cached;
      const ret = (x: T) => {
        return computed(() => attr(x)).get();
      };
      map.set(attr, ret);
      return ret;
    },
  };
}

export function computableValue<T extends object, R>(
  d: AttributeDefinition<T, R>,
  opts?: IComputedValueOptions<R>
): AttributeDefinition<T, IComputedValue<R>> {
  const desc = `CV of ${d.description}`;
  switch (d.type) {
    case "syn": {
      return synthetic(desc, computeableSynthetic(d.f, opts));
    }
    case "inh": {
      return inherited(desc, computeableInherited(d.f, opts));
    }
    case "der": {
      return derived<T, IComputedValue<R>>(`CV of ${d.description}`, (args) =>
        computed(() => d.f(args), opts)
      );
    }
    case "trans": {
      throw new Error("Unimplemented");
    }
  }
  return assertUnreachable(d);
}

export function computable<T extends object, R>(
  d: AttributeDefinition<T, R>,
  opts?: IComputedValueOptions<R>
) {
  const inter = memoize(computableValue(d, opts));
  return transformer(inter, "unwrap CV", (x) => x.get());
}

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
    /** Now we create an `args` value compatable with the wrapped evaluator */
    const nargs: SyntheticArg<T, R> = {
      node: args.node,
      children: children,
      attr: (n: T) => {
        const child = children.find((c) => c.node === n);
        if (child === undefined) throw new Error("No such child");
        return child.attr;
      },
      createMap: () => observable.map(args.createMap()),
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

// export function defineComputedSynthetic<T extends object, R>(
//   f: SyntheticAttributeEvaluator<T, R>,
//   sopts?: SyntheticOptions<T, IComputedValue<R>>,
//   options?: IComputedValueOptions<R>
// ): AttributeDefinition<T, R> {
//   return {
//     attach: (a: Arbor<T>) => {
//       const cs = computeableSynthetic(f, options);
//       const attr = a.syn(cs, sopts);
//       return a.der((x) => attr(x).get());
//     },
//   };
// }

// export function defineComputedInherited<T extends object, R>(
//   f: InheritedAttributeEvaluator<T, R>,
//   sopts?: InheritedOptions<T, IComputedValue<R>>,
//   options?: IComputedValueOptions<R>
// ): AttributeDefinition<T, R> {
//   return {
//     attach: (a: Arbor<T>) => {
//       const cs = computeableInherited(f, options);
//       const attr = a.inh(cs, sopts);
//       return a.der((x) => attr(x).get());
//     },
//   };
// }
