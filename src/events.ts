import { Attribute } from "./kinds/attributes";
import { AttributeDefinition } from "./kinds/definitions";

import TypedEmitter from "typed-emitter";
import EventEmitter from "events";

export interface TreeEvents<T> {
  invocation: (
    d: AttributeDefinition<T, unknown>,
    n: T,
    result: unknown
  ) => void;
  evaluation: (a: Attribute<T, unknown>, n: T, result: unknown) => void;
}

export type ArborMonitor<T> = Pick<
  ArborEmitter<T>,
  "on" | "once" | "off" | "removeListener"
>;

export type ArborEmitter<T> = TypedEmitter<TreeEvents<T>>;

export function createEmitter<T>(): TypedEmitter<TreeEvents<T>> {
  return new EventEmitter() as TypedEmitter<ArborEmitter<T>>;
}
