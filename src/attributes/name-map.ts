import { SyntheticAttributeEvaluator } from "..";
import { ScalarFunction } from "../kinds/attributes";

export function symbolTableEvaluator<T>(
  namer: ScalarFunction<T, string>
): SyntheticAttributeEvaluator<T, Map<string, T>> {
  return ({ node, children }) =>
    children.reduce((p, c) => {
      c.attr.forEach((v, k) => p.set(k, v));
      return p;
    }, new Map<string, T>([[namer(node), node]]));
}

// TODO: Conditional name map
