import {
  computed,
  IComputedValue,
  IComputedValueOptions,
  observable,
} from "mobx";
import { Maybe } from "purify-ts/Maybe";
import { ListChildren } from "../arbor";
import { ArborEmitter } from "../events";
import { Attribute } from "../kinds/attributes";
import {
  SyntheticAttributeDefinition,
  InheritedAttributeDefinition,
} from "../kinds/definitions";
import {
  InheritedArgs,
  InheritedAttributeEvaluator,
  ParentFunc,
} from "../kinds/inherited";
import { ReificationOptions } from "../kinds/options";
import { SyntheticArg, SyntheticAttributeEvaluator } from "../kinds/synthetic";
import { reifyInheritedAttribute, reifyParent } from "./inherited";
import { Reifier } from "./reifier";
import { reifySyntheticAttribute } from "./synthetic";

export interface MobxReifierOptions extends ReificationOptions {
  computed: { requiresReaction?: boolean; keepAlive?: boolean };
}

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
export class MobxReifier implements Reifier<object> {
  protected options: Partial<MobxReifierOptions>;
  constructor(opts?: Partial<MobxReifierOptions>) {
    this.options = opts ?? {};
  }
  parent<T extends object>(
    root: T,
    list: ListChildren<T>,
    emitter: ArborEmitter<T>
  ): Attribute<T, Maybe<T>> {
    // TODO: Ensure root is observable?
    return reifyParent(root, list, emitter);
  }

  synthetic<T extends object, R>(
    root: T,
    list: ListChildren<T>,
    def: SyntheticAttributeDefinition<T, R>,
    emitter: ArborEmitter<T>,
    opts: Partial<ReificationOptions>
  ): Attribute<T, R> {
    const f = computeableSynthetic(def.f, this.computedOptions());
    const computableAttr = reifySyntheticAttribute<T, R, IComputedValue<R>>(
      root,
      list,
      def,
      f,
      emitter,
      this.reificationOptions()
    );
    return (x) => computableAttr(x).get();
  }
  inherited<T extends object, R>(
    root: T,
    list: ListChildren<T>,
    def: InheritedAttributeDefinition<T, R>,
    emitter: ArborEmitter<T>,
    p: ParentFunc<T>,
    opts: Partial<ReificationOptions>
  ): Attribute<T, R> {
    const f = computeableInherited(def.f, this.computedOptions());

    const computeableAttr = reifyInheritedAttribute<T, R, IComputedValue<R>>(
      root,
      list,
      def,
      f,
      emitter,
      p,
      this.reificationOptions()
    );
    return (x) => computeableAttr(x).get();
  }
  protected computedOptions() {
    return {
      keepAlive: this.options?.computed?.keepAlive ?? false,
      requiresReaction: this.options.computed?.requiresReaction ?? false,
    };
  }

  protected reificationOptions(opts?: Partial<ReificationOptions>) {
    const mergedPartialOptions = { ...this.options, ...opts };
    const completeOptions: ReificationOptions = {
      eager: mergedPartialOptions.eager ?? false,
      memoize: mergedPartialOptions.memoize ?? true,
      cacheProvider:
        mergedPartialOptions.cacheProvider ?? (() => new WeakMap<any, any>()),
    };
    return completeOptions;
  }
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
function computeableSynthetic<T, R>(
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
function computeableInherited<T, R>(
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
