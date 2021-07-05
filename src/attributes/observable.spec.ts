import { TreeMap } from "../maps";
import { ObjectVisitor } from "../visitors";
import { ArborGlyph } from "./arborglyph";
import {
  action,
  autorun,
  makeAutoObservable,
  observable,
  extendObservable,
  reaction,
  intercept,
  observe,
  when,
} from "mobx";
import { synthetic } from "./synthetic";
import { isObject } from "../util";

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
    const map = TreeMap.create(new ObjectVisitor(data, isObject));

    const sum = synthetic<"sum", any, {}, number>(
      "sum",
      ({ children, node }) => {
        console.log("Evaluating sum for ", JSON.stringify(node));
        let ret = 0;
        for (const p in node) {
          if (typeof node[p] === "number") ret += node[p];
        }
        for (const c of children) {
          ret += c.sum;
        }
        return ret;
      }
    );

    const attributes = new ArborGlyph(map).add(sum).done()

    autorun(() => {
      console.log("Change");
    });

    expect(data.a[0][0].b).toEqual(5)
    expect(attributes.anno(data.a[0][0]).sum).toEqual(5)
    expect(attributes.anno(data).sum).toEqual(45);
    console.log("Reset");
    data.a[0][0].b = 6;
    expect(data.a[0][0].b).toEqual(6)
    expect(attributes.anno(data.a[0][0]).sum).toEqual(6)
    expect(attributes.anno(data).sum).toEqual(46);
  });

  it("should observe changes in tree structure", () => {
    const data = makeAutoObservable({
      a: [[{ b: 5 }]],
      c: { d: [{ e: 7, f: 8 }] },
      g: 2,
      h: [9, 2, 3, 4, 5],
    }, {}, { deep: true, proxy: true });
    const map = TreeMap.create(new ObjectVisitor(data, isObject));

    const sum = synthetic<"sum", any, {}, number>(
      "sum",
      ({ children, node }) => {
        console.log("Evaluating sum for ", JSON.stringify(node));
        let ret = 0;
        for (const p in node) {
          if (typeof node[p] === "number") ret += node[p];
        }
        for (const c of children) {
          ret += c.sum;
        }
        return ret;
      }
    );

    const attributes = new ArborGlyph(map).add(sum).done()

    autorun(() => {
      console.log("Change");
    });

    expect(data.a[0][0].b).toEqual(5)
    expect(attributes.anno(data.a[0][0]).sum).toEqual(5)
    expect(attributes.anno(data).sum).toEqual(45);
    reaction(() => data, (v, pv, c) => {
      console.log("data changed!");
      console.log(v);
    })

    console.log("Reset");
    // NB - Changes of this type really change the complete structure of the tree.
    // Obviously, starting from scratch (re-walking the tree, identifying nodes,
    // annotating nodes) is simplest.  But the lingering question is...is there some
    // way we could "loop back" through the tree walking and retriggering annotations
    // only for the nodes that changed?  We could perhaps use MobX to observe the 
    // structural changes so we know the minimum amount of re-work required.  But
    // that currently isn't implemented which is why this particular case fails.
    const setA = action(() => { 
      data.a = [[{ b: 6 }]]
      map.rewalk();
    })
    setA();

    // NB - By rewalking (above) and then reannotating, this system handles the change.  So
    // the challenge here is to find a way to handle this situation automatically.
    attributes.annotateNode(data.a[0][0]);
    attributes.annotateNode(data.a[0]);
    attributes.annotateNode(data.a);
    // data.a = [[{ b: 6 }]];
    expect(data.a[0][0].b).toEqual(6)
    // This fails because data.a[0][0] isn't annotated.  Even if we attempt to
    // manually re-annotate it, it isn't recognized as part of the (original)
    // tree.
    expect(attributes.anno(data.a[0][0]).sum).toEqual(6)
    expect(attributes.anno(data.a[0]).sum).toEqual(6)
    expect(attributes.anno(data).sum).toEqual(46);
  });

  it.skip("should handle proxy objects", () => {
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
