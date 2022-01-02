/**
 * Various tests around caching of results and ensuring
 * caches are always consistent even in the face of various
 * mutations.
 **/

import { observable } from "mobx";
import { Arbor } from "../arbor";
import { CounterPlugin } from "../plugins/counter";
import { MobxReifier } from "../reify/mobx";
import {
  findChild,
  fork,
  indexedBinaryChildren,
  leaf,
  symTree1,
  symTree2,
} from "../testing";
import { repminCluster } from "./observable_repmin.test";
import { evalMin } from "./repmin_attrs";
import rfdc from "rfdc";

const clone = rfdc();
interface CaseData {
  desc: string;
  memoized: boolean;
  immutable: boolean;
  observable: boolean;
  sub: number;
  total1: number;
  total2: number;
  total3: number;
  total4: number;
  total5: number;
}

const cases: CaseData[] = [
  {
    desc: "Mutable but not memoized",
    memoized: false,
    immutable: false,
    observable: false,
    sub: 3,
    total1: 10,
    total2: 17,
    total3: 24,
    total4: 31,
    total5: 38,
  },
  {
    desc: "Immutable but not memoized",
    memoized: false,
    immutable: true,
    observable: false,
    sub: 3,
    total1: 10,
    total2: 17,
    total3: 24,
    total4: 31,
    total5: 38,
  },
  {
    desc: "Immutable and memoized",
    memoized: true,
    immutable: true,
    observable: false,
    sub: 3,
    total1: 7,
    total2: 7,
    total3: 11,
    total4: 15,
    total5: 16,
  },
  {
    desc: "Mutable and memoized",
    memoized: true,
    immutable: false,
    observable: false,
    sub: 3,
    total1: 7,
    total2: 7,
    total3: 11,
    total4: 15,
    total5: 16,
  },
  {
    desc: "Mutable and memozied but also observable",
    memoized: true,
    immutable: false,
    observable: true,
    sub: 3,
    total1: 7,
    total2: 7,
    total3: 11,
    total4: 15,
    total5: 16,
  },
];
describe("Evaluate several simple cases and check cache consistency", () => {
  test.each(cases)("Case: $desc", (args) => {
    const tree1 = args.observable
      ? observable(clone(symTree1))
      : clone(symTree1);
    const tree2 = args.observable
      ? observable(clone(symTree2))
      : clone(symTree2);
    const l1 = findChild(tree1, ["left"]);
    const r1 = findChild(tree1, ["right"]);
    const r2 = findChild(tree2, ["right"]);
    const stats = new CounterPlugin();
    const tree = new Arbor(tree1, indexedBinaryChildren, {
      plugins: [stats],
      reification: { memoize: args.memoized },
      immutable: args.immutable,
      reifier: args.observable ? new MobxReifier() : undefined,
    });
    /** Attach attributes to tree */
    const { min, globmin } = tree.attach(repminCluster(true));
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
      /** If immutable, create a new tree that contains nodes from old tree (so cache of synthetics should be reused) */
      tree.setRoot(fork(l1, r2));
    } else {
      /** If tree is mutable, replace right subtree and inform Arbor of change to node. */
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
    expect(globmin(tree.root)).toEqual(3);

    /** For memoized cases, synthetic attributes for the root and all nodes on the right side need to be recomputed (4) */
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
    if (args.immutable) {
      /** If immutable, create a new tree that contains nodes from old tree (so cache of synthetics should be reused) */
      tree.setRoot(tree1);
    } else {
      /** If tree is mutable, replace right subtree and inform Arbor of change to node. */
      const t = tree.root;
      expect(t.type).toEqual("fork");
      if (t.type === "fork") {
        t.right = r1;
        tree.update(t);
      }
    }
    /** Now, if we evaluate the root we should get the root min */
    expect(min(tree.root)).toEqual(1);
    /** In the memoized case, no new evaluations are required, otherwise 7 more evaluations will occur */
    expect(stats.invocations(evalMin)).toEqual(args.total5);

    /**
     * Now for the MUTABLE trees we try some mutations WITHOUT calling update.
     * For MobX trees, this shouldn't be a problem because they implicitely know
     * what needs to be invalidated and that is handled in the
     * `IComputedValues`s.
     */

    if (!args.immutable) {
      /** Get the node that is currently the min */
      const rl = findChild(tree.root, ["right", "left"]);
      expect(rl.type).toEqual("leaf");
      if (rl.type === "leaf") {
        /** Confirm it is the "1" value in the tree */
        expect(rl.value).toEqual(1);
        rl.value = 3;
      }
      if (args.memoized) {
        if (args.observable) {
          /** Even though we didn't call update, MobX knows to invalidate its caches. */
          expect(min(tree.root)).toEqual(2);
        } else {
          /** We didn't call update, so we have stale cached values and, therefore, the wrong answer */
          expect(min(tree.root)).toEqual(1);
          tree.update(rl);
          /** But, if we call update then we rid ourselves of the stale results and then get the correct result. */
          expect(min(tree.root)).toEqual(2);
        }
      } else {
        /** With no memoization, the correct answer is always computed. */
        expect(min(tree.root)).toEqual(2);
      }
    }
  });
});

