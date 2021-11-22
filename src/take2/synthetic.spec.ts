import { indexBinaryTree, namedBinaryTree, sampleTree1 } from "./testing";

describe("Test synthetic attribute evaluation", () => {
  describe("Tests for descendent attribute", () => {
    it("should find all descendents", () => {
      const itree = indexBinaryTree(sampleTree1);
      const ntree = namedBinaryTree(sampleTree1);

      // Create synthetic attribute to find all descendents as a set
      // compare sets from index and named trees
    });
  });
});
