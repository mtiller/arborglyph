import { ScalarFunction } from "./attributes";
import { InheritedAttributeEvaluator } from "./inherited";
import { SyntheticAttributeEvaluator } from "./synthetic";

export interface SyntheticAttributeDefinition<T, R> {
  type: "syn";
  f: SyntheticAttributeEvaluator<T, R>;
}

export function synthetic<T, R>(
  f: SyntheticAttributeEvaluator<T, R>
): SyntheticAttributeDefinition<T, R> {
  return {
    type: "syn",
    f,
  };
}

export interface InheritedAttributeDefinition<T, R> {
  type: "inh";
  f: InheritedAttributeEvaluator<T, R>;
}

export function inherited<T, R>(
  f: InheritedAttributeEvaluator<T, R>
): InheritedAttributeDefinition<T, R> {
  return {
    type: "inh",
    f,
  };
}

export interface DerivedAttributeDefinition<T, R> {
  type: "der";
  f: ScalarFunction<T, R>;
}

export function derived<T, R>(
  f: ScalarFunction<T, R>
): DerivedAttributeDefinition<T, R> {
  return {
    type: "der",
    f,
  };
}

export interface TransformerAttributeDefinition<T, I, O> {
  type: "trans";
  attr: AttributeDefinition<T, I>;
  f: ScalarFunction<I, O>;
}

export function transformer<T, I, O>(
  attr: AttributeDefinition<T, I>,
  f: ScalarFunction<I, O>
): TransformerAttributeDefinition<T, I, O> {
  return {
    type: "trans",
    attr,
    f,
  };
}

export type AttributeDefinition<T, R> =
  | SyntheticAttributeDefinition<T, R>
  | InheritedAttributeDefinition<T, R>
  | DerivedAttributeDefinition<T, R>
  | TransformerAttributeDefinition<T, any, R>;
