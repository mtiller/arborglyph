/** An implementation of the repmin example */

import {
  findChild,
  fork,
  indexedBinaryChildren,
  leaf,
  LeafNode,
} from "../testing";
import { ScalarFunction } from "../kinds/attributes";
import { sampleTree1, SimpleBinaryTree } from "../testing";
import { Arbor } from "../arbor";
import { configure, observable } from "mobx";
import {
  computableValue,
  computable,
  mobxPlugin,
} from "../plugins/mobx-helpers";
import { inherited, synthetic } from "../kinds/definitions";
import { lruPlugin, memoize, memoizePlugin } from "../plugins/memoize";
import rfdc from "rfdc";
import { CounterPlugin } from "../plugins/debug";
import { subTable } from "../attributes/name-map";
import { evalPath } from "../attributes/path";
import { mustGet } from "../utils";
import { ArborPlugin } from "../plugin";

const clone = rfdc();

export const evalMin = synthetic<SimpleBinaryTree, number>(
  "min",
  ({ node, attr }) =>
    node.type === "leaf"
      ? node.value
      : Math.min(attr(node.left), attr(node.right))
);

export function evalGlobmin<R>(min: ScalarFunction<SimpleBinaryTree, R>) {
  return inherited<SimpleBinaryTree, R>("global min", ({ node, parent }) =>
    parent.map((p) => p.attr).orDefault(min(node))
  );
}

export function evalRepmin(globmin: ScalarFunction<SimpleBinaryTree, number>) {
  return synthetic<SimpleBinaryTree, SimpleBinaryTree>(
    "repmin",
    ({ node, attr }) =>
      node.type === "leaf"
        ? leaf(globmin(node))
        : fork(attr(node.left), attr(node.right))
  );
}

export interface MutableResults {
  initialMinEvals: number;
  secondMinEvals: number;
  thirdMinEvals: number;
  fourthMinEvals: number;
}

function mutableTreeTest(
  results: MutableResults,
  ...plugins: ArborPlugin<SimpleBinaryTree>[]
) {
  const stats = new CounterPlugin<SimpleBinaryTree>();
  const map = new Map<any, number>();
  const tree = new Arbor(clone(sampleTree1), indexedBinaryChildren, {
    plugins: [stats, ...plugins],
  });
  const { table, min, globmin, repmin } = tree.attach(repminCluster);

  expect(map.get(min)).toEqual(undefined);
  const result = repmin(tree.root);

  expect(globmin(tree.root)).toEqual(1);
  expect(map.get(evalMin)).toEqual(results.initialMinEvals);
  expect(globmin(tree.root)).toEqual(1);
  expect(map.get(evalMin)).toEqual(results.secondMinEvals);

  expect(result).toEqual(repminResult(1));

  const minElem = mustGet(table, "root/right/right/left");
  expect(minElem.value).toEqual(1);

  minElem.value = 0;

  expect(repmin(tree.root)).toEqual(repminResult(0));
  expect(map.get(evalMin)).toEqual(results.thirdMinEvals);

  minElem.value = 1;

  expect(repmin(tree.root)).toEqual(repminResult(1));
  expect(map.get(evalMin)).toEqual(results.fourthMinEvals);
}

