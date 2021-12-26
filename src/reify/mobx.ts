import { ListChildren } from "../arbor";
import { ArborEmitter } from "../events";
import { Attribute } from "../kinds/attributes";
import {
  SyntheticAttributeDefinition,
  InheritedAttributeDefinition,
} from "../kinds/definitions";
import { CommonInheritedOptions, ParentFunc } from "../kinds/inherited";
import { CommonSyntheticOptions } from "../kinds/synthetic";
import { StandardReifier } from "./standard";

export class MobxReifier extends StandardReifier {
  synthetic<T extends object, R>(
    root: T,
    list: ListChildren<T>,
    d: SyntheticAttributeDefinition<T, R>,
    emitter: ArborEmitter<T>,
    opts: Partial<CommonSyntheticOptions>
  ): Attribute<T, R> {
    return super.synthetic(root, list, d, emitter, opts);
  }
  inherited<T extends object, R>(
    root: T,
    list: ListChildren<T>,
    def: InheritedAttributeDefinition<T, R>,
    emitter: ArborEmitter<T>,
    p: ParentFunc<T>,
    opts: Partial<CommonInheritedOptions>
  ): Attribute<T, R> {
    return super.inherited(root, list, def, emitter, p, opts);
  }
}
