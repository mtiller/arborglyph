/**
 * Various tests around caching of results and ensuring
 * caches are always consistent even in the face of various
 * mutations.
 **/

import { Arbor } from "..";
import { CounterPlugin } from "../plugins/counter";
import {
  findChild,
  fork,
  indexedBinaryChildren,
  symTree1,
  symTree2,
} from "../testing";
import { repminCluster } from "./observable_repmin.test";
import { evalMin } from "./repmin_attrs";

describe("Evaluate several simple cases and check cache consistency", () => {
  const l1 = findChild(symTree1, ["left"]);
  const ll1 = findChild(symTree1, ["left", "left"]);
  const lr1 = findChild(symTree1, ["left", "right"]);
  const r1 = findChild(symTree1, ["right"]);
  const rr1 = findChild(symTree1, ["right", "right"]);
  const rl1 = findChild(symTree1, ["right", "left"]);

  const l2 = findChild(symTree2, ["left"]);
  const ll2 = findChild(symTree2, ["left", "left"]);
  const lr2 = findChild(symTree2, ["left", "right"]);
  const r2 = findChild(symTree2, ["right"]);
  const rr2 = findChild(symTree2, ["right", "right"]);
  const rl2 = findChild(symTree2, ["right", "left"]);

  test.each([
    {
      memoized: false,
      sub: 3,
      total1: 10,
      total2: 17,
      total3: 24,
      total4: 31,
      total5: 38,
    },
    {
      memoized: true,
      sub: 3,
      total1: 7,
      total2: 7,
      total3: 14,
      total4: 14,
      total5: 15,
    },
  ])(
    "with memoize set to %p, expect %p subtree evaluations and %p total evaluations",
    (args) => {
      const stats = new CounterPlugin();
      const tree = new Arbor(symTree1, indexedBinaryChildren, {
        plugins: [stats],
        reification: { memoize: args.memoized },
        immutable: true,
      });
      /** Attach attributes to tree */
      const { min, globmin } = tree.attach(repminCluster);
      /** Everything is lazy, so we shouldn't see any evaluations yet. */
      expect(stats.invocations(evalMin)).toEqual(0);

      /** First, evaluate min in a subtree */
      expect(min(l1)).toEqual(3);
      /** We should only see synthetic attributes of the subtree evaluated */
      expect(stats.invocations(evalMin)).toEqual(args.sub);

      /** Now, if we evaluate the root we should get the root min */
      expect(min(tree.root)).toEqual(1);
      /**
       * In the memoized case, we should see only 4 more evaluations.  In the
       * non-memoized case, we'll see 7 more evaluations.
       **/
      expect(stats.invocations(evalMin)).toEqual(args.total1);

      /** Now request the value of a root level inherited attribute */
      expect(globmin(tree.root)).toEqual(1);
      /** In the memoized case, all previous evaluations will be used, otherwise 7 more evaluations will occur */
      expect(stats.invocations(evalMin)).toEqual(args.total2);
      /**
       * Now let's switch to root altogether.
       */
      tree.setRoot(symTree2);

      /** Switching root shouldn't cause any invocations yet (because this is lazy) */
      expect(stats.invocations(evalMin)).toEqual(args.total2);
      /** Now, if we evaluate the root we should get the root min */
      expect(min(tree.root)).toEqual(1);
      /** We expect 7 new evaluations because the cached values were useless now */
      expect(stats.invocations(evalMin)).toEqual(args.total3);

      /** Let's switch back to the original tree.  The cached values for that should still apply! */
      tree.setRoot(symTree1);
      /** Now, if we evaluate the root we should get the root min */
      expect(min(tree.root)).toEqual(1);
      /** In the memoized case, no new evaluations are required, otherwise 7 more evaluations will occur */
      expect(stats.invocations(evalMin)).toEqual(args.total4);

      /** Create a new tree that contains nodes from old tree (so cache should be reused) */
      tree.setRoot(fork(l1, r2));
      /** The change in root shouldn't have impacted totals yet */
      expect(stats.invocations(evalMin)).toEqual(args.total4);

      /** Now, if we evaluate the root we should get the root min */
      expect(min(tree.root)).toEqual(1);

      /** In the memoized case, this should only add one new evaluation (the root), otherwise 7 more evaluations will occur */
      expect(stats.invocations(evalMin)).toEqual(args.total5);
    }
  );

  // TODO: Mutable cases
  // - MobX
  // - non-MobX
  // - Replace a subtree and invalidate cache
});
