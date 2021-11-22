import { Maybe } from "purify-ts/Maybe";
import { InheritedArgs, InheritedAttributeEvaluator } from "./inherited";
import { SimpleBinaryTree } from "./testing";

/**
 * This file contains definitions of common attributes.
 */
export function evalParent(
  x: InheritedArgs<SimpleBinaryTree, Maybe<SimpleBinaryTree>>
): Maybe<SimpleBinaryTree> {
  return x.parent.map((v) => v.node);
}

export const gevalParent = <T extends object>(
  x: InheritedArgs<T, Maybe<T>>
): Maybe<T> => {
  return x.parent.map((v) => v.node);
};

export const sevalParent: InheritedAttributeEvaluator<
  SimpleBinaryTree,
  Maybe<SimpleBinaryTree>
> = gevalParent;

export function fevalParent<T>(): InheritedAttributeEvaluator<T, Maybe<T>> {
  return (x: InheritedArgs<T, Maybe<T>>) => {
    return x.parent.map((v) => v.node);
  };
}
