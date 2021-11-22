/** An implementation of the repmin example */

import { fork, leaf } from "./testing";
import { ScalarFunction } from "./attributes";
import { InheritedAttributeEvaluator } from "./inherited";
import { SyntheticAttributeEvaluator } from "./synthetic";
import { indexBinaryTree, sampleTree1, SimpleBinaryTree } from "./testing";
import { WrappedTree } from "./wrapped";

export const evalMin: SyntheticAttributeEvaluator<SimpleBinaryTree, number> = ({
  node,
  attr,
}): number =>
  node.type === "leaf"
    ? node.value
    : Math.min(attr(node.left), attr(node.right));

export function evalGlobmin(
  min: ScalarFunction<SimpleBinaryTree, number>
): InheritedAttributeEvaluator<SimpleBinaryTree, number> {
  return ({ node, parent }) => parent.map((p) => p.attr).orDefault(min(node));
}

export function evalRepmin(
  globmin: ScalarFunction<SimpleBinaryTree, number>
): SyntheticAttributeEvaluator<SimpleBinaryTree, SimpleBinaryTree> {
  return ({ node, attr }) =>
    node.type === "leaf"
      ? leaf(globmin(node))
      : fork(attr(node.left), attr(node.right));
}

describe("Run some repmin test cases", () => {
  it("should handle a basic repmin", () => {
    const tree = new WrappedTree(indexBinaryTree(sampleTree1));
    const min = tree.syn(evalMin);
    const globmin = tree.inh(evalGlobmin(min));
    const repmin = tree.syn(evalRepmin(globmin));

    const result = repmin(tree.tree.root);

    expect(globmin(tree.tree.root)).toEqual(1);
    expect(globmin(tree.tree.root)).toEqual(1);

    // console.log("MIN:\n" + treeRepr(tree.tree, min));
    // console.log("GLOBMIN:\n" + treeRepr(tree.tree, globmin));

    expect(result).toEqual(
      fork(
        fork(leaf(1), fork(fork(leaf(1), leaf(1)), leaf(1))),
        fork(leaf(1), fork(leaf(1), fork(leaf(1), leaf(1))))
      )
    );
  });
});
