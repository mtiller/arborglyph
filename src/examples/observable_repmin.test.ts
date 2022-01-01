/** An implementation of the repmin example */

import {
  findChild,
  fork,
  indexedBinaryChildren,
  leaf,
  LeafNode,
} from "../testing";
import { sampleTree1, SimpleBinaryTree } from "../testing";
import { Arbor } from "../arbor";
import { configure, observable } from "mobx";
import { lruPlugin } from "../plugins/lru";
import { CounterPlugin } from "../plugins/counter";
import { subTable } from "../attributes/name-map";
import { evalPath } from "../attributes/path";
import { DebugPlugin } from "../plugins/debug";
import { evalGlobmin, evalMin, evalRepmin } from "./repmin_attrs";

describe("Run some repmin test cases on mutable trees", () => {
  // Being a bit sloppy with MobX here.
  configure({ enforceActions: "never" });

  it("should handle a basic repmin", () => {
    const logger = new DebugPlugin<SimpleBinaryTree>();
    logger.events.push("Pre-Tree");
    expect(logger.events).toMatchSnapshot();
    const stats = new CounterPlugin();
    const otree = observable(sampleTree1);
    // const otree = sampleTree1;
    const tree = new Arbor(otree, indexedBinaryChildren, {
      plugins: [stats, logger],
      immutable: false,
    });
    logger.events.push("Post-Tree");
    expect(logger.events).toMatchSnapshot();
    const { globmin, repmin, path } = tree.attach(repminCluster);

    // expect(path(tree.root)).toEqual("root");
    // const l = findChild(tree.root, ["left"]);
    // expect(path(l)).toEqual("root/left");

    logger.stringifyNode = path;
    logger.events.push("Post-Attach");
    expect(logger.events).toMatchSnapshot();

    expect(globmin(tree.root)).toEqual(1);
    expect(globmin(tree.root)).toEqual(1);
    logger.events.push("Root Globmin");
    expect(logger.events).toMatchSnapshot();

    expect(repmin(tree.root)).toEqual(repminResult(1));
    logger.events.push("Post root repmin");
    expect(logger.events).toMatchSnapshot();
    expect(stats.invocations(evalMin)).toEqual(53);
    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(stats.invocations(evalMin)).toEqual(53);
  });

  it("should handle a basic repmin with weakmap caching", () => {
    const stats = new CounterPlugin();
    const otree = observable(sampleTree1);
    const tree = new Arbor(otree, indexedBinaryChildren, {
      plugins: [stats],
      reification: { memoize: true },
      immutable: false,
    });
    const { repmin } = tree.attach(repminCluster);

    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(stats.invocations(evalMin)).toEqual(15);
    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(stats.invocations(evalMin)).toEqual(15);
  });

  it("should handle a basic repmin with small caching", () => {
    const stats = new CounterPlugin();
    const otree = observable(sampleTree1);
    const tree = new Arbor(otree, indexedBinaryChildren, {
      plugins: [stats, lruPlugin({ max: 5 })],
      immutable: false,
    });
    const { repmin } = tree.attach(repminCluster);

    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(stats.invocations(evalMin)).toEqual(42); // Better, but not as good as with weakmap
    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(stats.invocations(evalMin)).toEqual(42);
  });

  it("should handle a basic repmin with large caching", () => {
    const stats = new CounterPlugin();
    const otree = observable(sampleTree1);
    const tree = new Arbor(otree, indexedBinaryChildren, {
      plugins: [stats, lruPlugin({ max: 15 })],
      immutable: false,
    });
    const { repmin } = tree.attach(repminCluster);

    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(stats.invocations(evalMin)).toEqual(15); // Matches weak map
    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(stats.invocations(evalMin)).toEqual(15);
  });
});

export function repminCluster(tree: Arbor<SimpleBinaryTree>) {
  const min = tree.add(evalMin);
  const globmin = tree.add(evalGlobmin(min));
  const repminAttr = evalRepmin(globmin);
  const repmin = tree.add(repminAttr, {});
  const path = tree.add(evalPath({ eager: false }));
  const subtable = tree.add(
    subTable(path, (x): x is LeafNode => x.type === "leaf")
  );
  // Invoking an attribute here causes all kinds of premature evaluations
  // which interfere with my ability to test lazy evaluation.
  //const table = subtable(tree.root);

  return { subtable, min, globmin, repmin, path, repminAttr };
}

export function repminResult(x: number) {
  return fork(
    fork(leaf(x), fork(fork(leaf(x), leaf(x)), leaf(x))),
    fork(leaf(x), fork(leaf(x), fork(leaf(x), leaf(x))))
  );
}
