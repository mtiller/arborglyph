import { Maybe, Nothing } from "purify-ts/Maybe";
import { InheritedAttribute, reifyInheritedAttribute } from "./inherited";
import {
  findChild,
  indexBinaryTree,
  sampleTree1,
  SimpleBinaryTree,
} from "./testing";

describe("Test inherited attribute functionalty", () => {
  it("should find the parents of a sample tree with indexed children", () => {
    const tree = indexBinaryTree(sampleTree1);
    const parentFunc: InheritedAttribute<
      SimpleBinaryTree,
      Maybe<SimpleBinaryTree>
    > = ({ parent }) => parent.map((x) => x.node);
    const parentAttr = reifyInheritedAttribute(tree, parentFunc);

    expect(parentAttr(tree.root)).toEqual(Nothing);

    const l = findChild(sampleTree1, ["left"]);

    const pl = parentAttr(l);
    expect(pl.isJust()).toEqual(true);
    expect(pl.unsafeCoerce()).toEqual(tree.root);

    const ll = findChild(sampleTree1, ["left", "left"]);
    const pll = parentAttr(ll);
    expect(pll.isJust()).toEqual(true);
    expect(ll.type).toEqual("leaf");
    if (ll.type === "leaf") {
      expect(ll.value).toEqual(7);
    }

    const rrrr = findChild(sampleTree1, ["right", "right", "right", "right"]);
    const prrrr = parentAttr(rrrr);
    expect(prrrr.isJust()).toEqual(true);
    expect(rrrr.type).toEqual("leaf");
    if (rrrr.type === "leaf") {
      expect(rrrr.value).toEqual(8);
    }
  });
});
