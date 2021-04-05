import { isObject } from "../util";
import { Namer } from "./namer";
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
function walkObject(
  cur: object,
  id: string,
  handler: TreeHandler<object>,
  visited: Set<object>,
  namer: Namer
) {
  /** Ensure we haven't visited this node before during our traversal. */
  if (visited.has(cur))
    throw new Error(`Circular reference found in ObjectVisitor`);
  /** Record this node and its associated id */
  handler({ type: "node", id: id, node: cur });

  /** Initialize a list of children */
  const children: string[] = [];

  /** Figure out how to traverse this.  Check for aggregate values, otherwise treat it as a leaf. */
  if (isObject(cur)) {
    /** If this is an object, treat each "entry" as a child */
    const entries = [...Object.entries(cur as UnknownObject)];
    for (const [key, child] of entries) {
      if (typeof child === "object" && child !== null) {
        const childId = namer(id, key);
        /** Record the child's parentage */
        handler({ type: "parent", id: childId, parent: id });
        /** Recurse */
        walkObject(child, childId, handler, new Set([...visited, cur]), namer);
        /** Push this child's `id` into the list of children. */
        children.push(childId);
      }
    }
  } else if (Array.isArray(cur)) {
    /** If this is an array, treat each element in the array as a child */
    for (let i = 0; i < cur.length; i++) {
      const child = cur[i] as unknown;
      if (typeof child === "object" && child !== null) {
        const childId = namer(id, i.toString());
        /** Record the child's parentage */
        handler({ type: "parent", id: childId, parent: id });
        /** Recurse */
        walkObject(child, childId, handler, new Set([...visited, cur]), namer);
        /** Push the child's `id` into the list of children */
        children.push(childId);
      }
    }
  } else {
    // If we get here, this is a leaf node, so there are no children to traverse or add.
  }

  /** Record all the children found */
  handler({ type: "children", id: id, children: children });
}

/**
 * This is an implementation of the `TreeVisitor` interface that traverses any
 * Javascript value as a tree.
 */
export class ObjectVisitor implements TreeVisitor<object> {
  constructor(
    /** The root node (value) */
    protected rootNode: object,
    /** The function used to hierarchically name the children. */
    protected namer: Namer = (parent, child) => `${parent}.${child}`,
    /** The name of the root node. */
    protected rootName: string = "$"
  ) {}
  get root(): string {
    return this.rootName;
  }
  /** Call the `walkObject` helper and wrap the result in a `Promise` */
  walk(handler: TreeHandler<any>): Promise<void> {
    return Promise.resolve(
      walkObject(this.rootNode, this.rootName, handler, new Set(), this.namer)
    );
  }
}
