import { ScalarFunction } from "../kinds/attributes";
import { inherited, synthetic } from "../kinds/definitions";
import { fork, leaf, SimpleBinaryTree } from "../testing";

export const evalMin = synthetic<SimpleBinaryTree, number>(
  "min",
  ({ node, attr }) =>
    node.type === "leaf"
      ? node.value
      : Math.min(attr(node.left), attr(node.right))
);

export function evalGlobmin<R>(min: ScalarFunction<SimpleBinaryTree, R>) {
  return inherited<SimpleBinaryTree, R>("global min", ({ node, parent }) =>
    parent.map((p) => p.attr).orDefault(min(node))
  );
}

export function evalRepmin(globmin: ScalarFunction<SimpleBinaryTree, number>) {
  return synthetic<SimpleBinaryTree, SimpleBinaryTree>(
    "repmin",
    ({ node, attr }) =>
      node.type === "leaf"
        ? leaf(globmin(node))
        : fork(attr(node.left), attr(node.right))
  );
}
