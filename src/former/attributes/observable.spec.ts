import { TreeMap } from "../maps";
import { ObjectVisitor } from "../visitors";
import { ArborGlyph } from "./arborglyph";
import {
  action,
  autorun,
  IReactionDisposer,
  makeAutoObservable,
  observable,
  reaction,
} from "mobx";
import { synthetic } from "./synthetic";
import { isObject } from "../util";

describe("Test compatibility with mobx", () => {
  it("should allow adding computed via a new object", () => {
    const data = observable({ a: 5, b: 7 });
    let count = 0;
    reaction(
      () => data.a,
      () => {
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
    action(() => { foo.a = 5} )();
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
    reaction(
      () => data.a,
      () => {
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

    expect(data.a[0][0].b).toEqual(5)
    expect(attributes.anno(data.a[0][0]).sum).toEqual(5)
    expect(attributes.anno(data).sum).toEqual(45);
    data.a[0][0].b = 6;
    expect(data.a[0][0].b).toEqual(6)
    expect(attributes.anno(data.a[0][0]).sum).toEqual(6)
    expect(attributes.anno(data).sum).toEqual(46);
  });

  it("should allow changes in tree structure", () => {
    const data = makeAutoObservable({
      a: [[{ b: 5 }]],
      c: { d: [{ e: 7, f: 8 }] },
      g: 2,
      h: [9, 2, 3, 4, 5],
    });
    const map = TreeMap.create(new ObjectVisitor(data, isObject));

    const sum = synthetic<"sum", any, {}, number>(
      "sum",
      ({ children, node }) => {
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

    expect(data.a[0][0].b).toEqual(5)
    expect(attributes.anno(data.a[0][0]).sum).toEqual(5)
    expect(attributes.anno(data).sum).toEqual(45);

    const nn = map.nodes.size;
    /** 
     * What is essential here is that when we make a change
     * to the **topology** of the tree, we must adjust the
     * underlying tree map and ensure all "new" nodes in the
     * tree are annotated.
     */
    action(() => {
      data.a[0] = [{ b: 6 }]
      attributes.reannotate(data.a)
    })();
    expect(map.nodes.size).toEqual(nn);

    expect(data.a[0][0].b).toEqual(6)
    expect(attributes.anno(data.a[0][0]).sum).toEqual(6)
    expect(attributes.anno(data.a[0]).sum).toEqual(6)
    expect(attributes.anno(data).sum).toEqual(46);
  });

  it("should observe changes in tree structure", () => {
    const data = makeAutoObservable({
      a: [[{ b: 5 }]],
      c: { d: [{ e: 7, f: 8 }] },
      g: 2,
      h: [9, 2, 3, 4, 5],
    }, {}, { deep: true, proxy: true });
    const visitor = new ObjectVisitor(data, isObject);
    const map = TreeMap.create(visitor);

    const sum = synthetic<"sum", any, {}, number>(
      "sum",
      ({ children, node }) => {
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

    expect(data.a[0][0].b).toEqual(5)
    expect(attributes.anno(data.a[0][0]).sum).toEqual(5)
    expect(attributes.anno(data).sum).toEqual(45);

    const reactions: IReactionDisposer[] = [];
    [...map.nodes].forEach(n => {
      reactions.push(reaction(() => visitor.children(n), () => { 
        attributes.reannotate(n);
      }));
    })

    const nn = map.nodes.size;
    /** 
     * What is essential here is that when we make a change
     * to the **topology** of the tree, we must adjust the
     * underlying tree map and ensure all "new" nodes in the
     * tree are annotated.
     */
    action(() => {
      data.a[0] = [{ b: 6 }]
      // This works, but we want to find a way to automate this.
      // attributes.reannotate(map.root);
    })();
    expect(map.nodes.size).toEqual(nn);

    expect(data.a[0][0].b).toEqual(6)
    expect(attributes.anno(data.a[0][0]).sum).toEqual(6)
    expect(attributes.anno(data.a[0]).sum).toEqual(6)
    expect(attributes.anno(data).sum).toEqual(46);

    reactions.forEach(x => x());
  });

  it("should catch cases where the tree hasn't been properly reannotated", () => {
    const data = makeAutoObservable({
      a: [[{ b: 5 }]],
      c: { d: [{ e: 7, f: 8 }] },
      g: 2,
      h: [9, 2, 3, 4, 5],
    }, {}, { deep: true, proxy: true });
    const visitor = new ObjectVisitor(data, isObject);
    const map = TreeMap.create(visitor);

    const sum = synthetic<"sum", any, {}, number>(
      "sum",
      ({ children, node }) => {
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

    expect(data.a[0][0].b).toEqual(5)
    expect(attributes.anno(data.a[0][0]).sum).toEqual(5)
    expect(attributes.anno(data).sum).toEqual(45);

    const nn = map.nodes.size;
    /** 
     * What is essential here is that when we make a change
     * to the **topology** of the tree, we must adjust the
     * underlying tree map and ensure all "new" nodes in the
     * tree are annotated.
     */
    action(() => {
      data.a[0] = [{ b: 6 }]
    })();
    expect(map.nodes.size).toEqual(nn);

    expect(data.a[0][0].b).toEqual(6)
    expect(() => attributes.anno(data.a[0][0]).sum).toThrow("Node is not annotated.  Did you make a topological change and forget to run 'reannotate()?");
  })

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
