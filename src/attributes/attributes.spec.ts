import { TreeMap } from "../maps/treemap";
import { ObjectVisitor } from "../visitors/object";
import { ArborGlyph } from "./arborglyph";
import { Attribute } from "./attributes";
import { SyntheticFunction } from "./synthetic";

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
    const init = new ArborGlyph(map).synthetic(
      "childCount",
      (childValues: number[]) => childValues.length
    );

    const f: SyntheticFunction<
      any,
      { childCount: Attribute<number> },
      number
    > = (_childValues, childIds, attrs): number =>
      childIds.reduce(
        (p, id): number =>
          attrs.childCount(id) > p ? attrs.childCount(id) : p,
        -Infinity
      );

    const attributes = init.synthetic("maxChild", f);

    const y = init.foo("foo", (childValues: number[]) => 0);
    expect(attributes.keys).toContain("childCount");
    expect(attributes.query("childCount", "$")).toEqual(3);
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
