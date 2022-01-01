import { Maybe } from "purify-ts/Maybe";

/** A parent function takes a given node and returns its parent, if it has one. */
export type ParentFunc<T> = (x: T) => Maybe<T>;

/** This is the information available when evaluating an inherited attribute. */
export interface InheritedArgs<T, R> {
  /** The node for which we are evaluating the attribute. */
  node: T;
  /** Information about the parent (if this node has a parent) */
  parent: Maybe<ParentInformation<T, R>>;
}

/**
 * This is the information the inherited attribute evaluator is given about the
 * parent node **if it exists**.
 **/
export interface ParentInformation<T, R> {
  node: T;
  attr: R;
}

/** A parent attribute is a special case of an inherited attribute */
export type ParentAttribute<T> = InheritedAttributeEvaluator<T, Maybe<T>>;

/**
 * An inherited attribute evaluator takes `InheritedArgs` as an argument and
 * returns the attribute value.
 **/
export type InheritedAttributeEvaluator<T, R> = (
  args: InheritedArgs<T, R>
) => R;
