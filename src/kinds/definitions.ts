import { ScalarFunction } from "./attributes";
import { InheritedAttributeEvaluator } from "./inherited";
import { ReificationOptions } from "./options";
import { SyntheticAttributeEvaluator } from "./synthetic";

export interface BaseAttributeDefinition<T> {
  description: string;
}

export interface SyntheticAttributeDefinition<T, R>
  extends BaseAttributeDefinition<T> {
  type: "syn";
  f: SyntheticAttributeEvaluator<T, R>;
  opts: Partial<ReificationOptions>;
}

export function synthetic<T, R>(
  description: string,
  f: SyntheticAttributeEvaluator<T, R>,
  opts?: Partial<ReificationOptions>
): SyntheticAttributeDefinition<T, R> {
  return {
    type: "syn",
    description,
    f,
    opts: opts ?? {},
  };
}

export interface InheritedAttributeDefinition<T, R>
  extends BaseAttributeDefinition<T> {
  type: "inh";
  f: InheritedAttributeEvaluator<T, R>;
  opts: Partial<InheritedOptions>;
}

export interface InheritedOptions {
  /** Whether the inherited attribute should be eagerly evaluated (default: true) */
  eager: boolean;
  /** Whether the inherited attribute should be cached (default: true) */
  cached: boolean;
}

export function inherited<T, R>(
  description: string,
  f: InheritedAttributeEvaluator<T, R>,
  opts?: Partial<InheritedOptions>
): InheritedAttributeDefinition<T, R> {
  return {
    type: "inh",
    description,
    f: f,
    opts: opts ?? {},
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
  };
}

export type AttributeDefinition<T, R> =
  | SyntheticAttributeDefinition<T, R>
  | InheritedAttributeDefinition<T, R>
  | DerivedAttributeDefinition<T, R>
  | TransformerAttributeDefinition<T, any, R>;

export type AttributeEvaluator<T, R> =
  | SyntheticAttributeEvaluator<T, R>
  | InheritedAttributeEvaluator<T, R>
  | ScalarFunction<T, R>;
