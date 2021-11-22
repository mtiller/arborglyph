import { Maybe, Nothing } from "purify-ts/Maybe";
import { evalParent, fevalParent, gevalParent, sevalParent } from "./common";
import {
  ParentAttribute,
  reifyInheritedAttribute,
  WrappedTree,
} from "./inherited";
import {
  findChild,
  indexBinaryTree,
  namedBinaryTree,
  sampleTree1,
  SimpleBinaryTree,
} from "./testing";

describe("Test inherited attribute functionalty", () => {
  it("should find the parents of a sample tree with named children", () => {
    const tree = namedBinaryTree(sampleTree1);
    const wp = new WrappedTree(tree);
    const parentAttr = reifyInheritedAttribute(
      fevalParent<SimpleBinaryTree>(),
      tree
    );
    const pa = wp.inh(sevalParent);

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
  it("should find the parents of a sample tree with indexed children", () => {
    const tree = indexBinaryTree(sampleTree1);

    const parentFunc: ParentAttribute<SimpleBinaryTree> = ({ parent }) =>
      parent.map((x) => x.node);
    const parentAttr = reifyInheritedAttribute(parentFunc, tree);

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

  it("should find the parents of a sample tree with indexed children and memoize them", () => {
    const tree = indexBinaryTree(sampleTree1);
    let count = 0;
    const parentFunc: ParentAttribute<SimpleBinaryTree> = ({ parent }) => {
      count++;
      return parent.map((x) => x.node);
    };

    const parentAttr = reifyInheritedAttribute(parentFunc, tree, {
      memoize: "yes",
    });

    const rrrr = findChild(sampleTree1, ["right", "right", "right", "right"]);
    const prrrr = parentAttr(rrrr);
    expect(count).toEqual(1);
    const prrrr2 = parentAttr(rrrr);
    expect(prrrr.isJust()).toEqual(true);
    expect(count).toEqual(1);
  });

  it("should find the parents of a sample tree with indexed children and memoize them after traversing entire tree", () => {
    const tree = indexBinaryTree(sampleTree1);
    let count = 0;
    const parentFunc: ParentAttribute<SimpleBinaryTree> = ({ parent }) => {
      count++;
      return parent.map((x) => x.node);
    };

    const parentAttr = reifyInheritedAttribute(parentFunc, tree, {
      memoize: "pre",
    });

    const rrrr = findChild(sampleTree1, ["right", "right", "right", "right"]);
    expect(count).toEqual(15);
    const prrrr = parentAttr(rrrr);
    const prrrr2 = parentAttr(rrrr);
    expect(prrrr.isJust()).toEqual(true);
    expect(count).toEqual(15);
  });
});
