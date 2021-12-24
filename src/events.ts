import { Attribute } from "./kinds/attributes";
import { AttributeDefinition } from "./kinds/definitions";

import TypedEmitter from "typed-emitter";
import EventEmitter from "events";

export interface TreeEvents<T> {
  evaluation: (attr: Attribute<T, unknown>) => void;
  invocation: (def: AttributeDefinition<T, unknown>) => void;
}

export type ArborEmitter<T> = TypedEmitter<TreeEvents<T>>;

export function createEmitter<T>(): TypedEmitter<TreeEvents<T>> {
  return new EventEmitter() as TypedEmitter<ArborEmitter<T>>;
}
