import { TreeMap } from "../maps";
import { ObjectVisitor } from "../visitors";
import { ArborGlyph } from "./arborglyph";
import {
  action,
  autorun,
  makeAutoObservable,
  observable,
  reaction,
} from "mobx";

describe("Test compatibility with mobx", () => {
  it("should allow adding computed via a new object", () => {
    const data = observable({ a: 5, b: 7 });
    let count = 0;
    autorun(() => {
      console.log("running");
    });
    reaction(
      () => data.a,
      () => {
        console.log("reaction");
        count++;
      }
    );
    expect(count).toEqual(0);
    action(() => (data.a = 7))();
    expect(count).toEqual(1);

    /** Make a new object with new properties */
    const foo = makeAutoObservable({
      ...data,
      get c(): number {
        const a = this.a;
        const b = this.b;
        return a + b;
      },
    });
    expect(foo.c).toEqual(14);
    action(() => (foo.a = 5))();
    // expect(count).toEqual(2);
    expect(foo.c).toEqual(12);
  });
  it("should allow adding computed to an existing object", () => {
    const unique = Symbol();
    const data = observable({ a: 5, b: 7 });
    /** Add a getter */
    Object.defineProperty(data, "c", {
      get: function () {
        return this.a + this.b;
      },
    });
    Object.defineProperty(data, unique.valueOf(), {
      get: function () {
        return true;
      },
    });
    expect(data.hasOwnProperty("c")).toEqual(true);
    expect(data.hasOwnProperty(unique.valueOf())).toEqual(true);
    const aug: typeof data & { c: number } = data as any;
    let count = 0;
    autorun(() => {
      console.log("running");
    });
    reaction(
      () => data.a,
      () => {
        console.log("reaction");
        count++;
      }
    );
    expect(count).toEqual(0);
    action(() => (data.a = 7))();
    expect(count).toEqual(1);

    expect(aug.c).toEqual(14);
    action(() => (data.a = 5))();
    expect(count).toEqual(2);
    expect(aug.c).toEqual(12);
  });
  it("should observe changes in tree attributes", () => {
    const data = observable({
      a: [[{ b: 5 }]],
      c: { d: [{ e: 7, f: 8 }] },
      g: 2,
      h: [9, 2, 3, 4, 5],
    });
    const map = TreeMap.create(new ObjectVisitor(data));

    autorun(() => {
      console.log("Change");
    });
    const attributes = new ArborGlyph(map).synthetic<"sum", number>(
      "sum",
      ({ childValues, node }) => {
        // console.log("Calling for " + JSON.stringify(node));
        return typeof node === "number"
          ? node
          : childValues().reduce((sum, n) => sum + n, 0);
      }
    );

    const sum = attributes.attr("sum");
    expect(attributes.queryNode("sum", data)).toEqual(45);
    data.g = 3;
    console.log("Reset");
    // sum.invalidate();
    expect(attributes.queryNode("sum", data)).toEqual(46);
  });

  it("should handle proxy objects", () => {
    const data = { x: 5, y: "hello" };
    const p = observable(
      new Proxy<typeof data & { len: number }>(data as any, {
        has: (target, prop) => {
          console.log("Called for prop ", prop);
          return Reflect.has(target, prop);
        },
        get: (target, prop, receiver) => {
          if (prop === "len") return target.y.length;
          return Reflect.get(target, prop, receiver);
        },
        ownKeys: (target) => {
          console.log("Called ownKeys");
          return [...Reflect.ownKeys(target), "len"];
        },
      })
    );
    let count = 0;

    expect(p).toEqual(data);
    expect(p.len).toEqual(5);

    autorun(() => {
      console.log("change");
      count++;
    });

    expect(count).toEqual(1);

    console.log("Setting y");
    p.y = "test";
    expect(p.len).toEqual(4);

    expect(count).toEqual(2);
  });
});
