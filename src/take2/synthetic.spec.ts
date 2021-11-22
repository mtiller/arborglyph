import { descendents } from "./common";
import { indexBinaryTree, namedBinaryTree, sampleTree1 } from "./testing";
import { WrappedTree } from "./wrapped";

describe("Test synthetic attribute evaluation", () => {
  describe("Tests for descendent attribute", () => {
    it("should find all descendents", () => {
      const itree = new WrappedTree(indexBinaryTree(sampleTree1));
      const ntree = new WrappedTree(namedBinaryTree(sampleTree1));

      const idesc = itree.syn(descendents());
      const ndesc = ntree.syn(descendents());

      const itotal = idesc(itree.tree.root);
      const ntotal = ndesc(itree.tree.root);

      expect(itotal).toEqual(ntotal);
      console.log([...itotal]);
      expect(itotal.size).toEqual(14);

      // Create synthetic attribute to find all descendents as a set
      // compare sets from index and named trees
    });
  });
});
