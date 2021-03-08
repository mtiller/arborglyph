import { Maybe } from "purify-ts/Maybe";
import { TreeMap } from "../maps/treemap";
import { GenericVisitor, NamedChildren } from "../visitors/generic";
import { ObjectVisitor } from "../visitors/object";
import { ArborGlyph } from "./arborglyph";
import { synOpts } from "./synthetic";

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

    const init = new ArborGlyph(map).synthetic(
      "childCount",
      ({ childIds }): number => childIds.length,
      synOpts<number>({})
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
  it("should create an attributed tree with an inherted attribute", async () => {
    const map = await TreeMap.create(new ObjectVisitor(data));
    const attributes = new ArborGlyph(map).inherited(
      "depth",
      (parent: Maybe<number>): number => parent.map((_) => _ + 1).orDefault(0),
      {}
    );

    expect(attributes.query("depth", "$")).toEqual(0);
    expect(attributes.query("depth", "$.a")).toEqual(1);
    expect(attributes.query("depth", "$.c.d.0.e")).toEqual(4);
    expect(attributes.query("depth", "$.h")).toEqual(1);
  });

  it("should create an attributed tree with a repmin attribute", async () => {
    const data = fork(leaf(3), fork(leaf(2), leaf(10)));
    const map = await TreeMap.create(new GenericVisitor(data, treeChildren));

    const attributes = new ArborGlyph(map)
      .synthetic(
        "min",
        ({ childValues, node }) =>
          node.type === "leaf" ? node.value : Math.min(...childValues),
        synOpts<number>({})
      )
      .inherited("globmin", (parent: Maybe<number>, _pid, attrs, _node, nid) =>
        parent.orDefault(attrs.min(nid))
      )
      .synthetic(
        "repmin",
        ({ childAttrs, node, attrs, nid }) =>
          node.type === "leaf"
            ? leaf(attrs.globmin(nid))
            : fork(childAttrs(node.left), childAttrs(node.right)),
        synOpts<Tree>({})
      );

    expect(attributes.query("min", "$")).toEqual(2);
    expect(attributes.query("globmin", "$.right.left")).toEqual(2);
    expect(attributes.query("repmin", "$")).toEqual(
      fork(leaf(2), fork(leaf(2), leaf(2)))
    );
  });
});
