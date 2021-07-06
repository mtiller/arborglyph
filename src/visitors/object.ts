import { isExactlyObject } from "../util";
import { TreeHandler, TreeVisitor } from "./visitor";

export type UnknownObject = { [key: string]: unknown };
export type UnkonwnArray = Array<unknown>;

/**
 * This is an implementation of the `TreeVisitor` interface that traverses any
 * Javascript value as a tree.
 */
export class ObjectVisitor<T extends object> implements TreeVisitor<T> {
  constructor(
    /** The root node (value) */
    protected rootNode: T,
    protected pred: (n: any) => n is T
  ) {}
  get root(): T {
    return this.rootNode;
  }
  children(cur: T): T[] {
    /** Figure out how to traverse this.  Check for aggregate values, otherwise treat it as a leaf. */
    if (isExactlyObject(cur)) {
      /** If this is an object, treat each "entry" as a child */
      const entries = [...Object.entries(cur as UnknownObject)];
      return entries.map(x => x[1]).filter(this.pred);
    } else if (Array.isArray(cur)) {
      return cur.filter(this.pred);
    } else {
      return [];
      // If we get here, this is a leaf node, so there are no children to traverse or add.
    }
  }
}
