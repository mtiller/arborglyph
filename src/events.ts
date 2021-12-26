import { Attribute } from "./kinds/attributes";
import { AttributeDefinition, InheritedOptions } from "./kinds/definitions";

import TypedEmitter from "typed-emitter";
import EventEmitter from "events";
import { ArborPlugin } from "./plugin";
import { SyntheticOptions } from "./former";

export interface TreeEvents<T extends object> {
  created: () => void;
  connected: (plugin: ArborPlugin<T>) => void;
  added: (d: AttributeDefinition<T, any>, a: Attribute<T, any>) => void;
  options: (
    inheritedOptions: Partial<InheritedOptions>,
    synthethicOptions: Partial<SyntheticOptions>
  ) => void;
  invocation: (d: AttributeDefinition<T, any>, n: T, result: unknown) => void;
  evaluation: (a: Attribute<T, any>, n: T, result: unknown) => void;
}

export type ArborMonitor<T extends object> = Pick<
  ArborEmitter<T>,
  "on" | "once" | "off" | "removeListener"
>;

export type ArborEmitter<T extends object> = TypedEmitter<TreeEvents<T>>;

export function createEmitter<T extends object>(): TypedEmitter<TreeEvents<T>> {
  return new EventEmitter() as TypedEmitter<ArborEmitter<T>>;
}
