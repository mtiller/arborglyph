import { observable } from "mobx";
import { descendents } from "./common";
import {
  indexedBinaryChildren,
  namedBinaryChildren,
  sampleTree1,
  SimpleBinaryTree,
} from "./testing";
import { WrappedTree } from "./wrapped";
import { computeableSynthetic } from "./mobx-helpers";

describe("Test synthetic attribute evaluation", () => {
  describe("Tests for descendent attribute", () => {
    it("should find all descendents", () => {
      const itree = new WrappedTree(sampleTree1, indexedBinaryChildren);
      const ntree = new WrappedTree(sampleTree1, namedBinaryChildren);

      let count = 0;
      const desc = descendents<SimpleBinaryTree>();
      const icount: typeof desc = (x) => {
        count++;
        return desc(x);
      };
      const idesc = itree.syn(icount);
      const ndesc = ntree.syn(descendents());

      const itotal = idesc(itree.root);
      const ntotal = ndesc(itree.root);

      expect(itotal).toEqual(ntotal);
      expect(itotal.size).toEqual(14);
      expect(count).toEqual(15);

      /**
       * There is no memoization so we expect our evaluator to be called
       * repeatedly for the same ndoes.
       **/
      idesc(itree.root);
      expect(count).toEqual(30);

      // Create synthetic attribute to find all descendents as a set
      // compare sets from index and named trees
    });
    it("should find all descendents with caching", () => {
      const tree = new WrappedTree(sampleTree1, indexedBinaryChildren);

      let count = 0;
      const desc = descendents<SimpleBinaryTree>();
      const icount: typeof desc = (x) => {
        count++;
        return desc(x);
      };
      const idesc = tree.syn(icount, { memoize: "weakmap" });

      const itotal = idesc(tree.root);

      expect(itotal.size).toEqual(14);
      expect(count).toEqual(15);

      /**
       * There is memoization so we expect evaluating the attribute
       * (for all existing nodes) should not lead to any more evaluations.
       **/
      itotal.forEach((x) => idesc(x));
      expect(count).toEqual(15);

      // Create synthetic attribute to find all descendents as a set
      // compare sets from index and named trees
    });
    it("should find all descendents with large LRU cache", () => {
      const itree = new WrappedTree(sampleTree1, indexedBinaryChildren);

      let count = 0;
      const desc = descendents<SimpleBinaryTree>();
      const icount: typeof desc = (x) => {
        count++;
        return desc(x);
      };
      const idesc = itree.syn(icount, { memoize: "lru", lru: { max: 30 } });

      const itotal = idesc(itree.root);

      expect(itotal.size).toEqual(14);
      expect(count).toEqual(15);

      /**
       * There is memoization so we expect evaluating the attribute
       * (for all existing nodes) should not lead to any more evaluations.
       **/
      itotal.forEach((x) => idesc(x));
      expect(count).toEqual(15);

      // Create synthetic attribute to find all descendents as a set
      // compare sets from index and named trees
    });
    it("should find all descendents with small LRU cache", () => {
      const itree = new WrappedTree(sampleTree1, indexedBinaryChildren);

      let count = 0;
      const desc = descendents<SimpleBinaryTree>();
      const icount: typeof desc = (x) => {
        count++;
        return desc(x);
      };
      const idesc = itree.syn(icount, { memoize: "lru", lru: { max: 5 } });

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
      const itree = new WrappedTree(root, indexedBinaryChildren);

      let count = 0;
      const desc = computeableSynthetic(descendents<SimpleBinaryTree>());
      const icount: typeof desc = (x) => {
        count++;
        return desc(x);
      };
      // NB: This must be done at the same level as other memoization
      const idesc = itree.syn(icount, { memoize: "weakmap" });

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
