import { TreeMap } from "../maps/treemap";
import { GenericVisitor, NamedChildren } from "../visitors/generic";
import { ObjectVisitor } from "../visitors/object";
import { ArborGlyph } from "./arborglyph";
import { synthetic } from "./synthetic";
import { fork, leaf, Tree, treeChildren } from "./testing/tree";

describe("Create a few attributed trees", () => {
  const data = {
    a: [[{ b: 5 }]],
    c: { d: [{ e: 7, f: 8 }] },
    g: 2,
    h: [9, 2, 3, 4, 5],
  };
  it("should create a basic attributed tree with just built-in attributes", () => {
    const map = TreeMap.create<object>(new ObjectVisitor(data));
    const attributes = new ArborGlyph(map);

    expect([...attributes.attrs]).toEqual([]);
  });
  it("should create a derived attribute", () => {
    const map = TreeMap.create(new ObjectVisitor(data));
    const attributes = new ArborGlyph(map)
      .derived(({ node }) => typeof node)
      .named("typeof");
    expect(attributes.query("typeof", "$")).toEqual("object");
    expect(attributes.query("typeof", "$.g")).toEqual("number");
    expect(attributes.query("typeof", "$.a")).toEqual("object");
    expect(attributes.query("typeof", "$.h.0")).toEqual("number");
  });
  it("should create an attributed tree with an old style synthetic attribute", () => {
    const map = TreeMap.create(new ObjectVisitor(data));

    const init = new ArborGlyph(map).synthetic<"childCount", number>(
      "childCount",
      ({ childIds }) => childIds.length
    );

    const attributes = init.synthetic<"maxChild", number>(
      "maxChild",
      ({ childIds, attrs }) =>
        childIds.reduce(
          (p, id): number =>
            attrs.childCount(id) > p ? attrs.childCount(id) : p,
          0
        )
    );

    expect(attributes.attrs).toContain("childCount");
    expect(attributes.attrs).toContain("maxChild");
    expect(attributes.query("childCount", "$")).toEqual(4);
    expect(attributes.query("maxChild", "$")).toEqual(5);
  });
  it("should create an attributed tree with a synthetic attribute", () => {
    const map = TreeMap.create(new ObjectVisitor(data));

    const init = new ArborGlyph(map).synthetic<"childCount", number>(
      "childCount",
      ({ childIds }) => childIds.length
    );

    const attributes = init.synthetic("maxChild", ({ childIds, attrs }) =>
      childIds.reduce(
        (p, id): number =>
          attrs.childCount(id) > p ? attrs.childCount(id) : p,
        0
      )
    );

    expect(attributes.attrs).toContain("childCount");
    expect(attributes.attrs).toContain("maxChild");
    expect(attributes.query("childCount", "$")).toEqual(4);
    expect(attributes.query("maxChild", "$")).toEqual(5);
  });
  it("should create an attributed tree with an inherted attribute", () => {
    const map = TreeMap.create(new ObjectVisitor(data));
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

  it("should honor memoize flag evaluations", () => {
    const map = TreeMap.create(new ObjectVisitor(data));
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

  it("should create an attributed tree with a repmin attribute", () => {
    const data = fork(leaf(3), fork(leaf(2), leaf(10)));
    const solution = fork(leaf(2), fork(leaf(2), leaf(2)));
    const map = TreeMap.create(new GenericVisitor(data, treeChildren));

    // const min2 = synthetic
    //   .named("min")
    //   .dependsOn<{ childCount: number }>()
    //   .computedBy(({ node: Tree, childAttrs }) => {
    //     node.type === "leaf"
    //       ? node.value
    //       : Math.min(childAttrs(node.left), childAttrs(node.right));
    //   });
    const min = synthetic<"min", Tree, {}, number>(
      "min",
      ({ node, childAttrs }): number =>
        node.type === "leaf"
          ? node.value
          : Math.min(childAttrs(node.left), childAttrs(node.right))
    );
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

    expect(attributes.query("min", "$")).toEqual(2);
    expect(attributes.query("globmin", "$.right.left")).toEqual(2);
    expect(attributes.query("repmin", "$")).toEqual(solution);
    expect(attributes.queryNode("repmin", data)).toEqual(solution);
  });
});
