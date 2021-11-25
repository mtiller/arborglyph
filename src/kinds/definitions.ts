import { ScalarFunction } from "./attributes";
import { InheritedAttributeEvaluator } from "./inherited";
import { SyntheticAttributeEvaluator } from "./synthetic";

export interface BaseAttributeDefinition<T> {
  prev: AttributeDefinition<T, any>[];
  description: string;
}
export interface SyntheticAttributeDefinition<T, R>
  extends BaseAttributeDefinition<T> {
  type: "syn";
  f: SyntheticAttributeEvaluator<T, R>;
}

export function synthetic<T, R>(
  description: string,
  f: SyntheticAttributeEvaluator<T, R>
): SyntheticAttributeDefinition<T, R> {
  return {
    type: "syn",
    description,
    f,
    prev: [],
  };
}

export interface InheritedAttributeDefinition<T, R>
  extends BaseAttributeDefinition<T> {
  type: "inh";
  f: InheritedAttributeEvaluator<T, R>;
}

export function inherited<T, R>(
  description: string,
  f: InheritedAttributeEvaluator<T, R>
): InheritedAttributeDefinition<T, R> {
  return {
    type: "inh",
    description,
    f,
    prev: [],
  };
}

export interface DerivedAttributeDefinition<T, R>
  extends BaseAttributeDefinition<T> {
  type: "der";
  f: ScalarFunction<T, R>;
}

export function derived<T, R>(
  description: string,
  f: ScalarFunction<T, R>
): DerivedAttributeDefinition<T, R> {
  return {
    type: "der",
    description,
    f,
    prev: [],
  };
}

export interface TransformerAttributeDefinition<T, I, O>
  extends BaseAttributeDefinition<T> {
  type: "trans";
  attr: AttributeDefinition<T, I>;
  f: ScalarFunction<I, O>;
}

export function transformer<T, I, O>(
  attr: AttributeDefinition<T, I>,
  name: string,
  f: ScalarFunction<I, O>
): TransformerAttributeDefinition<T, I, O> {
  return {
    type: "trans",
    description: `${name} transformer applied to ${attr.description}`,
    attr,
    f,
    prev: [attr],
  };
}

export type AttributeDefinition<T, R> =
  | SyntheticAttributeDefinition<T, R>
  | InheritedAttributeDefinition<T, R>
  | DerivedAttributeDefinition<T, R>
  | TransformerAttributeDefinition<T, any, R>;