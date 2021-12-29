import { findChild, fork, indexedBinaryChildren, leaf } from "../testing";
import { sampleTree1, SimpleBinaryTree } from "../testing";
import { Arbor } from "../arbor";
import { configure, observable } from "mobx";
import { CounterPlugin } from "../plugins/counter";
import { DebugPlugin } from "../plugins/debug";
import { evalPath } from "../attributes/path";
import { evalGlobmin, evalMin, evalRepmin } from "./repmin_attrs";
import { MobxReifier } from "../reify/mobx";

describe.skip("Examples using mutable trees", () => {
  // Being a bit sloppy with MobX here.
  configure({ enforceActions: "never" });

  it("should work with mutable trees and weakmap caching", () => {
    const root = observable(sampleTree1);

    //   /** Find the element with the smallest value */
    const minElem = findChild(root, ["right", "right", "left"]);

    const logger = new DebugPlugin<SimpleBinaryTree>();
    const stats = new CounterPlugin();
    const tree = new Arbor(root, indexedBinaryChildren, {
      plugins: [logger, stats],
      reifier: new MobxReifier(),
    });
    expect(tree.root).toEqual(root);
    expect(tree.root).toEqual(root);

    const path = tree.add(evalPath({ eager: true }));
    logger.stringifyNode = path;
    logger.stringifyResult = () => "";

    /** Now define the min attribute */
    const min = tree.add(evalMin);

    /** Now define the globmin attribute, but we must provide a slightly different function for evaluating the min attribute */
    const globmin = tree.add(evalGlobmin(min));

    /** Finaly, define the repmin attribute (again need to unwrap globmin values) */
    const repmin = tree.add(evalRepmin(globmin));

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

    const initialRepminCount = stats.invocations(evalMin);
    // TODO: In this test, I think most of the returned values are
    // probably right, but it is properly instrumenting the test
    // to verify optimal evaluation that I'm trying to figure out.
    expect(initialRepminCount).toEqual(8);
  });
  // it("should work with mutable trees without mobx", () => {
  //   mutableTreeTest({
  //     initialMinEvals: 241,
  //     secondMinEvals: 256,
  //     thirdMinEvals: 482,
  //     fourthMinEvals: 708,
  //   });
  // });

  // it("should work with mutable trees with mobx", () => {
  //   // TODO: Add MobX plugin
  //   mutableTreeTest(
  //     {
  //       initialMinEvals: 35,
  //       secondMinEvals: 36,
  //       thirdMinEvals: 70,
  //       fourthMinEvals: 104,
  //     },
  //     mobxPlugin()
  //   );
  // });

  // it("should work with mutable trees and weakmap caching", () => {
  //   /** Make our root node observable (mobx will apply this recursively) */
  //   const root = observable(sampleTree1);

  //   /** Find the element with the smallest value */
  //   const minElem = findChild(root, ["right", "right", "left"]);
  //   expect(minElem.type === "leaf" && minElem.value === 1).toEqual(true);
  //   if (minElem.type === "fork") throw new Error("Expected a leaf"); // This is just to narrow the type.

  //   /** Now create a wrapped tree around the observable tree */
  //   const stats = new CounterPlugin();
  //   const tree = new Arbor(root, indexedBinaryChildren, { plugins: [stats] });
  //   expect(tree.root).toEqual(root);
  //   expect(tree.root).toEqual(root);

  //   /** Now define the min attribute */
  //   const cevalMin = computable(evalMin);
  //   const min = tree.add(cevalMin);

  //   /** Now define the globmin attribute, but we must provide a slightly different function for evaluating the min attribute */
  //   const globmin = tree.add(computable(evalGlobmin(min)));

  //   /** Finaly, define the repmin attribute (again need to unwrap globmin values) */
  //   const cevalRepmin = computable(evalRepmin(globmin));
  //   const repmin = tree.add(cevalRepmin);

  //   /** Compute the rootMin computed value for the root */
  //   const rootMin = min(root);
  //   expect(rootMin).toEqual(1);

  //   /** Compute the rootGlobmin computed value for the root */
  //   const rootGlobmin = globmin(root);
  //   expect(rootGlobmin).toEqual(1);

  //   /** Compute the rootRepmin computed value for the root */
  //   const rootRepmin = repmin(root);
  //   expect(rootRepmin).toEqual(
  //     fork(
  //       fork(leaf(1), fork(fork(leaf(1), leaf(1)), leaf(1))),
  //       fork(leaf(1), fork(leaf(1), fork(leaf(1), leaf(1))))
  //     )
  //   );

  //   const initialRepminCount = stats.invocations(cevalRepmin);
  //   expect(initialRepminCount).toEqual(8);

  //   /** Requesting the computed value shouldn't cause any more evaluations */
  //   repmin(root);
  //   expect(stats.invocations(cevalRepmin)).toEqual(initialRepminCount);

  //   /** If we get here, we got the expected result win the min value was 1, now lets change it to zero */
  //   minElem.value = 0;

  //   /** Changing the value should cause an additional evalulations yet because of the lazy evaluation */
  //   expect(stats.invocations(cevalRepmin)).toEqual(initialRepminCount);

  //   /**
  //    * Note, we have not re-evaluated the min(...) attribute!  We are just requesting the value of the
  //    * already computed rootMin computed value.  This is memoized UNTIL some value that effected the
  //    * calculation is changed in which case it gets updated automatically (and only if needed).
  //    */
  //   expect(min(root)).toEqual(0);

  //   /** Same with the globmin */
  //   expect(globmin(root)).toEqual(0);

  //   /** And even the repmin tree! */
  //   expect(repmin(root)).toEqual(
  //     fork(
  //       fork(leaf(0), fork(fork(leaf(0), leaf(0)), leaf(0))),
  //       fork(leaf(0), fork(leaf(0), fork(leaf(0), leaf(0))))
  //     )
  //   );

  //   /** Only now that we've requested the new rootRepmin should we see more evaluations. */
  //   // expect(repminCount).toEqual(initialRepminCount + 8); // 21 without cachine, 16 with

  //   expect(min(root)).toEqual(0);

  //   /** Now let's say we change a value that doesn't impact repmin */
  //   /** Find the element with the smallest value */
  //   const maxElem = findChild(root, ["left", "right", "left", "right"]);
  //   expect(maxElem.type === "leaf" && maxElem.value === 9).toEqual(true);
  //   if (maxElem.type !== "leaf") throw new Error("Expected leaf"); // This is just to narrow the type

  //   /** And even the repmin tree! */
  //   expect(repmin(root)).toEqual(
  //     fork(
  //       fork(leaf(0), fork(fork(leaf(0), leaf(0)), leaf(0))),
  //       fork(leaf(0), fork(leaf(0), fork(leaf(0), leaf(0))))
  //     )
  //   );

  //   /** Only now that we've requested the new rootRepmin should we see more evaluations. */
  //   // expect(repminCount).toEqual(initialRepminCount + 8); // 21 without caching, 16 with

  //   expect(min(root)).toEqual(0);

  //   /**
  //    * If we replace the minimum element with a fork that has a new (different minimum), it should
  //    * handle the structural change and find the new minimum.
  //    */

  //   const minParent = findChild(root, ["right", "right"]);
  //   expect(minParent.type).toEqual("fork");
  //   if (minParent.type !== "fork") throw new Error("Expected fork"); // To narrow the type

  //   /** Now the new min should be -2, but the structure is different */
  //   minParent.left = fork(leaf(-2), leaf(10));

  //   expect(min(root)).toEqual(-2);

  //   expect(repmin(root)).toEqual(
  //     fork(
  //       fork(leaf(-2), fork(fork(leaf(-2), leaf(-2)), leaf(-2))),
  //       fork(leaf(-2), fork(fork(leaf(-2), leaf(-2)), fork(leaf(-2), leaf(-2))))
  //     )
  //   );

  //   /** Only now that we've requested the new rootRepmin should we see more evaluations. */
  //   expect(stats.invocations(cevalRepmin)).toEqual(initialRepminCount + 17); // 35 without cachine, 25 with
  // });
});

