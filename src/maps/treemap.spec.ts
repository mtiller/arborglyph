import { ObjectVisitor } from "../visitors/object";
import { TreeMap } from "./treemap";

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
    const visitor = new ObjectVisitor(data);
    const map = TreeMap.create(visitor);
    expect([...map.ids]).toEqual(["$", "$.c"]);
  });

  it("should catch funny names that produce duplicate entries", () => {
    const data = {
      "c.d": { d: "d" },
      c: {
        d: { x: "x" },
      },
    };
    const visitor = new ObjectVisitor(data);
    expect(() => TreeMap.create(visitor)).toThrowError(
      "Setting parent node for $.c.d to $.c when it already has a parent"
    );
  });
  it("should allow different name mangling schemes to avoid name collisions", () => {
    const data = {
      "c.d": { d: "d" },
      c: {
        d: { x: "x" },
      },
    };
    const visitor = new ObjectVisitor(data, (p, c) => `${p}/${c}`);
    const map = TreeMap.create(visitor);
    expect([...map.ids]).toEqual(["$", "$/c.d", "$/c", "$/c/d"]);
  });
});
