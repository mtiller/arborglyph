import { TreeMap } from "../maps/treemap";
import { GenericVisitor } from "../visitors";
import { ArborGlyph } from "./arborglyph";
import {
  fork,
  leaf,
  min,
  globmin,
  repmin,
  Tree,
  treeChildren,
} from "./testing/tree";

describe("Test annotations functionality", () => {
  it("should anno all normal requests", () => {
    const data = fork(leaf(3), fork(leaf(2), leaf(10)));
    const solution = fork(leaf(2), fork(leaf(2), leaf(2)));
    const map = TreeMap.create(new GenericVisitor(data, treeChildren));

    const attributes = new ArborGlyph(map)
      .add(min)
      .add(globmin)
      .add(repmin)
      .done();

    const root = attributes.anno(data);
    const root2 = attributes.anno(root);
    expect(root).toEqual(root2);
    expect(root.min).toEqual(2);
    expect(attributes.anno(root.right.left).globmin).toEqual(2);
    expect(root.repmin).toEqual(solution);
  });
});
