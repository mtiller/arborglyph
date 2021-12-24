import { ListChildren } from "../arbor";
import { Attribute } from "../kinds/attributes";
import {
  InheritedAttributeDefinition,
  SyntheticAttributeDefinition,
} from "../kinds/definitions";
import {
  CommonInheritedOptions,
  ParentFunc,
  reifyInheritedAttribute,
} from "../kinds/inherited";
import {
  reifySyntheticAttribute,
  CommonSyntheticOptions,
} from "../kinds/synthetic";

export interface Reifier<B = any> {
  synthetic<T extends B, R>(
    root: T,
    list: ListChildren<T>,
    d: SyntheticAttributeDefinition<T, R>,
    opts: Partial<CommonSyntheticOptions>
  ): Attribute<T, R>;
  inherited<T extends B, R>(
    root: T,
    list: ListChildren<T>,
    def: InheritedAttributeDefinition<T, R>,
    p: ParentFunc<T> | null,
    opts: Partial<CommonInheritedOptions>
  ): Attribute<T, R>;
}

type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object
    ? RecursivePartial<T[P]>
    : T[P];
};

export interface StandardReifierOptions {
  inherited: Partial<CommonInheritedOptions>;
  synthetic: Partial<CommonSyntheticOptions>;
}

export class StandardReifier implements Reifier<object> {
  protected syntheticOptions: Partial<CommonSyntheticOptions>;
  protected inheritedOptions: Partial<CommonInheritedOptions>;
  constructor(opts?: RecursivePartial<StandardReifierOptions>) {
    this.syntheticOptions = opts?.synthetic ?? {};
    this.inheritedOptions = opts?.inherited ?? {};
  }
  synthetic<T extends object, R>(
    root: T,
    list: ListChildren<T>,
    def: SyntheticAttributeDefinition<T, R>,
    opts: Partial<CommonSyntheticOptions>
  ): Attribute<T, R> {
    const mergedPartialOptions = { ...this.syntheticOptions, ...opts };
    const completeOptions: CommonSyntheticOptions = {
      memoize: mergedPartialOptions.memoize ?? false,
    };

    return reifySyntheticAttribute<T, R>(
      root,
      list,
      def,
      def.f,
      completeOptions
    );
  }
  inherited<T extends object, R>(
    root: T,
    list: ListChildren<T>,
    def: InheritedAttributeDefinition<T, R>,
    p: ParentFunc<T> | null,
    opts: CommonInheritedOptions
  ): Attribute<T, R> {
    const mergedPartialOptions = { ...this.inheritedOptions, ...opts };
    const completeOptions: CommonInheritedOptions = {
      // TODO: Set this to false.  But for this to work, we need parent as a built-in
      // memoized, eagerly evaluated attribute because that's a precondition for having
      // lazily evaluated inherited attributes.
      eager: mergedPartialOptions.eager ?? true,
      memoize: mergedPartialOptions.memoize ?? true,
    };

    return reifyInheritedAttribute<T, R>(root, list, def, p, completeOptions);
  }
}
