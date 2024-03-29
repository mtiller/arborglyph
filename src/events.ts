import { Attribute } from "./kinds/attributes";
import { AttributeDefinition } from "./kinds/definitions";
import { ArborPlugin } from "./plugin";
import { ReificationOptions } from "./kinds/options";
import TypedEmitter from "typed-emitter";
import EventEmitter from "events";

/** The set of possible (tree) mutation events. */
export interface MutationEvents<T extends object> {
  /** Instructs caches to invalidate any entries for `n` that are for `synthetic` and/or `inherited` attributes. */
  invalidate(synthetic: Set<T>, inherited: Set<T>): void;
  /** Invalidate entire cache for a given attribute. */
  invalidateAttribute(def: AttributeDefinition<T, any>): void;
  /** Used when the root node of the tree is changed. */
  reroot(root: T): void;
  /** Finalize any structural changes */
  finalize(): void;
}

/** A subset of the event emmiter interface that is read only. */
export type MutationMonitor<T extends object> = Pick<
  MutationEmitter<T>,
  "on" | "once" | "off" | "removeListener"
>;

/** A typed event emitter that specifically handles the event described by the `MutationEvents` interfaces. */
export type MutationEmitter<T extends object> = TypedEmitter<MutationEvents<T>>;

/** The set of possible events related to an `Arbor` instance. */
export interface ArborEvents<T extends object> {
  created: () => void;
  connected: (plugin: ArborPlugin<T>) => void;
  added: <R>(d: AttributeDefinition<T, R>, a: Attribute<T, R>) => void;
  initialized: (reificationOptions: Partial<ReificationOptions>) => void;
  invocation: <R>(d: AttributeDefinition<T, R>, n: T, result: R) => void;
  evaluation: <R>(a: Attribute<T, R>, n: T, result: R) => void;
}

/** A subset of the event emmiter interface that is read only. */
export type ArborMonitor<T extends object> = Pick<
  ArborEmitter<T>,
  "on" | "once" | "off" | "removeListener"
>;

/** A typed event emitter that specifically handles the event described by the `ArborEvents` interfaces. */
export type ArborEmitter<T extends object> = TypedEmitter<ArborEvents<T>>;

/** A function for creating typed event emitters in a typesafe way */
export function typedEmitter<T>(): TypedEmitter<T> {
  return new EventEmitter() as unknown as TypedEmitter<T>;
}
