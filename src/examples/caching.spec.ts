/**
 * Various tests around caching of results and ensuring
 * caches are always consistent even in the face of various
 * mutations.
 **/

import { Arbor } from "..";
import { ArborPlugin } from "../plugin";
import { CounterPlugin } from "../plugins/counter";
import {
  findChild,
  fork,
  indexedBinaryChildren,
  SimpleBinaryTree,
  symTree1,
  symTree2,
} from "../testing";
import { repminCluster } from "./observable_repmin.test";
import { evalMin } from "./repmin_attrs";

interface CaseData {
  memoized: boolean;
  immutable: boolean;
  plugins: ArborPlugin<SimpleBinaryTree>[];
  sub: number;
  total1: number;
  total2: number;
  total3: number;
  total4: number;
  total5: number;
}

const cases: CaseData[] = [
  {
    memoized: false,
    immutable: true,
    plugins: [],
    sub: 3,
    total1: 10,
    total2: 17,
    total3: 17,
    total4: 31,
    total5: 38,
  },
  {
    memoized: true,
    immutable: true,
    plugins: [],
    sub: 3,
    total1: 7,
    total2: 7,
    total3: 7,
    total4: 15,
    total5: 16,
  },
  {
    memoized: true,
    immutable: false,
    plugins: [],
    sub: 3,
    total1: 7,
    total2: 7,
    total3: 7,
    total4: 15,
    total5: 16,
  },
];
describe("Evaluate several simple cases and check cache consistency", () => {
  describe("Tests on immutable trees", () => {
    test.each(cases)("case %#", (args) => {
      const tree1 = { ...symTree1 };
      const tree2 = { ...symTree2 };
      const l1 = findChild(tree1, ["left"]);
      const r2 = findChild(tree2, ["right"]);
      const stats = new CounterPlugin();
      const tree = new Arbor(tree1, indexedBinaryChildren, {
        plugins: [stats, ...args.plugins],
        reification: { memoize: args.memoized },
        immutable: args.immutable,
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

      /** How we mutate the tree depends on whether the underlying tree is immutable */
      if (args.immutable) {
        /** If immutable, create a new tree that contains nodes from old tree (so cache should be reused) */
        tree.setRoot(fork(l1, r2));
      } else {
        /** If tree is mutable, replace left and right subtrees and inform Arbor of change to node. */
        const t = tree.root;
        expect(t.type).toEqual("fork");
        if (t.type === "fork") {
          t.right = r2;
          tree.update(t);
        }
      }
      /** Changing tree shouldn't cause any invocations yet (because this is lazy) */
      expect(stats.invocations(evalMin)).toEqual(args.total2);

      /** Now request the value of a root level inherited attribute */
      // TODO: Needs the current parentAttr!  Cannot reassign, need to modify values in closure!
      expect(globmin(tree.root)).toEqual(3);

      /** The change in root shouldn't have impacted totals yet */
      expect(stats.invocations(evalMin)).toEqual(args.total3);

      /**
       * Now let's switch to root altogether.
       */
      tree.setRoot(tree2);
      /** Switching root shouldn't cause any invocations yet (because this is lazy) */
      expect(stats.invocations(evalMin)).toEqual(args.total3);

      /** Now, if we evaluate the root we should get the root min */
      expect(min(tree.root)).toEqual(2);
      /** We expect 7 new evaluations because the cached values were useless now */
      expect(stats.invocations(evalMin)).toEqual(args.total4);

      /** Let's switch back to the original tree.  The cached values for that should still apply! */
      tree.setRoot(tree1);
      /** Now, if we evaluate the root we should get the root min */
      expect(min(tree.root)).toEqual(1);
      /** In the memoized case, no new evaluations are required, otherwise 7 more evaluations will occur */
      expect(stats.invocations(evalMin)).toEqual(args.total4);

      /** Now, if we evaluate the root we should get the root min */
      expect(min(tree.root)).toEqual(3);

      /** In the memoized case, this should only add one new evaluation (the root), otherwise 7 more evaluations will occur */
      expect(stats.invocations(evalMin)).toEqual(args.total5);
    });
  });

  // TODO: Mutable cases
  // - MobX
  // - non-MobX
  // - Replace a subtree and invalidate cache
});
