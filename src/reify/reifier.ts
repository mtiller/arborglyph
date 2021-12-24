import { ListChildren } from "../arbor";
import { Attribute } from "../kinds/attributes";
import {
  InheritedAttributeDefinition,
  SyntheticAttributeDefinition,
} from "../kinds/definitions";
import { CommonInheritedOptions, ParentFunc } from "../kinds/inherited";
import { CommonSyntheticOptions } from "../kinds/synthetic";

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
