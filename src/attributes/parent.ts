import { Maybe } from "purify-ts/Maybe";
import { InheritedAttributeEvaluator } from "../kinds/inherited";

/**
 * Returns a function that evaluates to the parent of the current node. This is
 * effectively just surfacing information we collect during tree walking so it
 * can be exposed as an attribute.
 */
export function evalParent<T>(): InheritedAttributeEvaluator<T, Maybe<T>> {
  return (node) => node.parent.map((v) => v.node);
}
