import { Maybe } from "purify-ts/Maybe";
import { ScalarFunction } from "./attributes";
import { InheritedAttributeEvaluator } from "./inherited";
import { SyntheticAttributeEvaluator } from "./synthetic";

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

export function descendents<T>(): SyntheticAttributeEvaluator<T, Set<T>> {
  return (node) => {
    return node.children.reduce<Set<T>>((r, c) => {
      const cdesc = c.attr;
      cdesc.forEach((elem) => {
        r.add(elem);
      });
      r.add(c.node);
      return r;
    }, new Set<T>());
  };
}

export function conditionalDescendents<T, C extends T>(
  pred: (elem: T) => elem is C
): SyntheticAttributeEvaluator<T, Set<C>> {
  return (node) => {
    return node.children.reduce<Set<C>>((r, c) => {
      c.attr.forEach((elem) => {
        if (pred(elem)) {
          r.add(elem);
        }
      });
      return r;
    }, new Set<C>());
  };
}
