import { ListChildren } from "../arbor";
import { ArborEmitter } from "../events";
import { Attribute } from "../kinds/attributes";
import {
  InheritedAttributeDefinition,
  SyntheticAttributeDefinition,
} from "../kinds/definitions";
import { CommonInheritedOptions, ParentFunc } from "../kinds/inherited";
import { CommonSyntheticOptions } from "../kinds/synthetic";

export interface Reifier<B extends object = any> {
  synthetic<T extends B, R>(
    root: T,
    list: ListChildren<T>,
    d: SyntheticAttributeDefinition<T, R>,
    emitter: ArborEmitter<T>,
    opts: Partial<CommonSyntheticOptions>
  ): Attribute<T, R>;
  inherited<T extends B, R>(
    root: T,
    list: ListChildren<T>,
    def: InheritedAttributeDefinition<T, R>,
    emitter: ArborEmitter<T>,
    p: ParentFunc<T> | null,
    opts: Partial<CommonInheritedOptions>
  ): Attribute<T, R>;
}
