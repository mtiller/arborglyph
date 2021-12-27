import { observable } from "mobx";
import {
  indexedBinaryChildren,
  namedBinaryChildren,
  sampleTree1,
  SimpleBinaryTree,
} from "../testing";
import { Arbor } from "../arbor";
import { descendents } from "../attributes/descendents";
import { synthetic } from "./definitions";
import { lruPlugin } from "../plugins/lru";
import { CounterPlugin } from "../plugins/counter";
import { MobxReifier } from "../reify/mobx";

describe("Test synthetic attribute evaluation", () => {
  describe("Tests for descendent attribute", () => {
    it("should find all descendents", () => {
      const stats = new CounterPlugin();
      const itree = new Arbor(sampleTree1, indexedBinaryChildren, {
        plugins: [stats],
      });
      const ntree = new Arbor(sampleTree1, namedBinaryChildren);

      const desc = descendents<SimpleBinaryTree>();
      const icount = synthetic<SimpleBinaryTree, ReturnType<typeof desc>>(
        "counter",
        desc
      );
      const idesc = itree.add(icount);
      const ndesc = ntree.add(synthetic("descendents", descendents()));

      const itotal = idesc(itree.root);
      const ntotal = ndesc(itree.root);

      expect(itotal).toEqual(ntotal);
      expect(itotal.size).toEqual(14);
      expect(stats.invocations(icount)).toEqual(15);

      /**
       * There is no memoization so we expect our evaluator to be called
       * repeatedly for the same ndoes.
       **/
      idesc(itree.root);
      expect(stats.invocations(icount)).toEqual(30);

      // Create synthetic attribute to find all descendents as a set
      // compare sets from index and named trees
    });
    it("should find all descendents with caching", () => {
      const stats = new CounterPlugin();
      const tree = new Arbor(sampleTree1, indexedBinaryChildren, {
        plugins: [stats],
        reification: { memoize: true },
      });

      const desc = descendents<SimpleBinaryTree>();
      const icount = synthetic<SimpleBinaryTree, Set<SimpleBinaryTree>>(
        "counter",
        desc
      );
      const idesc = tree.add(icount);

      const itotal = idesc(tree.root);

      expect(itotal.size).toEqual(14);
      expect(stats.invocations(icount)).toEqual(15);

      /**
       * There is memoization so we expect evaluating the attribute
       * (for all existing nodes) should not lead to any more evaluations.
       **/
      itotal.forEach((x) => idesc(x));
      expect(stats.invocations(icount)).toEqual(15);

      // Create synthetic attribute to find all descendents as a set
      // compare sets from index and named trees
    });
    test.each([
      { max: 30, c1: 15, c2: 15 },
      { max: 5, c1: 15, c2: 31 },
    ])(
      "given cache size of %p, expecting %p invocations followed by %p invocations",
      (testcase) => {
        const stats = new CounterPlugin();
        const itree = new Arbor(sampleTree1, indexedBinaryChildren, {
          plugins: [stats, lruPlugin({ max: testcase.max })],
        });

        const desc = descendents<SimpleBinaryTree>();
        const idef = synthetic("counter", desc);
        const idesc = itree.add(idef);

        const itotal = idesc(itree.root);

        expect(itotal.size).toEqual(14);
        expect(stats.invocations(idef)).toEqual(testcase.c1);

        /**
         * There is memoization so we expect evaluating the attribute
         * (for all existing nodes) should not lead to any more evaluations.
         **/
        itotal.forEach((x) => idesc(x));
        expect(stats.invocations(idef)).toEqual(testcase.c2);
      }
    );
    it("should find all descendents using computedFn", () => {
      const root = observable(sampleTree1);
      const stats = new CounterPlugin();
      const itree = new Arbor(root, indexedBinaryChildren, {
        plugins: [stats, lruPlugin({})],
        reifier: new MobxReifier(),
      });

      const desc = descendents<SimpleBinaryTree>();
      // NB: This must be done at the same level as other memoization
      const desc2 = synthetic("descendents", desc);
      const idesc = itree.add(desc2);

      expect(idesc(itree.root).size).toEqual(14);
      expect(stats.invocations(desc2)).toEqual(15);

      idesc(itree.root);
      expect(stats.invocations(desc2)).toEqual(15);

      /**
       * There is memoization so we expect evaluating the attribute
       * (for all existing nodes) should not lead to any more evaluations.
       **/
      idesc(itree.root).forEach((x) => idesc(x));
      expect(stats.invocations(desc2)).toEqual(15);

      // Create synthetic attribute to find all descendents as a set
      // compare sets from index and named trees
    });
  });
});
