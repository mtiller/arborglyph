import { TreeMap } from "../maps/treemap";
import { GenericVisitor, ObjectVisitor } from "../visitors";
import { ArborGlyph } from "./arborglyph";
import { fork, leaf, Tree, treeChildren } from "./testing/tree";

describe("Test proxy functionality", () => {
  it("should proxy all normal requests", () => {
    const data = fork(leaf(3), fork(leaf(2), leaf(10)));
    const solution = fork(leaf(2), fork(leaf(2), leaf(2)));
    const map = TreeMap.create(new GenericVisitor(data, treeChildren));

    const attributes = new ArborGlyph(map)
      .synthetic<"min", number>("min", ({ childAttrs, node }) =>
        node.type === "leaf"
          ? node.value
          : Math.min(childAttrs(node.left), childAttrs(node.right))
      )
      .inherited<number>(({ parentValue, attrs, nid }) =>
        parentValue.orDefault(attrs.min(nid))
      )
      .named("globmin")
      .synthetic<"repmin", Tree>("repmin", ({ childAttrs, node, attrs, nid }) =>
        node.type === "leaf"
          ? leaf(attrs.globmin(nid))
          : fork(childAttrs(node.left), childAttrs(node.right))
      );

    const root = attributes.proxy(data);
    const root2 = attributes.proxy(root);
    expect(root).toEqual(root2);
    expect(root.min).toEqual(2);
    expect(root.right.left.globmin).toEqual(2);
    expect(root.repmin).toEqual(solution);
  });
  it("should anno all normal requests", () => {
    const data = fork(leaf(3), fork(leaf(2), leaf(10)));
    const solution = fork(leaf(2), fork(leaf(2), leaf(2)));
    const map = TreeMap.create(new GenericVisitor(data, treeChildren));

    const attributes = new ArborGlyph(map)
      .synthetic<"min", number>("min", ({ childAttrs, node }) =>
        node.type === "leaf"
          ? node.value
          : Math.min(childAttrs(node.left), childAttrs(node.right))
      )
      .inherited<number>(({ parentValue, attrs, nid }) =>
        parentValue.orDefault(attrs.min(nid))
      )
      .named("globmin")
      .synthetic<"repmin", Tree>("repmin", ({ childAttrs, node, attrs, nid }) =>
        node.type === "leaf"
          ? leaf(attrs.globmin(nid))
          : fork(childAttrs(node.left), childAttrs(node.right))
      );

    const root = attributes.anno(data);
    const root2 = attributes.anno(root);
    expect(root).toEqual(root2);
    expect(root.min).toEqual(2);
    expect(attributes.anno(root.right.left).globmin).toEqual(2);
    expect(root.repmin).toEqual(solution);
  });
});
