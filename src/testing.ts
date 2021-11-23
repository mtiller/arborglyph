import { IndexedChildren, NamedChildren } from "./arbor";

export type SimpleBinaryTree =
  | { type: "fork"; left: SimpleBinaryTree; right: SimpleBinaryTree }
  | { type: "leaf"; value: number };

export const fork = (
  l: SimpleBinaryTree,
  r: SimpleBinaryTree
): SimpleBinaryTree => ({
  type: "fork",
  left: l,
  right: r,
});

export const leaf = (n: number): SimpleBinaryTree => ({
  type: "leaf",
  value: n,
});

export const indexedBinaryChildren: IndexedChildren<SimpleBinaryTree> = (
  n: SimpleBinaryTree
) => (n.type == "fork" ? [n.left, n.right] : []);

export function findChild(
  t: SimpleBinaryTree,
  path: Array<"left" | "right">
): SimpleBinaryTree {
  if (path.length === 0) return t;
  if (t.type === "leaf") throw new Error("Expected fork, found leaf");
  const [next, ...rest] = path;
  if (next === "left") {
    return findChild(t.left, rest);
  }
  if (next === "right") {
    return findChild(t.right, rest);
  }
  throw new Error(`Unexpect path element ${next} for node of type ${t.type}`);
}

export const namedBinaryChildren: NamedChildren<SimpleBinaryTree> = (
  n: SimpleBinaryTree
): Record<string, SimpleBinaryTree> =>
  n.type == "fork" ? { left: n.left, right: n.right } : {};

/**
 *                   .
 *                 /   \
 *                .     .
 *               / \   / \
 *              7   . 4   .
 *                 / \   / \
 *                .   3  1  .
 *               / \       / \
 *              5   9     6   8
 */
export const sampleTree1 = fork(
  fork(leaf(7), fork(fork(leaf(5), leaf(9)), leaf(3))),
  fork(leaf(4), fork(leaf(1), fork(leaf(6), leaf(8))))
);
