/** An implementation of the repmin example */

import { fork, indexedBinaryChildren, leaf, LeafNode } from "../testing";
import { sampleTree1, SimpleBinaryTree } from "../testing";
import { Arbor } from "../arbor";
import { configure } from "mobx";
import { lruPlugin } from "../plugins/lru";
import { CounterPlugin } from "../plugins/counter";
import { subTable } from "../attributes/name-map";
import { evalPath } from "../attributes/path";
import { DebugPlugin } from "../plugins/debug";
import { evalGlobmin, evalMin, evalRepmin } from "./repmin_attrs";

describe("Run some repmin test cases", () => {
  // Being a bit sloppy with MobX here.
  configure({ enforceActions: "never" });

  it("should handle a basic repmin", () => {
    const logger = new DebugPlugin<SimpleBinaryTree>();
    logger.events.push("Pre-Tree");
    expect(logger.events).toMatchSnapshot();
    const stats = new CounterPlugin();
    const tree = new Arbor(sampleTree1, indexedBinaryChildren, {
      plugins: [stats, logger],
    });
    logger.events.push("Post-Tree");
    expect(logger.events).toMatchSnapshot();
    const { globmin, repmin, path } = tree.attach(repminCluster);
    // logger.stringifyNode = path;
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
    const tree = new Arbor(sampleTree1, indexedBinaryChildren, {
      plugins: [stats],
      reification: { memoize: true },
    });
    const { repmin } = tree.attach(repminCluster);

    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(stats.invocations(evalMin)).toEqual(15);
    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(stats.invocations(evalMin)).toEqual(15);
  });

  it("should handle a basic repmin with small caching", () => {
    const stats = new CounterPlugin();
    const tree = new Arbor(sampleTree1, indexedBinaryChildren, {
      plugins: [stats, lruPlugin({ max: 5 })],
    });
    const { repmin } = tree.attach(repminCluster);

    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(stats.invocations(evalMin)).toEqual(42); // Better, but not as good as with weakmap
    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(stats.invocations(evalMin)).toEqual(42);
  });

  it("should handle a basic repmin with large caching", () => {
    const stats = new CounterPlugin();
    const tree = new Arbor(sampleTree1, indexedBinaryChildren, {
      plugins: [stats, lruPlugin({ max: 15 })],
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
  const repmin = tree.add(evalRepmin(globmin));
  const path = tree.add(evalPath());
  const subtable = tree.add(
    subTable(path, (x): x is LeafNode => x.type === "leaf")
  );
  // Invoking an attribute here causes all kinds of premature evaluations
  // which interfere with my ability to test lazy evaluation.
  //const table = subtable(tree.root);

  return { subtable, min, globmin, repmin, path };
}

export function repminResult(x: number) {
  return fork(
    fork(leaf(x), fork(fork(leaf(x), leaf(x)), leaf(x))),
    fork(leaf(x), fork(leaf(x), fork(leaf(x), leaf(x))))
  );
}
