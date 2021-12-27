import { Attribute } from "./kinds/attributes";
import { AttributeDefinition } from "./kinds/definitions";

import TypedEmitter from "typed-emitter";
import EventEmitter from "events";
import { ArborPlugin } from "./plugin";
import { ReificationOptions } from "./kinds/options";

export interface MutationEvents<T extends object> {
  mutation(n: T, parametric: boolean): void;
  reroot(root: T): void;
}

export type MutationMonitor<T extends object> = Pick<
  MutationEmitter<T>,
  "on" | "once" | "off" | "removeListener"
>;

export type MutationEmitter<T extends object> = TypedEmitter<MutationEvents<T>>;

export interface TreeEvents<T extends object> {
  created: () => void;
  connected: (plugin: ArborPlugin<T>) => void;
  added: (d: AttributeDefinition<T, any>, a: Attribute<T, any>) => void;
  initialized: (reificationOptions: Partial<ReificationOptions>) => void;
  invocation: (d: AttributeDefinition<T, any>, n: T, result: unknown) => void;
  evaluation: (a: Attribute<T, any>, n: T, result: unknown) => void;
}

export type ArborMonitor<T extends object> = Pick<
  ArborEmitter<T>,
  "on" | "once" | "off" | "removeListener"
>;

export type ArborEmitter<T extends object> = TypedEmitter<TreeEvents<T>>;

export function typedEmitter<T>(): TypedEmitter<T> {
  return new EventEmitter() as unknown as TypedEmitter<T>;
}
