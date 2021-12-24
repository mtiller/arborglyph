import { Nothing } from "purify-ts/Maybe";
import {
  findChild,
  indexedBinaryChildren,
  namedBinaryChildren,
  sampleTree1,
  SimpleBinaryTree,
} from "../testing";
import { Arbor } from "../arbor";
import { evalDepth } from "../attributes/depth";
import { evalParent } from "../attributes/parent";
import { CounterPlugin } from "../plugins/counter";

describe("Test inherited attribute functionalty", () => {
  it("should find the parents of a sample tree with named children", () => {
    const tree = new Arbor(sampleTree1, namedBinaryChildren);
    const parentAttr = tree.add(evalParent());

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
    const parentAttr = tree.add(evalParent());

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
    const tree = new Arbor(sampleTree1, indexedBinaryChildren);
    // Memoize (should be default) but not eager.
    const p = evalParent<SimpleBinaryTree>();
    const parentAttr = tree.add(p);

    const rrrr = findChild(sampleTree1, ["right", "right", "right", "right"]);
    const prrrr = parentAttr(rrrr);
    expect(prrrr.isJust()).toEqual(true);
    expect(p.count).toEqual(15);

    parentAttr(rrrr);
    expect(p.count).toEqual(15);
  });

  it("should find the parents of a sample tree with indexed children and memoize them after traversing entire tree", () => {
    const stats = new CounterPlugin<SimpleBinaryTree>();
    const tree = new Arbor(sampleTree1, indexedBinaryChildren, {
      plugins: [stats],
    });

    const p = evalParent<SimpleBinaryTree>();
    const parentAttr = tree.add(p);

    const rrrr = findChild(sampleTree1, ["right", "right", "right", "right"]);
    expect(stats.invocations(p)).toEqual(15);
    const prrrr = parentAttr(rrrr);
    parentAttr(rrrr);
    expect(prrrr.isJust()).toEqual(true);
    expect(stats.invocations(p)).toEqual(15);
  });

  it("should find the depth of a sample tree", () => {
    const tree = new Arbor(sampleTree1, namedBinaryChildren);
    const parentAttr = tree.add(evalDepth());

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
