import { Nothing } from "purify-ts/Maybe";
import { evalParent, gevalDepth } from "./common";
import { ParentAttribute, reifyInheritedAttribute } from "./inherited";
import {
  findChild,
  indexBinaryTree,
  namedBinaryTree,
  sampleTree1,
  SimpleBinaryTree,
} from "./testing";
import { WrappedTree } from "./wrapped";

describe("Test inherited attribute functionalty", () => {
  it("should find the parents of a sample tree with named children", () => {
    const tree = namedBinaryTree(sampleTree1);
    const parentAttr = reifyInheritedAttribute(tree, evalParent());

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

    const wp = new WrappedTree(tree);
    const parentAttr = wp.inh(evalParent());

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

    const parentAttr = reifyInheritedAttribute(tree, parentFunc, {
      memoize: "weakmap",
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

    const parentAttr = reifyInheritedAttribute(tree, parentFunc, {
      memoize: "weakmap",
      pre: true,
    });

    const rrrr = findChild(sampleTree1, ["right", "right", "right", "right"]);
    expect(count).toEqual(15);
    const prrrr = parentAttr(rrrr);
    const prrrr2 = parentAttr(rrrr);
    expect(prrrr.isJust()).toEqual(true);
    expect(count).toEqual(15);
  });

  it("should find the depth of a sample tree", () => {
    const tree = namedBinaryTree(sampleTree1);
    const parentAttr = reifyInheritedAttribute(tree, gevalDepth);

    expect(parentAttr(tree.root)).toEqual(0);

    const l = findChild(sampleTree1, ["left"]);

    const dl = parentAttr(l);
    expect(dl).toEqual(1);

    const ll = findChild(sampleTree1, ["left", "left"]);
    const dll = parentAttr(ll);
    expect(dll).toEqual(2);

    const rrrr = findChild(sampleTree1, ["right", "right", "right", "right"]);
    const drrrr = parentAttr(rrrr);
    expect(drrrr).toEqual(4);
  });
});