// export interface MutableResults {
//   initialMinEvals: number;
//   secondMinEvals: number;
//   thirdMinEvals: number;
//   fourthMinEvals: number;
// }

// function mutableTreeTest(
//   results: MutableResults,
//   ...plugins: ArborPlugin<SimpleBinaryTree>[]
// ) {
//   const stats = new CounterPlugin();
//   const map = new Map<any, number>();
//   const tree = new Arbor(clone(sampleTree1), indexedBinaryChildren, {
//     plugins: [stats, ...plugins],
//   });
//   const { table, min, globmin, repmin } = tree.attach(repminCluster);

//   expect(map.get(min)).toEqual(undefined);
//   const result = repmin(tree.root);

//   expect(globmin(tree.root)).toEqual(1);
//   expect(map.get(evalMin)).toEqual(results.initialMinEvals);
//   expect(globmin(tree.root)).toEqual(1);
//   expect(map.get(evalMin)).toEqual(results.secondMinEvals);

//   expect(result).toEqual(repminResult(1));

//   const minElem = mustGet(table, "root/right/right/left");
//   expect(minElem.value).toEqual(1);

//   minElem.value = 0;

//   expect(repmin(tree.root)).toEqual(repminResult(0));
//   expect(map.get(evalMin)).toEqual(results.thirdMinEvals);

//   minElem.value = 1;

//   expect(repmin(tree.root)).toEqual(repminResult(1));
//   expect(map.get(evalMin)).toEqual(results.fourthMinEvals);
// }
