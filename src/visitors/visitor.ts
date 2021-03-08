/** An event announcing the parent of a particular node */
export interface ParentEvent {
  type: "parent";
  id: string;
  parent: string;
}

/** An event announcing the name of a particular node. */
export interface NodeEvent<T> {
  type: "node";
  id: string;
  node: T;
}

/** An event announcing the names of all children associated with a given node. */
export interface ChildrenEvent {
  type: "children";
  id: string;
  children: string[];
}

/** The union of all possible events */
export type TreeEvent<T> = ParentEvent | ChildrenEvent | NodeEvent<T>;

/** A type for functions that handle these tree events */
export type TreeHandler<T> = (event: TreeEvent<T>) => void;

/**
 * The `TreeVisitor` interface is a very simple interface that can be
 * implemented to handle any data structure that can be mapped to a tree.
 */
export interface TreeVisitor<T> {
  root: string;
  walk(handler: TreeHandler<T>): Promise<void>;
}