describe("Run some repmin test cases", () => {
  // Being a bit sloppy with MobX here.
  configure({ enforceActions: "never" });

  it("should handle a basic repmin", () => {
    const stats = new CounterPlugin<SimpleBinaryTree>();
    const tree = new Arbor(sampleTree1, indexedBinaryChildren, {
      plugins: [stats],
    });
    const { globmin, repmin } = tree.attach(repminCluster);

    expect(globmin(tree.root)).toEqual(1);
    expect(globmin(tree.root)).toEqual(1);

    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(stats.invocations(evalMin)).toEqual(53);
    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(stats.invocations(evalMin)).toEqual(53);
  });

  it("should handle a basic repmin with weakmap caching", () => {
    const stats = new CounterPlugin<SimpleBinaryTree>();
    const tree = new Arbor(sampleTree1, indexedBinaryChildren, {
      plugins: [stats],
    });
    const { repmin } = tree.attach(repminCluster);

    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(stats.invocations(evalMin)).toEqual(15);
    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(stats.invocations(evalMin)).toEqual(15);
  });

  it("should handle a basic repmin with small caching", () => {
    const stats = new CounterPlugin<SimpleBinaryTree>();
    const tree = new Arbor(sampleTree1, indexedBinaryChildren, {
      plugins: [stats, lruPlugin({ max: 5 })],
    });
    const { repmin } = tree.attach(repminCluster);

    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(stats.invocations(evalMin)).toEqual(37); // Better, but not as good as with weakmap
    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(stats.invocations(evalMin)).toEqual(37);
  });

  it("should handle a basic repmin with large caching", () => {
    const stats = new CounterPlugin<SimpleBinaryTree>();
    const tree = new Arbor(sampleTree1, indexedBinaryChildren, {
      plugins: [stats, lruPlugin({ max: 15 })],
    });
    const { repmin } = tree.attach(repminCluster);

    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(stats.invocations(evalMin)).toEqual(15); // Matches weak map
    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(stats.invocations(evalMin)).toEqual(15);
  });

  it("should work with mutable trees without mobx", () => {
    mutableTreeTest({
      initialMinEvals: 241,
      secondMinEvals: 256,
      thirdMinEvals: 482,
      fourthMinEvals: 708,
    });
  });

  it("should work with mutable trees with mobx", () => {
    // TODO: Add MobX plugin
    mutableTreeTest(
      {
        initialMinEvals: 35,
        secondMinEvals: 36,
        thirdMinEvals: 70,
        fourthMinEvals: 104,
      },
      mobxPlugin()
    );
  });

  it("should work with mutable trees", () => {
    /** Make our root node observable (mobx will apply this recursively) */
    const root = observable(sampleTree1);

    /** Find the element with the smallest value */
    const minElem = findChild(root, ["right", "right", "left"]);
    expect(minElem.type === "leaf" && minElem.value === 1).toEqual(true);
    if (minElem.type === "fork") throw new Error("Expected a leaf"); // This is just to narrow the type.

    /** Now create a wrapped tree around the observable tree */
    const tree = new Arbor(root, indexedBinaryChildren);
    expect(tree.root).toEqual(root);
    expect(tree.root).toEqual(root);

    const memo = "no" as const;

    /** Now define the min attribute */
    const min = tree.add(
      memoize(computableValue(evalMin, { keepAlive: true }))
    );

    /** Now define the globmin attribute, but we must provide a slightly different function for evaluating the min attribute */
    const globmin = tree.add(computable(evalGlobmin(min)));

    let repminCount = 0;
    /** Finaly, define the repmin attribute (again need to unwrap globmin values) */
    const repmin = tree.add(
      memoize(
        computableValue(
          evalRepmin((x) => {
            repminCount++;
            return globmin(x).get();
          }),
          { keepAlive: true }
        )
      )
    );

    /** Compute the rootMin computed value for the root */
    const rootMin = min(root);
    expect(rootMin.get()).toEqual(1);

    /** Compute the rootGlobmin computed value for the root */
    const rootGlobmin = globmin(root);
    expect(rootGlobmin.get()).toEqual(1);

    /** Compute the rootRepmin computed value for the root */
    const rootRepmin = repmin(root);
    expect(rootRepmin.get()).toEqual(
      fork(
        fork(leaf(1), fork(fork(leaf(1), leaf(1)), leaf(1))),
        fork(leaf(1), fork(leaf(1), fork(leaf(1), leaf(1))))
      )
    );

    const initialRepminCount = repminCount;
    expect(initialRepminCount).toEqual(8);

    /** Requesting the computed value shouldn't cause any more evaluations */
    rootRepmin.get();
    expect(repminCount).toEqual(initialRepminCount);

    /** If we get here, we got the expected result win the min value was 1, now lets change it to zero */
    minElem.value = 0;

    /** Changing the value should cause an additional evalulations yet because of the lazy evaluation */
    expect(repminCount).toEqual(initialRepminCount);

    /**
     * Note, we have not re-evaluated the min(...) attribute!  We are just requesting the value of the
     * already computed rootMin computed value.  This is memoized UNTIL some value that effected the
     * calculation is changed in which case it gets updated automatically (and only if needed).
     */
    expect(rootMin.get()).toEqual(0);

    /** Same with the globmin */
    expect(rootGlobmin.get()).toEqual(0);

    /** And even the repmin tree! */
    expect(rootRepmin.get()).toEqual(repminResult(0));

    /** Only now that we've requested the new rootRepmin should we see more evaluations. */
    expect(repminCount).toEqual(initialRepminCount + 8);

    expect(rootMin.get()).toEqual(0);

    /** Now let's say we change a value that doesn't impact repmin */
    /** Find the element with the smallest value */
    const maxElem = findChild(root, ["left", "right", "left", "right"]);
    expect(maxElem.type === "leaf" && maxElem.value === 9).toEqual(true);
    if (maxElem.type !== "leaf") throw new Error("Expected leaf"); // This is just to narrow the type

    maxElem.value = 12;

    /** And even the repmin tree! */
    expect(rootRepmin.get()).toEqual(repminResult(0));

    /** Only now that we've requested the new rootRepmin should we see more evaluations. */
    expect(repminCount).toEqual(initialRepminCount + 8);

    expect(rootMin.get()).toEqual(0);

    /**
     * If we replace the minimum element with a fork that has a new (different minimum), it should
     * handle the structural change and find the new minimum.
     */

    const minParent = findChild(root, ["right", "right"]);
    expect(minParent.type).toEqual("fork");
    if (minParent.type !== "fork") throw new Error("Expected fork"); // To narrow the type

    /** Now the new min should be -2, but the structure is different */
    minParent.left = fork(leaf(-2), leaf(10));

    expect(rootMin.get()).toEqual(-2);

    expect(rootRepmin.get()).toEqual(
      fork(
        fork(leaf(-2), fork(fork(leaf(-2), leaf(-2)), leaf(-2))),
        fork(leaf(-2), fork(fork(leaf(-2), leaf(-2)), fork(leaf(-2), leaf(-2))))
      )
    );

    /** Only now that we've requested the new rootRepmin should we see more evaluations. */
    expect(repminCount).toEqual(initialRepminCount + 17);
  });
  it("should work with mutable trees and weakmap caching", () => {
    /** Make our root node observable (mobx will apply this recursively) */
    const root = observable(sampleTree1);

    /** Find the element with the smallest value */
    const minElem = findChild(root, ["right", "right", "left"]);
    expect(minElem.type === "leaf" && minElem.value === 1).toEqual(true);
    if (minElem.type === "fork") throw new Error("Expected a leaf"); // This is just to narrow the type.

    /** Now create a wrapped tree around the observable tree */
    const tree = new Arbor(root, indexedBinaryChildren);
    expect(tree.root).toEqual(root);
    expect(tree.root).toEqual(root);

    const memo = "weakmap" as const;

    /** Now define the min attribute */
    const min = tree.add(computable(evalMin));

    /** Now define the globmin attribute, but we must provide a slightly different function for evaluating the min attribute */
    const globmin = tree.add(computable(evalGlobmin(min)));

    let repminCount = 0;
    /** Finaly, define the repmin attribute (again need to unwrap globmin values) */
    const repmin = tree.add(computable(evalRepmin(globmin)));

    /** Compute the rootMin computed value for the root */
    const rootMin = min(root);
    expect(rootMin).toEqual(1);

    /** Compute the rootGlobmin computed value for the root */
    const rootGlobmin = globmin(root);
    expect(rootGlobmin).toEqual(1);

    /** Compute the rootRepmin computed value for the root */
    const rootRepmin = repmin(root);
    expect(rootRepmin).toEqual(
      fork(
        fork(leaf(1), fork(fork(leaf(1), leaf(1)), leaf(1))),
        fork(leaf(1), fork(leaf(1), fork(leaf(1), leaf(1))))
      )
    );

    const initialRepminCount = repminCount;
    expect(initialRepminCount).toEqual(8);

    /** Requesting the computed value shouldn't cause any more evaluations */
    repmin(root);
    expect(repminCount).toEqual(initialRepminCount);

    /** If we get here, we got the expected result win the min value was 1, now lets change it to zero */
    minElem.value = 0;

    /** Changing the value should cause an additional evalulations yet because of the lazy evaluation */
    expect(repminCount).toEqual(initialRepminCount);

    /**
     * Note, we have not re-evaluated the min(...) attribute!  We are just requesting the value of the
     * already computed rootMin computed value.  This is memoized UNTIL some value that effected the
     * calculation is changed in which case it gets updated automatically (and only if needed).
     */
    expect(min(root)).toEqual(0);

    /** Same with the globmin */
    expect(globmin(root)).toEqual(0);

    /** And even the repmin tree! */
    expect(repmin(root)).toEqual(
      fork(
        fork(leaf(0), fork(fork(leaf(0), leaf(0)), leaf(0))),
        fork(leaf(0), fork(leaf(0), fork(leaf(0), leaf(0))))
      )
    );

    /** Only now that we've requested the new rootRepmin should we see more evaluations. */
    // expect(repminCount).toEqual(initialRepminCount + 8); // 21 without cachine, 16 with

    expect(min(root)).toEqual(0);

    /** Now let's say we change a value that doesn't impact repmin */
    /** Find the element with the smallest value */
    const maxElem = findChild(root, ["left", "right", "left", "right"]);
    expect(maxElem.type === "leaf" && maxElem.value === 9).toEqual(true);
    if (maxElem.type !== "leaf") throw new Error("Expected leaf"); // This is just to narrow the type

    /** And even the repmin tree! */
    expect(repmin(root)).toEqual(
      fork(
        fork(leaf(0), fork(fork(leaf(0), leaf(0)), leaf(0))),
        fork(leaf(0), fork(leaf(0), fork(leaf(0), leaf(0))))
      )
    );

    /** Only now that we've requested the new rootRepmin should we see more evaluations. */
    // expect(repminCount).toEqual(initialRepminCount + 8); // 21 without caching, 16 with

    expect(min(root)).toEqual(0);

    /**
     * If we replace the minimum element with a fork that has a new (different minimum), it should
     * handle the structural change and find the new minimum.
     */

    const minParent = findChild(root, ["right", "right"]);
    expect(minParent.type).toEqual("fork");
    if (minParent.type !== "fork") throw new Error("Expected fork"); // To narrow the type

    /** Now the new min should be -2, but the structure is different */
    minParent.left = fork(leaf(-2), leaf(10));

    expect(min(root)).toEqual(-2);

    expect(repmin(root)).toEqual(
      fork(
        fork(leaf(-2), fork(fork(leaf(-2), leaf(-2)), leaf(-2))),
        fork(leaf(-2), fork(fork(leaf(-2), leaf(-2)), fork(leaf(-2), leaf(-2))))
      )
    );

    /** Only now that we've requested the new rootRepmin should we see more evaluations. */
    expect(repminCount).toEqual(initialRepminCount + 17); // 35 without cachine, 25 with
  });
});

function repminCluster(tree: Arbor<SimpleBinaryTree>) {
  const min = tree.add(evalMin);
  const globmin = tree.add(evalGlobmin(min));
  const repmin = tree.add(evalRepmin(globmin));
  const path = tree.add(evalPath());
  const subtable = tree.add(
    subTable(path, (x): x is LeafNode => x.type === "leaf")
  );
  const table = subtable(tree.root);

  return { table, min, globmin, repmin };
}

function repminResult(x: number) {
  return fork(
    fork(leaf(x), fork(fork(leaf(x), leaf(x)), leaf(x))),
    fork(leaf(x), fork(leaf(x), fork(leaf(x), leaf(x))))
  );
}
