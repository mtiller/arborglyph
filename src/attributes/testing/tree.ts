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
  ({ node, childAttrs }): number =>
    node.type === "leaf"
      ? node.value
      : Math.min(childAttrs(node.left), childAttrs(node.right))
);

export const globmin = inherited<"globmin", Tree, { min: number }, number>(
  "globmin",
  ({ parentValue, attrs, nid }) => parentValue.orDefault(attrs.min(nid))
);

export const repmin = synthetic<"repmin", Tree, { globmin: number }, Tree>(
  "repmin",
  ({ childAttrs, node, attrs, nid }) =>
    node.type === "leaf"
      ? leaf(attrs.globmin(nid))
      : fork(childAttrs(node.left), childAttrs(node.right))
);
