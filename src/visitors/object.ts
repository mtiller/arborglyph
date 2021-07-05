import { isExactlyObject } from "../util";
import { TreeHandler, TreeVisitor } from "./visitor";

export type UnknownObject = { [key: string]: unknown };
export type UnkonwnArray = Array<unknown>;

/**
 * This is a helper function that recursively walks any Javascript value treating it like a tree.
 * @param cur
 * @param id
 * @param handler
 * @param visited
 * @param namer
 */
function walkObject<T extends object>(
  cur: T,
  handler: TreeHandler<T>,
  visited: Set<T>,
  pred: (n: any) => n is T
) {
  /** Ensure we haven't visited this node before during our traversal. */
  if (visited.has(cur))
    throw new Error(`Circular reference found in ObjectVisitor`);
  /** Record this node and its associated id */
  handler({ type: "node", node: cur });

  /** Initialize a list of children */
  const children: T[] = [];

  /** Figure out how to traverse this.  Check for aggregate values, otherwise treat it as a leaf. */
  if (isExactlyObject(cur)) {
    /** If this is an object, treat each "entry" as a child */
    const entries = [...Object.entries(cur as UnknownObject)];
    for (const [key, child] of entries) {
      if (pred(child) && child !== null) {
        /** Record the child's parentage */
        handler({ type: "parent", parent: cur, node: child });
        /** Recurse */
        walkObject(child, handler, new Set([...visited, cur]), pred);
        /** Push this child's `id` into the list of children. */
        children.push(child);
      }
    }
  } else if (Array.isArray(cur)) {
    /** If this is an array, treat each element in the array as a child */
    for (let i = 0; i < cur.length; i++) {
      const child = cur[i] as unknown;
      if (pred(child) && child !== null) {
        /** Record the child's parentage */
        handler({ type: "parent", parent: cur, node: child });
        /** Recurse */
        walkObject(child, handler, new Set([...visited, cur]), pred);
        /** Push the child's `id` into the list of children */
        children.push(child);
      }
    }
  } else {
    // If we get here, this is a leaf node, so there are no children to traverse or add.
  }

  /** Record all the children found */
  handler({ type: "children", node: cur, children: children });
}

/**
 * This is an implementation of the `TreeVisitor` interface that traverses any
 * Javascript value as a tree.
 */
export class ObjectVisitor<T extends object> implements TreeVisitor<T> {
  constructor(
    /** The root node (value) */
    protected rootNode: T,
    protected pred: (n: T) => n is T
  ) {}
  get root(): T {
    return this.rootNode;
  }
  /** Call the `walkObject` helper and wrap the result in a `Promise` */
  walk(from: T, handler: TreeHandler<any>): Promise<void> {
    return Promise.resolve(
      walkObject(from, handler, new Set(), this.pred)
    );
  }
}
