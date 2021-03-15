import { TreeMap } from "../maps";
import { ObjectVisitor } from "../visitors";
import { ArborGlyph } from "./arborglyph";
import { observable } from "mobx";

describe("Test compatibility with mobx", () => {
  it("should observe changes in tree attributes", () => {
    const data = observable({
      a: [[{ b: 5 }]],
      c: { d: [{ e: 7, f: 8 }] },
      g: 2,
      h: [9, 2, 3, 4, 5],
    });
    const map = TreeMap.create(new ObjectVisitor(data));
    const attributes = new ArborGlyph(map)
      .synthetic<number>(({ childValues, node }) => {
        console.log("Calling for " + JSON.stringify(node));
        return typeof node === "number"
          ? node
          : childValues().reduce((sum, n) => sum + n, 0);
      })
      .named("sum");

    const sum = attributes.attr("sum");
    expect(attributes.queryNode("sum", data)).toEqual(45);
    data.g = 3;
    console.log("Reset");
    sum.invalidate();
    expect(attributes.queryNode("sum", data)).toEqual(46);
  });
});
