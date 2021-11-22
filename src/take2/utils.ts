import { ScalarFunction } from "./attributes";
import { childrenOfNode, TreeType } from "./treetypes";

export function treeRepr<T, R>(
  tree: TreeType<T>,
  attr: ScalarFunction<T, R>,
  cur: T = tree.root,
  prefix = ""
): string {
  let ret = `${prefix}${attr(cur)}`;
  for (const child of childrenOfNode(tree, cur)) {
    ret += `\n${treeRepr(tree, attr, child, prefix + "  ")}`;
  }
  return ret;
}
