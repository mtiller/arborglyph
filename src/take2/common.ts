import { Maybe } from "purify-ts/Maybe";
import { InheritedArgs, InheritedAttributeEvaluator } from "./inherited";
import { SimpleBinaryTree } from "./testing";
import { TreeType } from "./treetypes";

/**
 * This file contains definitions of common attributes.
 */

/**
 * Given a tree (type), this function returns a function that returns the parent
 * node of any given node.  It is important to understand that while we don't
 * use the value of the argument to this function, it serves to pin down the
 * type parameter.  I tried several ways of writing this to rely strictly on
 * type inferencing, but couldn't get it to work without having to specify lots
 * of explicit type parameters
 */
export function evalParent<T>(
  t: TreeType<T>
): InheritedAttributeEvaluator<T, Maybe<T>> {
  return (x: InheritedArgs<T, Maybe<T>>) => {
    return x.parent.map((v) => v.node);
  };
}
