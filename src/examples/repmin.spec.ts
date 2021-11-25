/** An implementation of the repmin example */

import { findChild, fork, indexedBinaryChildren, leaf } from "../testing";
import { ScalarFunction } from "../kinds/attributes";
import { sampleTree1, SimpleBinaryTree } from "../testing";
import { Arbor } from "../arbor";
import { comparer, configure, observable } from "mobx";
import {
  computeableInherited,
  computeableSynthetic,
  computableValue,
  computable,
} from "../plugins/mobx-helpers";
import { inherited, synthetic } from "../kinds/definitions";
import { memoize } from "../plugins/memoize";
import rfdc from "rfdc";
import { counter, counterPlugin } from "../plugins/debug";

const clone = rfdc();

export const evalMin = synthetic<SimpleBinaryTree, number>(
  ({ node, attr }): number =>
    node.type === "leaf"
      ? node.value
      : Math.min(attr(node.left), attr(node.right))
);

export function evalGlobmin<R>(min: ScalarFunction<SimpleBinaryTree, R>) {
  return inherited<SimpleBinaryTree, R>(({ node, parent }) =>
    parent.map((p) => p.attr).orDefault(min(node))
  );
}

export function evalRepmin(globmin: ScalarFunction<SimpleBinaryTree, number>) {
  return synthetic<SimpleBinaryTree, SimpleBinaryTree>(({ node, attr }) =>
    node.type === "leaf"
      ? leaf(globmin(node))
      : fork(attr(node.left), attr(node.right))
  );
}

export function repminResult(x: number) {
  return fork(
    fork(leaf(x), fork(fork(leaf(x), leaf(x)), leaf(x))),
    fork(leaf(x), fork(leaf(x), fork(leaf(x), leaf(x))))
  );
}

function mutableTreeTest() {
  const tree = new Arbor(clone(sampleTree1), indexedBinaryChildren);
  const min = tree.add(evalMin);
  const globmin = tree.add(evalGlobmin(min));
  const repmin = tree.add(evalRepmin(globmin));

  const result = repmin(tree.root);

  expect(globmin(tree.root)).toEqual(1);
  expect(globmin(tree.root)).toEqual(1);

  expect(result).toEqual(
    fork(
      fork(leaf(1), fork(fork(leaf(1), leaf(1)), leaf(1))),
      fork(leaf(1), fork(leaf(1), fork(leaf(1), leaf(1))))
    )
  );

  const minElem = findChild(tree.root, ["right", "right", "left"]);
  expect(minElem.type === "leaf" && minElem.value === 1).toEqual(true);
  if (minElem.type === "fork") throw new Error("Expected a leaf"); // This is just to narrow the type.

  minElem.value = 0;

  expect(repmin(tree.root)).toEqual(repminResult(0));
}

describe("Run some repmin test cases", () => {
  // Being a bit sloppy with MobX here.
  configure({ enforceActions: "never" });

  it("should handle a basic repmin", () => {
    const map = new Map<any, number>();
    const tree = new Arbor(sampleTree1, indexedBinaryChildren, {
      plugins: [counterPlugin(map)],
    });
    const min = tree.add(evalMin);
    const globmin = tree.add(evalGlobmin(min));
    const repmin = tree.add(evalRepmin(globmin));

    expect(globmin(tree.root)).toEqual(1);
    expect(globmin(tree.root)).toEqual(1);

    // console.log("MIN:\n" + treeRepr(tree.tree, min));
    // console.log("GLOBMIN:\n" + treeRepr(tree.tree, globmin));

    expect(repmin(tree.root)).toEqual(repminResult(1));
    console.log(map);
    expect(map.get(evalMin)).toEqual(256);
    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(map.get(evalMin)).toEqual(482);
  });

  it("should handle a basic repmin with caching", () => {
    const map = new Map<any, number>();
    const tree = new Arbor(sampleTree1, indexedBinaryChildren, {
      plugins: [counterPlugin(map)],
    });
    const min = tree.add(memoize(counter(evalMin, map)));
    const globmin = tree.add(evalGlobmin(min));
    const repmin = tree.add(evalRepmin(globmin));

    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(map.get(evalMin)).toEqual(15);
    expect(repmin(tree.root)).toEqual(repminResult(1));
    expect(map.get(evalMin)).toEqual(15);
  });

  it("should work with mutable trees without mobx", () => {
    mutableTreeTest();
  });

  it("should work with mutable trees with mobx", () => {
    mutableTreeTest();
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
    const min = tree.syn(
      computeableSynthetic<SimpleBinaryTree, number>(evalMin.f, {
        keepAlive: true,
        equals: comparer.shallow,
      }),
      { memoize: memo }
    );

    /** Now define the globmin attribute, but we must provide a slightly different function for evaluating the min attribute */
    const globmin = tree.inh(
      computeableInherited(evalGlobmin((x) => min(x).get()).f, {
        keepAlive: true,
        equals: comparer.shallow,
      }),
      { memoize: memo }
    );

    let repminCount = 0;
    /** Finaly, define the repmin attribute (again need to unwrap globmin values) */
    const repmin = tree.syn(
      computeableSynthetic(
        evalRepmin((x) => {
          repminCount++;
          return globmin(x).get();
        }).f,
        { keepAlive: true, equals: comparer.shallow }
      ),
      { memoize: memo }
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
    expect(rootRepmin.get()).toEqual(
      fork(
        fork(leaf(0), fork(fork(leaf(0), leaf(0)), leaf(0))),
        fork(leaf(0), fork(leaf(0), fork(leaf(0), leaf(0))))
      )
    );

    /** Only now that we've requested the new rootRepmin should we see more evaluations. */
    // expect(repminCount).toEqual(initialRepminCount + 8); // 21 without cachine, 16 with

    expect(rootMin.get()).toEqual(0);

    /** Now let's say we change a value that doesn't impact repmin */
    /** Find the element with the smallest value */
    const maxElem = findChild(root, ["left", "right", "left", "right"]);
    expect(maxElem.type === "leaf" && maxElem.value === 9).toEqual(true);
    if (maxElem.type !== "leaf") throw new Error("Expected leaf"); // This is just to narrow the type

    /** And even the repmin tree! */
    expect(rootRepmin.get()).toEqual(
      fork(
        fork(leaf(0), fork(fork(leaf(0), leaf(0)), leaf(0))),
        fork(leaf(0), fork(leaf(0), fork(leaf(0), leaf(0))))
      )
    );

    /** Only now that we've requested the new rootRepmin should we see more evaluations. */
    // expect(repminCount).toEqual(initialRepminCount + 8); // 21 without caching, 16 with

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
    expect(repminCount).toEqual(initialRepminCount + 17); // 35 without cachine, 25 with
  });
});
