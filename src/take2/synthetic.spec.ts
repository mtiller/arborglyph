import { descendents } from "./common";
import {
  indexBinaryTree,
  namedBinaryTree,
  sampleTree1,
  SimpleBinaryTree,
} from "./testing";
import { WrappedTree } from "./wrapped";

describe("Test synthetic attribute evaluation", () => {
  describe("Tests for descendent attribute", () => {
    it("should find all descendents", () => {
      const itree = new WrappedTree(indexBinaryTree(sampleTree1));
      const ntree = new WrappedTree(namedBinaryTree(sampleTree1));

      let count = 0;
      const desc = descendents<SimpleBinaryTree>();
      const icount: typeof desc = (x) => {
        count++;
        return desc(x);
      };
      const idesc = itree.syn(icount);
      const ndesc = ntree.syn(descendents());

      const itotal = idesc(itree.tree.root);
      const ntotal = ndesc(itree.tree.root);

      expect(itotal).toEqual(ntotal);
      console.log([...itotal]);
      expect(itotal.size).toEqual(14);
      expect(count).toEqual(15);

      /**
       * There is no memoization so we expect our evaluator to be called
       * repeatedly for the same ndoes.
       **/
      idesc(itree.tree.root);
      expect(count).toEqual(30);

      // Create synthetic attribute to find all descendents as a set
      // compare sets from index and named trees
    });
    it("should find all descendents with caching", () => {
      const itree = new WrappedTree(indexBinaryTree(sampleTree1));
      const ntree = new WrappedTree(namedBinaryTree(sampleTree1));

      let count = 0;
      const desc = descendents<SimpleBinaryTree>();
      const icount: typeof desc = (x) => {
        count++;
        return desc(x);
      };
      const idesc = itree.syn(icount, { memoize: "yes" });
      const ndesc = ntree.syn(descendents());

      const itotal = idesc(itree.tree.root);
      const ntotal = ndesc(itree.tree.root);

      expect(itotal).toEqual(ntotal);
      console.log([...itotal]);
      expect(itotal.size).toEqual(14);
      expect(count).toEqual(15);

      /**
       * There is no memoization so we expect our evaluator to be called
       * repeatedly for the same ndoes.
       **/
      idesc(itree.tree.root);
      expect(count).toEqual(15);

      // Create synthetic attribute to find all descendents as a set
      // compare sets from index and named trees
    });
  });
});
