import { TreeMap } from "../maps/treemap";
import { GenericVisitor } from "../visitors/generic";
import { ObjectVisitor } from "../visitors/object";
import { ArborGlyph } from "./arborglyph";
import { derived } from "./derived";
import { inherited } from "./inherited";
import { synthetic } from "./synthetic";
import {
  fork,
  leaf,
  Tree,
  treeChildren,
  min,
  globmin,
  repmin,
} from "./testing/tree";

describe("Create a few attributed trees", () => {
  const data = {
    a: [[{ b: 5 }], { j: 5 }],
    c: { d: [{ e: 7, f: 8 }] },
    g: 2,
    h: [9, 2, 3, 4, 5],
  };

  const childCount = synthetic<"childCount", object, {}, number>(
    "childCount",
    ({ childIds }) => childIds.length
  );
  const maxChild = synthetic<
    "maxChild",
    object,
    { childCount: number },
    number
  >("maxChild", ({ childIds, attrs }) =>
    childIds.reduce(
      (p, id): number => (attrs.childCount(id) > p ? attrs.childCount(id) : p),
      0
    )
  );

  it("should create a basic attributed tree with just built-in attributes", () => {
    const map = TreeMap.create<object>(new ObjectVisitor(data));
    const attributes = new ArborGlyph(map);

    expect([...attributes.attrs]).toEqual([]);
  });
  it("should create a derived attribute", () => {
    const map = TreeMap.create(new ObjectVisitor(data));

    const type = derived("type", ({ node }) => typeof node);
    const attributes = new ArborGlyph(map).add(type);
    expect(attributes.query("type", "$")).toEqual("object");
    expect(attributes.query("type", "$.a")).toEqual("object");
  });
  it("should create an attributed tree with asynthetic attribute", () => {
    const map = TreeMap.create(new ObjectVisitor(data));

    const init = new ArborGlyph(map).add(childCount);

    const attributes = init.add(maxChild);

    expect(attributes.attrs).toContain("childCount");
    expect(attributes.attrs).toContain("maxChild");
    expect([...map.ids]).toEqual([
      "$",
      "$.a",
      "$.a.0",
      "$.a.0.0",
      "$.a.1",
      "$.c",
      "$.c.d",
      "$.c.d.0",
      "$.h",
    ]);
    expect(attributes.query("childCount", "$")).toEqual(3);
    expect(attributes.query("childCount", "$.a")).toEqual(2);
    expect(attributes.query("childCount", "$.a.0")).toEqual(1);
    expect(attributes.query("maxChild", "$")).toEqual(2);
  });

  it("should honor memoize flag evaluations", () => {
    const map = TreeMap.create(new ObjectVisitor(data));
    const calls: string[] = [];

    const depth = inherited<"depth", any, {}, number>(
      "depth",
      ({ parentValue, nid }) => {
        calls.push(`nomemo:${nid}`);
        return parentValue.map((_) => _ + 1).orDefault(0);
      },
      false
    );

    const depthMemo = inherited<"depthMemo", any, {}, number>(
      "depthMemo",
      ({ parentValue, nid }) => {
        calls.push(`memo:${nid}`);
        return parentValue.map((_) => _ + 1).orDefault(0);
      },
      true
    );

    let attributes = new ArborGlyph(map).add(depth).add(depthMemo);

    expect(attributes.query("depth", "$")).toEqual(0);
    expect(attributes.query("depth", "$")).toEqual(0);
    expect(calls).toEqual(["nomemo:$", "nomemo:$"]);
    expect(attributes.query("depthMemo", "$")).toEqual(0);
    expect(attributes.query("depthMemo", "$")).toEqual(0);
    expect(calls).toEqual(["nomemo:$", "nomemo:$", "memo:$"]);
    expect(attributes.query("depthMemo", "$.a.0.0")).toEqual(3);
    expect(calls).toEqual([
      "nomemo:$",
      "nomemo:$",
      "memo:$",
      "memo:$.a",
      "memo:$.a.0",
      "memo:$.a.0.0",
    ]);
    expect(attributes.query("depthMemo", "$.a.0")).toEqual(2);
    expect(calls).toEqual([
      "nomemo:$",
      "nomemo:$",
      "memo:$",
      "memo:$.a",
      "memo:$.a.0",
      "memo:$.a.0.0",
    ]);
  });

  it("should create an attributed tree with a repmin attribute", () => {
    const data = fork(leaf(3), fork(leaf(2), leaf(10)));
    const solution = fork(leaf(2), fork(leaf(2), leaf(2)));
    const map = TreeMap.create<Tree>(new GenericVisitor(data, treeChildren));

    const base = new ArborGlyph(map);
    // This should be an error if uncommented...
    // const foo = base.add(globmin);
    const wmin = base.add(min);
    const wgmin = wmin.add(globmin);
    const wrmin = wgmin.add(repmin);
    const attributes = wrmin;

    expect(attributes.query("min", "$")).toEqual(2);
    expect(attributes.query("globmin", "$.right.left")).toEqual(2);
    expect(attributes.query("repmin", "$")).toEqual(solution);
    expect(attributes.queryNode("repmin", data)).toEqual(solution);
  });
});
