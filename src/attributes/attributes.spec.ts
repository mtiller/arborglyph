import { TreeMap } from "../maps/treemap";
import { isObject } from "../util";
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
    ({ children }) => children.length
  );
  const maxChild = synthetic<
    "maxChild",
    object,
    { childCount: number },
    number
  >("maxChild", ({ children }) =>
    children.reduce(
      (p, child): number => (child.childCount > p ? child.childCount : p),
      0
    )
  );

  it("should create a basic attributed tree with just built-in attributes", () => {
    const map = TreeMap.create<object>(new ObjectVisitor(data, isObject));
    const attributes = new ArborGlyph(map);

    expect([...attributes.attrs]).toEqual([]);
  });
  it("should create a derived attribute", () => {
    const map = TreeMap.create(new ObjectVisitor(data, isObject));

    const type = derived("type", ({ node }) => typeof node);
    const attributes = new ArborGlyph(map).add(type).done();
    expect(attributes.anno(data).type).toEqual("object");
    expect(attributes.anno(data.a).type).toEqual("object");
  });
  it("should create an attributed tree with asynthetic attribute", () => {
    const map = TreeMap.create(new ObjectVisitor(data, isObject));

    const init = new ArborGlyph(map).add(childCount);

    const attributes = init.add(maxChild).done();

    expect(attributes.attrs).toContain("childCount");
    expect(attributes.attrs).toContain("maxChild");
    expect(map.nodes.size).toEqual(9);
    // expect([...map.ids]).toEqual([
    //   "$",
    //   "$.a",
    //   "$.a.0",
    //   "$.a.0.0",
    //   "$.a.1",
    //   "$.c",
    //   "$.c.d",
    //   "$.c.d.0",
    //   "$.h",
    // ]);
    expect(attributes.anno(data).childCount).toEqual(3);
    expect(attributes.anno(data.a).childCount).toEqual(2);
    expect(attributes.anno(data.a[0]).childCount).toEqual(1);
    expect(attributes.anno(data).maxChild).toEqual(2);
    // expect(attributes.query("childCount", "$")).toEqual(3);
    // expect(attributes.query("childCount", "$.a")).toEqual(2);
    // expect(attributes.query("childCount", "$.a.0")).toEqual(1);
    // expect(attributes.query("maxChild", "$")).toEqual(2);
  });

  it("should honor memoize flag evaluations", () => {
    const map = TreeMap.create(new ObjectVisitor(data, isObject));
    const calls: string[] = [];

    const id = inherited<"id", any, {}, string>("id", ({ parent, node }) =>
      parent
        .map((p) => {
          for (const prop in p) {
            if (p[prop] === node) return `${p.id}.${prop}`;
          }
          throw new Error(`Node is not a child of this parent`);
        })
        .orDefault("$")
    );
    const depth = inherited<"depth", any, { id: string }, number>(
      "depth",
      ({ parent, node }) => {
        calls.push(`nomemo:${node.id}`);
        return parent.map((p) => p.depth + 1).orDefault(0);
      },
      false
    );

    const depthMemo = inherited<"depthMemo", any, { id: string }, number>(
      "depthMemo",
      ({ parent, node }) => {
        calls.push(`memo:${node.id}`);
        return parent.map((p) => p.depthMemo + 1).orDefault(0);
      },
      true
    );

    let attributes = new ArborGlyph(map)
      .add(id)
      .add(depth)
      .add(depthMemo)
      .done();

    expect(attributes.anno(data).depth).toEqual(0);
    expect(attributes.anno(data).depth).toEqual(0);
    expect(calls).toEqual(["nomemo:$", "nomemo:$"]);
    expect(attributes.anno(data).depthMemo).toEqual(0);
    // expect(attributes.query("depthMemo", "$")).toEqual(0);
    expect(attributes.anno(data).depthMemo).toEqual(0);
    // expect(attributes.query("depthMemo", "$")).toEqual(0);
    expect(calls).toEqual(["nomemo:$", "nomemo:$", "memo:$"]);
    expect(attributes.anno((data as any).a[0][0]).depthMemo).toEqual(3);
    // expect(attributes.query("depthMemo", "$.a.0.0")).toEqual(3);
    expect(calls).toEqual([
      "nomemo:$",
      "nomemo:$",
      "memo:$",
      "memo:$.a.0.0",
      "memo:$.a.0",
      "memo:$.a",
    ]);
    expect(attributes.anno(data.a[0]).depthMemo).toEqual(2);
    // expect(attributes.query("depthMemo", "$.a.0")).toEqual(2);
    expect(calls).toEqual([
      "nomemo:$",
      "nomemo:$",
      "memo:$",
      "memo:$.a.0.0",
      "memo:$.a.0",
      "memo:$.a",
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
    const attributes = wrmin.done();

    expect(attributes.anno(data).min).toEqual(2);
    expect(attributes.anno((data as any).right.left).globmin).toEqual(2);
    expect(attributes.anno(data).repmin).toEqual(solution);
  });
});
