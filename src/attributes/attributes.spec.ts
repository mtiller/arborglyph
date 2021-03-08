import { TreeMap } from "../maps/treemap";
import { ObjectVisitor } from "../visitors/object";
import { ArborGlyph } from "./arborglyph";

describe("Create a few attributed trees", () => {
  const data = {
    a: [[{ b: 5 }]],
    c: { d: [{ e: 7, f: 8 }] },
    g: 2,
    h: [1, 2, 3, 4, 5],
  };
  it("should create a basic attributed tree with just built-in attributes", async () => {
    const map = await TreeMap.create(new ObjectVisitor(data));
    const attributes = new ArborGlyph(map);

    expect([...attributes.keys]).toEqual([]);
  });
  it("should create an attributed tree with a synthetic attribute", async () => {
    const map = await TreeMap.create(new ObjectVisitor(data));

    const init = new ArborGlyph(map).synthetic(
      "childCount",
      (childValues) => childValues.length
    );

    const attributes = init.synthetic("maxChild", (_, childIds, attrs) =>
      childIds.reduce(
        (p, id): number =>
          attrs.childCount(id) > p ? attrs.childCount(id) : p,
        0
      )
    );

    expect(attributes.keys).toContain("childCount");
    expect(attributes.keys).toContain("maxChild");
    expect(attributes.query("childCount", "$")).toEqual(4);
    expect(attributes.query("maxChild", "$")).toEqual(5);
  });
  it("should create an attributed tree with an inherted attribute", async () => {
    const map = await TreeMap.create(new ObjectVisitor(data));
    const attributes = new ArborGlyph(map);
  });

  it("should create an attributed tree with a root attribute", async () => {
    const map = await TreeMap.create(new ObjectVisitor(data));
    const attributes = new ArborGlyph(map);
  });

  it("should create an attributed tree with a tree attribute", async () => {
    const map = await TreeMap.create(new ObjectVisitor(data));
    const attributes = new ArborGlyph(map);
  });

  it("should create an attributed tree with at least one attribute of each type", async () => {
    const map = await TreeMap.create(new ObjectVisitor(data));
    const attributes = new ArborGlyph(map);
  });
});
