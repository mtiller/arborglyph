import { InheritedAttributeEvaluator } from "../kinds/inherited";

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
