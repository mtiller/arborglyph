import { ListChildren } from "../arbor";
import { Attribute } from "../kinds/attributes";
import {
  InheritedAttributeDefinition,
  SyntheticAttributeDefinition,
} from "../kinds/definitions";
import { ParentFunc } from "../kinds/inherited";
import { Reifier } from "./reifier";
import { reifySyntheticAttribute } from "./synthetic";
import { reifyInheritedAttribute, reifyParent } from "./inherited";
import { ArborEmitter } from "../events";
import { ReificationOptions } from "../kinds/options";
import { Maybe } from "purify-ts/Maybe";

export class StandardReifier implements Reifier<object> {
  protected options: Partial<ReificationOptions>;
  constructor(opts?: Partial<ReificationOptions>) {
    this.options = opts ?? {};
  }
  parent<T extends object>(
    root: T,
    list: ListChildren<T>,
    emitter: ArborEmitter<T>
  ): Attribute<T, Maybe<T>> {
    return reifyParent(root, list, emitter);
  }
  synthetic<T extends object, R>(
    root: T,
    list: ListChildren<T>,
    def: SyntheticAttributeDefinition<T, R>,
    emitter: ArborEmitter<T>,
    opts: Partial<ReificationOptions>
  ): Attribute<T, R> {
    const mergedPartialOptions = { ...this.options, ...opts };
    const completeOptions: ReificationOptions = {
      memoize: mergedPartialOptions.memoize ?? false,
      eager: mergedPartialOptions.eager ?? true,
      cacheProvider:
        mergedPartialOptions.cacheProvider ?? (() => new WeakMap<any, any>()),
    };

    return reifySyntheticAttribute<T, R, R>(
      root,
      list,
      def,
      def.f,
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
    opts: Partial<ReificationOptions>
  ): Attribute<T, R> {
    const mergedPartialOptions = { ...this.options, ...opts };
    const completeOptions: ReificationOptions = {
      eager: mergedPartialOptions.eager ?? false,
      memoize: mergedPartialOptions.memoize ?? true,
      cacheProvider:
        mergedPartialOptions.cacheProvider ?? (() => new WeakMap<any, any>()),
    };

    return reifyInheritedAttribute<T, R, R>(
      root,
      list,
      def,
      def.f,
      emitter,
      p,
      completeOptions
    );
  }
}
