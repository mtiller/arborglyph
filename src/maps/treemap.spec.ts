import { ObjectVisitor } from "../visitors/object";
import { TreeMap } from "./treemap";

describe("Test the treemap functionality", () => {
  it("should populate itself from an object", async () => {
    const data = {
      a: "a",
      b: "b",
      c: {
        d: "d",
        e: "e",
      },
    };
    const visitor = new ObjectVisitor(data);
    const map = await TreeMap.create(visitor);
    expect([...map.keys]).toEqual(["$", "$.a", "$.b", "$.c", "$.c.d", "$.c.e"]);
  });

  it("should catch funny names that produce duplicate entries", async () => {
    const data = {
      a: "a",
      "c.d": "b",
      c: {
        d: "d",
        e: "e",
      },
    };
    const visitor = new ObjectVisitor(data);
    expect(() => TreeMap.create(visitor)).rejects.toThrowError(
      "Map already contains an entry for this key"
    );
  });
  it("should allow different name mangling schemes to avoid name collisions", async () => {
    const data = {
      a: "a",
      "c.d": "b",
      c: {
        d: "d",
        e: "e",
      },
    };
    const visitor = new ObjectVisitor(data, (p, c) => `${p}/${c}`);
    const map = await TreeMap.create(visitor);
    expect([...map.keys]).toEqual([
      "$",
      "$/a",
      "$/c.d",
      "$/c",
      "$/c/d",
      "$/c/e",
    ]);
  });
});
