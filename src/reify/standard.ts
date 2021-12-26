import { ListChildren } from "../arbor";
import { Attribute } from "../kinds/attributes";
import {
  InheritedAttributeDefinition,
  SyntheticAttributeDefinition,
} from "../kinds/definitions";
import { CommonInheritedOptions, ParentFunc } from "../kinds/inherited";
import { CommonSyntheticOptions } from "../kinds/synthetic";
import { Reifier } from "./reifier";
import { reifySyntheticAttribute } from "./synthetic";
import { reifyInheritedAttribute } from "./inherited";
import { ArborEmitter } from "../events";

export interface StandardReifierOptions {
  inherited: Partial<CommonInheritedOptions>;
  synthetic: Partial<CommonSyntheticOptions>;
}

export class StandardReifier implements Reifier<object> {
  protected syntheticOptions: Partial<CommonSyntheticOptions>;
  protected inheritedOptions: Partial<CommonInheritedOptions>;
  constructor(opts?: Partial<StandardReifierOptions>) {
    this.syntheticOptions = opts?.synthetic ?? {};
    this.inheritedOptions = opts?.inherited ?? {};
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
      memoize: mergedPartialOptions.memoize ?? false,
      eager: mergedPartialOptions.eager ?? true,
      cacheProvider:
        mergedPartialOptions.cacheProvider ?? (() => new WeakMap<any, any>()),
    };

    return reifySyntheticAttribute<T, R>(
      root,
      list,
      def,
      emitter,
      completeOptions
    );
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
      // TODO: Set this to false.  But for this to work, we need parent as a built-in
      // memoized, eagerly evaluated attribute because that's a precondition for having
      // lazily evaluated inherited attributes.
      eager: mergedPartialOptions.eager ?? false,
      memoize: mergedPartialOptions.memoize ?? true,
      cacheProvider:
        mergedPartialOptions.cacheProvider ?? (() => new WeakMap<any, any>()),
    };

    return reifyInheritedAttribute<T, R>(
      root,
      list,
      def,
      emitter,
      p,
      completeOptions
    );
  }
}
