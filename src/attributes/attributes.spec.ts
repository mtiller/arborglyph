import { TreeMap } from "../maps/treemap";
import { GenericVisitor, NamedChildren } from "../visitors/generic";
import { ObjectVisitor } from "../visitors/object";
import { ArborGlyph } from "./arborglyph";

export type Tree =
  | { type: "fork"; left: Tree; right: Tree }
  | { type: "leaf"; value: number };

const fork = (l: Tree, r: Tree): Tree => ({ type: "fork", left: l, right: r });
const leaf = (n: number): Tree => ({ type: "leaf", value: n });

const treeChildren: NamedChildren<Tree> = (x: Tree): { [key: string]: Tree } =>
  x.type === "leaf" ? {} : { left: x.left, right: x.right };

describe("Create a few attributed trees", () => {
  const data = {
    a: [[{ b: 5 }]],
    c: { d: [{ e: 7, f: 8 }] },
    g: 2,
    h: [9, 2, 3, 4, 5],
  };
  it("should create a basic attributed tree with just built-in attributes", async () => {
    const map = await TreeMap.create(new ObjectVisitor(data));
    const attributes = new ArborGlyph(map);

    expect([...attributes.attrs]).toEqual([]);
  });
  it("should create an attributed tree with a synthetic attribute", async () => {
    const map = await TreeMap.create(new ObjectVisitor(data));

    const init = new ArborGlyph(map)
      .synthetic<number>(({ childIds }) => childIds.length)
      .named("childCount");

    const attributes = init
      .synthetic(({ childIds, attrs }) =>
        childIds.reduce(
          (p, id): number =>
            attrs.childCount(id) > p ? attrs.childCount(id) : p,
          0
        )
      )
      .named("maxChild");

    expect(attributes.attrs).toContain("childCount");
    expect(attributes.attrs).toContain("maxChild");
    expect(attributes.query("childCount", "$")).toEqual(4);
    expect(attributes.query("maxChild", "$")).toEqual(5);
  });
  it("should create an attributed tree with an inherted attribute", async () => {
    const map = await TreeMap.create(new ObjectVisitor(data));
    const attributes = new ArborGlyph(map)
      .inherited<number>(({ parentValue }) =>
        parentValue.map((_) => _ + 1).orDefault(0)
      )
      .named("depth");

    expect(attributes.query("depth", "$")).toEqual(0);
    expect(attributes.query("depth", "$.a")).toEqual(1);
    expect(attributes.query("depth", "$.c.d.0.e")).toEqual(4);
    expect(attributes.query("depth", "$.h")).toEqual(1);
  });

  it("should honor memoize flag evaluations", async () => {
    const map = await TreeMap.create(new ObjectVisitor(data));
    const calls: string[] = [];
    let attributes = new ArborGlyph(map)
      .inherited<number>(
        ({ parentValue, nid }) => {
          calls.push(`nomemo:${nid}`);
          return parentValue.map((_) => _ + 1).orDefault(0);
        },
        { memoize: false }
      )
      .named("depth")
      .inherited<number>(
        ({ parentValue, nid }) => {
          calls.push(`memo:${nid}`);
          return parentValue.map((_) => _ + 1).orDefault(0);
        },
        { memoize: true }
      )
      .named("depthMemo");

    expect(attributes.query("depth", "$")).toEqual(0);
    expect(attributes.query("depth", "$")).toEqual(0);
    expect(calls).toEqual(["nomemo:$", "nomemo:$"]);
    expect(attributes.query("depthMemo", "$")).toEqual(0);
    expect(attributes.query("depthMemo", "$")).toEqual(0);
    expect(calls).toEqual(["nomemo:$", "nomemo:$", "memo:$"]);
    expect(attributes.query("depthMemo", "$.c.d.0.e")).toEqual(4);
    expect(calls).toEqual([
      "nomemo:$",
      "nomemo:$",
      "memo:$",
      "memo:$.c",
      "memo:$.c.d",
      "memo:$.c.d.0",
      "memo:$.c.d.0.e",
    ]);
    expect(attributes.query("depthMemo", "$.c.d")).toEqual(2);
    expect(calls).toEqual([
      "nomemo:$",
      "nomemo:$",
      "memo:$",
      "memo:$.c",
      "memo:$.c.d",
      "memo:$.c.d.0",
      "memo:$.c.d.0.e",
    ]);
  });

  it("should create an attributed tree with a repmin attribute", async () => {
    const data = fork(leaf(3), fork(leaf(2), leaf(10)));
    const solution = fork(leaf(2), fork(leaf(2), leaf(2)));
    const map = await TreeMap.create(new GenericVisitor(data, treeChildren));

    const attributes = new ArborGlyph(map)
      .synthetic<number>(({ childValues, node }) =>
        node.type === "leaf" ? node.value : Math.min(...childValues)
      )
      .named("min")
      .inherited<number>(({ parentValue, attrs, nid }) =>
        parentValue.orDefault(attrs.min(nid))
      )
      .named("globmin")
      .synthetic<Tree>(({ childAttrs, node, attrs, nid }) =>
        node.type === "leaf"
          ? leaf(attrs.globmin(nid))
          : fork(childAttrs(node.left), childAttrs(node.right))
      )
      .named("repmin");

    expect(attributes.query("min", "$")).toEqual(2);
    expect(attributes.query("globmin", "$.right.left")).toEqual(2);
    expect(attributes.query("repmin", "$")).toEqual(solution);
    expect(attributes.queryNode("repmin", data)).toEqual(solution);
  });
});
