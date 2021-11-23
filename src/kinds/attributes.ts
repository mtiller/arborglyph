import { Arbor } from "../arbor";

/** A scalar function is just a function that takes a single argument that returns a value. */
export type ScalarFunction<T, R> = (x: T) => R;

export interface Attribute<T, R> extends ScalarFunction<T, R> {
  // reroot(): void;
}

export interface AttributeDefinition<T extends object, R> {
  attach(tree: Arbor<T>): Attribute<T, R>;
}
