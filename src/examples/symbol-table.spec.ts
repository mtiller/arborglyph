import { Just, Maybe, Nothing } from "purify-ts/Maybe";
import { Arbor } from "../arbor";
import { subTable, symbolTableEvaluator } from "../attributes/name-map";
import { evalPath } from "../attributes/path";
import { ArborEvents } from "../events";
import { AttributeDefinition, derived, synthetic } from "../kinds/definitions";
import {
  LeafNode,
  namedBinaryChildren,
  sampleTree1,
  SimpleBinaryTree,
} from "../testing";
import { mustGet } from "../utils";

describe("Example of building a symbol table", () => {
  it("should build a symbol table based on path to each node", () => {
    const tree = new Arbor(sampleTree1, namedBinaryChildren);

    const path = tree.add(evalPath());
    const table = tree.add(
      synthetic("symbol table", symbolTableEvaluator(path))
    );

    const rtable = table(tree.root);
    expect(new Set([...table(tree.root).keys()])).toEqual(new Set(allNodes));
    const rrlNode = mustGet(rtable, "root/right/right/left");
    expect(path(rrlNode)).toEqual("root/right/right/left");
  });
  it("should build a symbol table only for leaf nodes", () => {
    const tree = new Arbor(sampleTree1, namedBinaryChildren);

    const path = tree.add(evalPath());
    const pathDef: AttributeDefinition<
      SimpleBinaryTree,
      Maybe<string>
    > = derived("leaf path", (node: SimpleBinaryTree) =>
      node.type === "leaf" ? Just(path(node)) : Nothing
    );
    const leafpath = tree.add(pathDef);
    const table = tree.add(
      synthetic("symbol table", symbolTableEvaluator(leafpath))
    );

    // TODO: Create primitives so we know the values in the map can be narrowed to Leaf
    const rtable = table(tree.root);
    expect(new Set([...table(tree.root).keys()])).toEqual(new Set(leafNodes));
    const rrlNode = mustGet(rtable, "root/right/right/left");
    expect(path(rrlNode)).toEqual("root/right/right/left");
  });
  it("should build a symbol table only for leaf nodes of a given type", () => {
    const tree = new Arbor(sampleTree1, namedBinaryChildren);

    const path = tree.add(evalPath());
    const table = tree.add(
      subTable(path, (x): x is LeafNode => x.type === "leaf")
    );

    const rtable = table(tree.root);
    expect(new Set([...table(tree.root).keys()])).toEqual(new Set(leafNodes));
    const rrlNode = mustGet(rtable, "root/right/right/left");
    expect(path(rrlNode)).toEqual("root/right/right/left");
  });
});

const allNodes = [
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
];

const leafNodes = [
  "root/left/left",
  "root/left/right/left/left",
  "root/left/right/left/right",
  "root/left/right/right",
  "root/right/left",
  "root/right/right/left",
  "root/right/right/right/left",
  "root/right/right/right/right",
];
