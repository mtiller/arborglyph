import { SyntheticAttributeEvaluator } from "../kinds/synthetic";

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
