import { ScalarFunction } from "./kinds/attributes";
import { childrenOfNode, ListChildren } from "./arbor";

export function treeRepr<T, R>(
  cur: T,
  list: ListChildren<T>,
  attr: ScalarFunction<T, R>,
  prefix = ""
): string {
  let ret = `${prefix}${attr(cur)}`;
  for (const child of childrenOfNode(list, cur)) {
    ret += `\n${treeRepr(child, list, attr, prefix + "  ")}`;
  }
  return ret;
}

export function assertUnreachable(x: never): never {
  throw new Error("Didn't expect to get here");
}
