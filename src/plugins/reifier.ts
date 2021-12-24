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
    d: SyntheticAttributeDefinition<T, R>,
    root: T,
    list: ListChildren<T>
  ): Attribute<T, R>;
  inherited<T extends B, R>(
    root: T,
    list: ListChildren<T>,
    def: InheritedAttributeDefinition<T, R>,
    p: ParentFunc<T> | null
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
  inherited: CommonInheritedOptions;
  synthetic: CommonSyntheticOptions;
}

export class StandardReifier implements Reifier<object> {
  protected options: StandardReifierOptions;
  constructor(opts?: RecursivePartial<StandardReifierOptions>) {
    this.options = {
      inherited: {
        memoize: opts?.inherited?.memoize ?? false,
        eager: opts?.inherited?.eager ?? false,
      },
      synthetic: {
        memoize: opts?.synthetic?.memoize ?? false,
      },
    };
  }
  synthetic<T extends object, R>(
    def: SyntheticAttributeDefinition<T, R>,
    root: T,
    list: ListChildren<T>
  ): Attribute<T, R> {
    return reifySyntheticAttribute<T, R>(def, root, list, def.f, {
      ...this.options.synthetic,
    });
  }
  inherited<T extends object, R>(
    root: T,
    list: ListChildren<T>,
    def: InheritedAttributeDefinition<T, R>,
    p: ParentFunc<T> | null
  ): Attribute<T, R> {
    return reifyInheritedAttribute<T, R>(root, list, def, p, {
      ...this.options.inherited,
    });
  }
}
