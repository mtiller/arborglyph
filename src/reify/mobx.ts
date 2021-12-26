import { IComputedValue, IComputedValueOptions } from "mobx";
import { ListChildren } from "../arbor";
import { ArborEmitter } from "../events";
import { Attribute } from "../kinds/attributes";
import {
  SyntheticAttributeDefinition,
  InheritedAttributeDefinition,
} from "../kinds/definitions";
import { CommonInheritedOptions, ParentFunc } from "../kinds/inherited";
import { CommonSyntheticOptions } from "../kinds/synthetic";
import {
  computeableInherited,
  computeableSynthetic,
} from "../plugins/mobx-helpers";
import { reifyInheritedAttribute } from "./inherited";
import { Reifier } from "./reifier";
import { StandardReifierOptions } from "./standard";
import { reifySyntheticAttribute } from "./synthetic";

export interface MobxReifierOptions extends StandardReifierOptions {
  computed: { requiresReaction?: boolean; keepAlive?: boolean };
}
export class MobxReifier implements Reifier<object> {
  protected syntheticOptions: Partial<CommonSyntheticOptions>;
  protected inheritedOptions: Partial<CommonInheritedOptions>;
  protected computedOptions: IComputedValueOptions<unknown>;
  constructor(opts?: Partial<MobxReifierOptions>) {
    this.syntheticOptions = opts?.synthetic ?? {};
    this.inheritedOptions = opts?.inherited ?? {};
    this.computedOptions = opts?.computed ?? {};
  }
  synthetic<T extends object, R>(
    root: T,
    list: ListChildren<T>,
    def: SyntheticAttributeDefinition<T, R>,
    emitter: ArborEmitter<T>,
    opts: Partial<CommonSyntheticOptions>
  ): Attribute<T, R> {
    const mergedPartialOptions = { ...this.syntheticOptions, ...opts };
    const completeOptions: CommonSyntheticOptions = {
      memoize: mergedPartialOptions.memoize ?? true, // Default value is true, not sure any other value makes sense
      eager: mergedPartialOptions.eager ?? true,
      cacheProvider:
        mergedPartialOptions.cacheProvider ?? (() => new WeakMap<any, any>()),
    };

    const f = computeableSynthetic(def.f, {
      keepAlive: this.computedOptions.keepAlive,
      requiresReaction: this.computedOptions.requiresReaction,
    });
    const computableAttr = reifySyntheticAttribute<T, R, IComputedValue<R>>(
      root,
      list,
      def,
      f,
      emitter,
      completeOptions
    );
    return (x) => computableAttr(x).get();
  }
  inherited<T extends object, R>(
    root: T,
    list: ListChildren<T>,
    def: InheritedAttributeDefinition<T, R>,
    emitter: ArborEmitter<T>,
    p: ParentFunc<T>,
    opts: Partial<CommonInheritedOptions>
  ): Attribute<T, R> {
    const mergedPartialOptions = { ...this.inheritedOptions, ...opts };
    const completeOptions: CommonInheritedOptions = {
      eager: mergedPartialOptions.eager ?? false,
      memoize: mergedPartialOptions.memoize ?? true,
      cacheProvider:
        mergedPartialOptions.cacheProvider ?? (() => new WeakMap<any, any>()),
    };

    const f = computeableInherited(def.f, {
      keepAlive: this.computedOptions.keepAlive,
      requiresReaction: this.computedOptions.requiresReaction,
    });

    const computeableAttr = reifyInheritedAttribute<T, R, IComputedValue<R>>(
      root,
      list,
      def,
      f,
      emitter,
      p,
      completeOptions
    );

    return (x) => computeableAttr(x).get();
  }
}
