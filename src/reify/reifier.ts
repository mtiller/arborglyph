import { ListChildren } from "../arbor";
import { ArborEmitter } from "../events";
import { Attribute } from "../kinds/attributes";
import {
  InheritedAttributeDefinition,
  SyntheticAttributeDefinition,
} from "../kinds/definitions";
import { ParentFunc } from "../kinds/inherited";
import { ReificationOptions } from "../kinds/options";

export interface Reifier<B extends object = any> {
  synthetic<T extends B, R>(
    root: T,
    list: ListChildren<T>,
    d: SyntheticAttributeDefinition<T, R>,
    emitter: ArborEmitter<T>,
    opts: Partial<ReificationOptions>
  ): Attribute<T, R>;
  inherited<T extends B, R>(
    root: T,
    list: ListChildren<T>,
    def: InheritedAttributeDefinition<T, R>,
    emitter: ArborEmitter<T>,
    p: ParentFunc<T>,
    opts: Partial<ReificationOptions>
  ): Attribute<T, R>;
}
