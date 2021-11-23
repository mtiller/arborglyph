import { ObjectVisitor } from "../visitors/object";
import { TreeMap } from "./treemap";
import { isObject } from "../util";

describe("Test the treemap functionality", () => {
  it("should populate itself from an object", () => {
    const data = {
      a: "a",
      b: "b",
      c: {
        d: "d",
        e: "e",
      },
    };
    const visitor = new ObjectVisitor(data, isObject);
    const map = TreeMap.create(visitor);
    expect(map.nodes.has(data)).toEqual(true);
    expect(map.nodes.has(data.c)).toEqual(true);
  });

  it("should allow different name mangling schemes to avoid name collisions", () => {
    const data = {
      "c.d": { d: "d" },
      c: {
        d: { x: "x" },
      },
    };
    const visitor = new ObjectVisitor<object>(
      data,
      (n): n is object => typeof n === "object"
    );
    const map = TreeMap.create(visitor);
    expect(map.nodes.has(data)).toEqual(true);
    expect(map.nodes.has(data["c.d"])).toEqual(true);
    expect(map.nodes.has(data.c)).toEqual(true);
    expect(map.nodes.has(data.c.d)).toEqual(true);
  });
});
