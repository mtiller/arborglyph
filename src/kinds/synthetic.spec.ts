import { observable } from "mobx";
import {
  indexedBinaryChildren,
  namedBinaryChildren,
  sampleTree1,
  SimpleBinaryTree,
} from "../testing";
import { Arbor } from "../arbor";
import { computeableSynthetic } from "../plugins/mobx-helpers";
import { descendents } from "../attributes/descendents";
import { synthetic } from "./definitions";
import { lru, lruPlugin } from "../plugins/memoize";
import { CounterPlugin } from "../plugins/counter";

describe("Test synthetic attribute evaluation", () => {
  describe("Tests for descendent attribute", () => {
    it("should find all descendents", () => {
      const stats = new CounterPlugin<SimpleBinaryTree>();
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
      const stats = new CounterPlugin<SimpleBinaryTree>();
      const tree = new Arbor(sampleTree1, indexedBinaryChildren, {
        plugins: [stats],
        syntheticOptions: { memoize: true },
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
    it("should find all descendents with large LRU cache", () => {
      const stats = new CounterPlugin<SimpleBinaryTree>();
      const itree = new Arbor(sampleTree1, indexedBinaryChildren, {
        plugins: [stats, lruPlugin({ max: 30 })],
      });

      const desc = descendents<SimpleBinaryTree>();
      const idef = synthetic("counter", desc);
      const idesc = itree.add(idef);

      const itotal = idesc(itree.root);

      expect(itotal.size).toEqual(14);
      expect(stats.invocations(idef)).toEqual(15);

      /**
       * There is memoization so we expect evaluating the attribute
       * (for all existing nodes) should not lead to any more evaluations.
       **/
      itotal.forEach((x) => idesc(x));
      expect(stats.invocations(idef)).toEqual(15);

      // Create synthetic attribute to find all descendents as a set
      // compare sets from index and named trees
    });
    it("should find all descendents with small LRU cache", () => {
      const itree = new Arbor(sampleTree1, indexedBinaryChildren);

      let count = 0;
      const desc = descendents<SimpleBinaryTree>();
      const icount: typeof desc = (x) => {
        count++;
        return desc(x);
      };
      const idesc = itree.add(lru(synthetic("counter", icount), { max: 5 }));

      const itotal = idesc(itree.root);

      expect(itotal.size).toEqual(14);
      expect(count).toEqual(15);

      /**
       * There is memoization BUT, the LRU cache is so small that
       * nothing useful gets retained and we end up having to perform
       * some re-evaluations.
       **/
      itotal.forEach((x) => idesc(x));
      expect(count).toEqual(31);

      // Create synthetic attribute to find all descendents as a set
      // compare sets from index and named trees
    });

    it("should find all descendents using computedFn", () => {
      const root = observable(sampleTree1);
      const itree = new Arbor(root, indexedBinaryChildren);

      let count = 0;
      const desc = computeableSynthetic(descendents<SimpleBinaryTree>());
      const icount: typeof desc = (x) => {
        count++;
        return desc(x);
      };
      // NB: This must be done at the same level as other memoization
      const idesc = itree.add(lru(synthetic("descendents", icount), {}));

      const itotal = idesc(itree.root);

      expect(itotal.get().size).toEqual(14);
      expect(count).toEqual(15);

      idesc(itree.root);
      expect(count).toEqual(15);

      /**
       * There is memoization so we expect evaluating the attribute
       * (for all existing nodes) should not lead to any more evaluations.
       **/
      itotal.get().forEach((x) => idesc(x));
      expect(count).toEqual(15);

      // Create synthetic attribute to find all descendents as a set
      // compare sets from index and named trees
    });
  });
});
