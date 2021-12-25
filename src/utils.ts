import { ScalarFunction } from "./kinds/attributes";
import { ListChildren } from "./arbor";

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

export function mustGet<T, R>(m: Map<T, R>, key: T): R {
  const ret = m.get(key);
  if (ret === undefined) throw new Error(`Missing key`);
  return ret;
}

/**
 * Walk the specified tree starting at node `cur`
 * @param cur Node we start walking from
 * @param tree The tree we are walking
 * @param f Function to evaluate at each node
 */
export function walkTree<T>(cur: T, list: ListChildren<T>, f: (x: T) => void) {
  f(cur);
  const children = list(cur);
  if (Array.isArray(children)) {
    /** If this is an indexed tree... */
    for (const child of children) {
      walkTree(child, list, f);
    }
  } else {
    /** If this tree has named children */
    for (const child of Object.entries(children)) {
      walkTree(child[1], list, f);
    }
  }
}

export function childrenOfNode<T>(list: ListChildren<T>, cur: T): Array<T> {
  const children = list(cur);
  return Array.isArray(children)
    ? children
    : Object.entries(children).map((x) => x[1]);
}