describe("Tests for inter-related attributes", () => {
  it("should compute syn(inh(syn(...))) correctly using impurity", () => {
    /** Setup a normal repmin problem */
    const tree1 = clone(symTree1);
    const stats = new CounterPlugin();
    const tree = new Arbor(tree1, indexedBinaryChildren, {
      plugins: [stats],
      reification: { memoize: true },
      immutable: false,
    });
    /** Attach attributes to tree */
    const { min, globmin, repmin, repminAttr } = tree.attach(
      repminCluster(false)
    );

    /** A few noteworthy nodes */
    const l1 = findChild(tree1, ["left"]);
    const rl1 = findChild(tree1, ["right", "left"]);
    const r1 = findChild(tree1, ["right"]);

    /** Ensure the expected results, pre-mutation */
    expect(min(tree.root)).toEqual(1);
    expect(globmin(tree.root)).toEqual(1);
    expect(globmin(r1)).toEqual(1);
    expect(globmin(l1)).toEqual(1);
    expect(repmin(l1)).toEqual(fork(leaf(1), leaf(1)));
    expect(repmin(r1)).toEqual(fork(leaf(1), leaf(1)));

    expect(rl1.type).toEqual("leaf");
    if (rl1.type === "leaf") {
      expect(rl1.value).toEqual(1);

      /* Mutate value of left-right node to 2 */
      rl1.value = 2;

      /** These evaluations give the wrong results because they have stale cached data */
      expect(min(rl1)).toEqual(1);
      expect(min(tree.root)).toEqual(1);
      expect(globmin(rl1)).toEqual(1);
      expect(globmin(l1)).toEqual(1);
      expect(repmin(l1)).toEqual(fork(leaf(1), leaf(1)));
      expect(repmin(r1)).toEqual(fork(leaf(1), leaf(1)));

      /** We can address the stale data for synthetic attributes by notifying the tree of what we changed */
      tree.update(rl1);

      /** Now the synthetic attributes are recomputed and correct. */
      expect(min(rl1)).toEqual(2);
      expect(min(tree.root)).toEqual(2);

      /** These are the values we would expect. */
      expect(globmin(rl1)).toEqual(2);
      expect(globmin(l1)).toEqual(2);
      expect(repmin(l1)).toEqual(fork(leaf(2), leaf(2)));
      expect(repmin(r1)).toEqual(fork(leaf(2), leaf(2)));
    }
  });

  it("should compute syn(inh(syn(...))) incorrectly assuming purity", () => {
    /** Setup a normal repmin problem */
    const tree1 = clone(symTree1);
    const stats = new CounterPlugin();
    const tree = new Arbor(tree1, indexedBinaryChildren, {
      plugins: [stats],
      reification: { memoize: true },
      immutable: false,
    });
    /** Attach attributes to tree */
    const { min, globmin, repmin, repminAttr } = tree.attach(
      repminCluster(true)
    );

    /** A few noteworthy nodes */
    const l1 = findChild(tree1, ["left"]);
    const rl1 = findChild(tree1, ["right", "left"]);
    const r1 = findChild(tree1, ["right"]);

    /** Ensure the expected results, pre-mutation */
    expect(min(tree.root)).toEqual(1);
    expect(globmin(tree.root)).toEqual(1);
    expect(globmin(r1)).toEqual(1);
    expect(globmin(l1)).toEqual(1);
    expect(repmin(l1)).toEqual(fork(leaf(1), leaf(1)));
    expect(repmin(r1)).toEqual(fork(leaf(1), leaf(1)));

    expect(rl1.type).toEqual("leaf");
    if (rl1.type === "leaf") {
      expect(rl1.value).toEqual(1);

      /* Mutate value of left-right node to 2 */
      rl1.value = 2;

      /** These evaluations give the wrong results because they have stale cached data */
      expect(min(rl1)).toEqual(1);
      expect(min(tree.root)).toEqual(1);
      expect(globmin(rl1)).toEqual(1);
      expect(globmin(l1)).toEqual(1);
      expect(repmin(l1)).toEqual(fork(leaf(1), leaf(1)));
      expect(repmin(r1)).toEqual(fork(leaf(1), leaf(1)));

      /** We can address the stale data for synthetic attributes by notifying the tree of what we changed */
      tree.update(rl1);

      /** Now the synthetic attributes are recomputed and correct. */
      expect(min(rl1)).toEqual(2);
      expect(min(tree.root)).toEqual(2);

      /** However, anything that depends on inherited attributes is wrong still */
      expect(globmin(rl1)).toEqual(1);
      expect(globmin(l1)).toEqual(1);
      expect(repmin(l1)).toEqual(fork(leaf(1), leaf(1)));
      expect(repmin(r1)).toEqual(fork(leaf(1), leaf(1)));
    }
  });
});
