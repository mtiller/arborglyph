import { Nothing } from "purify-ts/Maybe";
import {
  findChild,
  indexedBinaryChildren,
  namedBinaryChildren,
  sampleTree1,
} from "../testing";
import { Arbor } from "../arbor";
import { evalDepth } from "../attributes/depth";
import { CounterPlugin } from "../plugins/counter";

describe("Test inherited attribute functionalty", () => {
  it("should find the parents of a sample tree with named children", () => {
    const tree = new Arbor(sampleTree1, namedBinaryChildren);
    const parentAttr = tree.parent;

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
    const tree = new Arbor(sampleTree1, indexedBinaryChildren);
    const parentAttr = tree.parent;

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
    const stats = new CounterPlugin();
    const tree = new Arbor(sampleTree1, indexedBinaryChildren, {
      plugins: [stats],
    });
    // Memoize (should be default) but not eager.
    const parentAttr = tree.parent;

    const rrrr = findChild(sampleTree1, ["right", "right", "right", "right"]);
    const prrrr = parentAttr(rrrr);
    expect(prrrr.isJust()).toEqual(true);
    parentAttr(rrrr);
  });

  it("should find the parents of a sample tree with indexed children and memoize them after traversing entire tree", () => {
    const stats = new CounterPlugin();
    const tree = new Arbor(sampleTree1, indexedBinaryChildren, {
      plugins: [stats],
    });

    const parentAttr = tree.parent;

    const rrrr = findChild(sampleTree1, ["right", "right", "right", "right"]);
    const prrrr = parentAttr(rrrr);
    parentAttr(rrrr);
    expect(prrrr.isJust()).toEqual(true);
  });

  it("should find the depth of a sample tree", () => {
    const tree = new Arbor(sampleTree1, namedBinaryChildren);
    const depthAttr = tree.add(evalDepth());

    expect(depthAttr(tree.root)).toEqual(0);

    const l = findChild(sampleTree1, ["left"]);

    const dl = depthAttr(l);
    expect(dl).toEqual(1);

    const ll = findChild(sampleTree1, ["left", "left"]);
    const dll = depthAttr(ll);
    expect(dll).toEqual(2);

    const rrrr = findChild(sampleTree1, ["right", "right", "right", "right"]);
    const drrrr = depthAttr(rrrr);
    expect(drrrr).toEqual(4);
  });
});
