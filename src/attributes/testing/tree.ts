import { NamedChildren } from "../../visitors";
import { inherited } from "../inherited";
import { synthetic } from "../synthetic";

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

export const min = synthetic<"min", Tree, {}, number>(
  "min",
  ({ node, anno }): number =>
    node.type === "leaf"
      ? node.value
      : Math.min(anno(node.left).min, anno(node.right).min)
);

export const globmin = inherited<"globmin", Tree, { min: number }, number>(
  "globmin",
  ({ parent, node }) => parent.map((p) => p.min).orDefault(node.min)
);

export const repmin = synthetic<"repmin", Tree, { globmin: number }, Tree>(
  "repmin",
  ({ node, anno }) =>
    node.type === "leaf"
      ? leaf(node.globmin)
      : fork(anno(node.left).repmin, anno(node.right).repmin)
);
