import { TreeVisitor, TreeHandler, AsyncTreeVisitor } from "./visitor";

/**
 * This is a helper function that recursively walks any Javascript value treating it like a tree.
 * @param cur
 * @param id
 * @param handler
 * @param visited
 * @param namer
 */
 export function walkTree<T extends object>(
    cur: T,
    visitor: TreeVisitor<T>,
    handler: TreeHandler<T>,
    visited: Set<T>
  ) {
    /** Ensure we haven't visited this node before during our traversal. */
    if (visited.has(cur))
      throw new Error(`Circular reference found in ObjectVisitor`);
    /** Record this node and its associated id */
    handler({ type: "node", node: cur });
  
    visited.add(cur);
  
    const children = visitor.children(cur);
  
    for(const child of children) {
      handler({ type: "parent", parent: cur, node: child });
      walkTree(child, visitor, handler, visited);
    }
  
    /** Record all the children found */
    handler({ type: "children", node: cur, children: children });
  }
  
  /**
   * This is a helper function that recursively walks any Javascript value treating it like a tree.
   * @param cur
   * @param id
   * @param handler
   * @param visited
   * @param namer
   */
   export async function walkAsyncTree<T extends object>(
    cur: T,
    visitor: AsyncTreeVisitor<T>,
    handler: TreeHandler<T>,
    visited: Set<T>
  ): Promise<void> {
    /** Ensure we haven't visited this node before during our traversal. */
    if (visited.has(cur))
      throw new Error(`Circular reference found in ObjectVisitor`);
    /** Record this node and its associated id */
    handler({ type: "node", node: cur });
  
    visited.add(cur);
  
    const children = await visitor.children(cur);
  
    for(const child of children) {
      handler({ type: "parent", parent: cur, node: child });
      walkAsyncTree(child, visitor, handler, visited);
    }
  
    /** Record all the children found */
    handler({ type: "children", node: cur, children: children });
  }
  