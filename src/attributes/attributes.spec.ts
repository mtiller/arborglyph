import { TreeMap } from "../maps/treemap";
import { ObjectVisitor } from "../visitors/object";
import { ArborGlyph } from "./arborglyph";

describe("Create a few attributed trees", () => {
  const data = {
    a: [[{ b: 5 }]],
    c: { d: [{ e: 7, f: 8 }] },
    g: 2,
  };
  it("should create a basic attributed tree with just built-in attributes", async () => {
    const map = await TreeMap.create(new ObjectVisitor(data));
    const attributes = new ArborGlyph(map);
    expect([...attributes.keys]).toEqual([]);
  });
  it("should create an attributed tree with a synthetic attribute", async () => {
    const map = await TreeMap.create(new ObjectVisitor(data));
    const x = Object.entries({ a: 5, b: "hello" });
    const init = new ArborGlyph(map).synthetic<"childCount", number>(
      "childCount",
      (childValues): number => childValues.length
    );

    const attributes = init.synthetic(
      "maxChild",
      (childValues, childIds, attrs) =>
        childIds.reduce(
          (p, id): number =>
            attrs.childCount(id) > p ? attrs.childCount(id) : p,
          -Infinity
        )
    );
    expect(attributes.keys).toContain("childCount");
    // expect(attributes.eval("childCount", "$")).toEqual(3);
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
