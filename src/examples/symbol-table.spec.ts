import { SyntheticAttributeEvaluator } from "..";
import { Arbor } from "../arbor";
import { symbolTableEvaluator } from "../attributes/name-map";
import { evalName } from "../attributes/path";
import { ScalarFunction } from "../kinds/attributes";
import { namedBinaryChildren, sampleTree1, SimpleBinaryTree } from "../testing";

describe("Example of building a symbol table", () => {
  it("should build a symbol table based on path to each node", () => {
    const tree = new Arbor(sampleTree1, namedBinaryChildren);

    const path = tree.inh(evalName());
    const table = tree.syn(symbolTableEvaluator(path));

    const rtable = table(tree.root);
    expect(new Set([...table(tree.root).keys()])).toEqual(
      new Set([
        "root",
        "root/left/left",
        "root/left/right/left/left",
        "root/left/right/left/right",
        "root/left/right/left",
        "root/left/right/right",
        "root/left/right",
        "root/left",
        "root/right/left",
        "root/right/right/left",
        "root/right/right/right/left",
        "root/right/right/right/right",
        "root/right/right/right",
        "root/right/right",
        "root/right",
      ])
    );
    const rrlNode = rtable.get("root/right/right/left");
    expect(rrlNode).toBeDefined();
    if (rrlNode === undefined) throw new Error("Expected node, got undefined");
    expect(path(rrlNode)).toEqual("root/right/right/left");
  });
});
