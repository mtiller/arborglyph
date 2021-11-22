import { Maybe } from "purify-ts/Maybe";
import { InheritedArgs, InheritedAttributeEvaluator } from "./inherited";
import { SimpleBinaryTree } from "./testing";
import { TreeType } from "./treetypes";

/**
 * This file contains definitions of common attributes.
 */

/**
 * Returns a function that evaluates to the parent of the current node. This is
 * effectively just surfacing information we collect during tree walking so it
 * can be exposed as an attribute.
 */
export function evalParent<T>(): InheritedAttributeEvaluator<T, Maybe<T>> {
  return (node) => node.parent.map((v) => v.node);
}

/**
 * Returns a function that computes the depth of a given node.
 */
export function evalDepth<T>(): InheritedAttributeEvaluator<T, number> {
  return (node) =>
    node.parent.caseOf({
      Nothing: () => 0,
      Just: (p) => p.attr + 1,
    });
}

export const gevalDepth: InheritedAttributeEvaluator<object, number> = (node) =>
  node.parent.caseOf({
    Nothing: () => 0,
    Just: (p) => p.attr + 1,
  });
