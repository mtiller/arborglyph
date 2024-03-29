import { ListChildren } from "../children";
import { Attribute } from "../kinds/attributes";
import {
  InheritedAttributeDefinition,
  SyntheticAttributeDefinition,
} from "../kinds/definitions";
import { ParentFunc } from "../kinds/inherited";
import { Reifier } from "./reifier";
import { reifySyntheticAttribute } from "./synthetic";
import { reifyInheritedAttribute } from "./inherited";
import { ArborEmitter, MutationMonitor } from "../events";
import { ReificationOptions } from "../kinds/options";
import { Maybe } from "purify-ts/Maybe";
import { reifyParent } from "./parent";
import { ClearableWeakMap } from "../kinds/cache";

export class StandardReifier implements Reifier<object> {
  protected options: Partial<ReificationOptions>;
  constructor(opts?: Partial<ReificationOptions>) {
    this.options = opts ?? {};
  }
  parent<T extends object>(
    root: T,
    list: ListChildren<T>,
    monitor: MutationMonitor<T>
  ): Attribute<T, Maybe<T>> {
    return reifyParent(root, list, monitor);
  }
  synthetic<T extends object, R>(
    root: T,
    list: ListChildren<T>,
    def: SyntheticAttributeDefinition<T, R>,
    emitter: ArborEmitter<T>,
    monitor: MutationMonitor<T>,
    opts: Partial<ReificationOptions>
  ): Attribute<T, R> {
    const mergedPartialOptions = { ...this.options, ...opts };
    const completeOptions: ReificationOptions = {
      memoize: mergedPartialOptions.memoize ?? false,
      eager: mergedPartialOptions.eager ?? true,
      cacheProvider:
        mergedPartialOptions.cacheProvider ??
        (() => new ClearableWeakMap<any, any>()),
      pure: mergedPartialOptions.pure ?? true,
    };

    return reifySyntheticAttribute<T, R, R>(
      root,
      list,
      def,
      def.f,
      emitter,
      monitor,
      completeOptions
    );
  }
  inherited<T extends object, R>(
    root: T,
    list: ListChildren<T>,
    def: InheritedAttributeDefinition<T, R>,
    emitter: ArborEmitter<T>,
    monitor: MutationMonitor<T>,
    p: ParentFunc<T>,
    opts: Partial<ReificationOptions>
  ): Attribute<T, R> {
    const mergedPartialOptions = { ...this.options, ...opts };
    const completeOptions: ReificationOptions = {
      eager: mergedPartialOptions.eager ?? false,
      memoize: mergedPartialOptions.memoize ?? true,
      cacheProvider:
        mergedPartialOptions.cacheProvider ??
        (() => new ClearableWeakMap<any, any>()),
      pure: mergedPartialOptions.pure ?? true,
    };

    return reifyInheritedAttribute<T, R, R>(
      root,
      list,
      def,
      def.f,
      emitter,
      monitor,
      p,
      completeOptions
    );
  }
}
