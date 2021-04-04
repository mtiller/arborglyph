import { NamedChildren } from "../../visitors";

export type Tree =
  | { type: "fork"; left: Tree; right: Tree }
  | { type: "leaf"; value: number };

export const fork = (l: Tree, r: Tree): Tree => ({
  type: "fork",
  left: l,
  right: r,
});
export const leaf = (n: number): Tree => ({ type: "leaf", value: n });

export const treeChildren: NamedChildren<Tree> = (x) =>
  x.type === "leaf" ? {} : { left: x.left, right: x.right };
