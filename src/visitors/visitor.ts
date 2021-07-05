/** An event announcing the parent of a particular node */
export interface ParentEvent<T extends object> {
  type: "parent";
  parent: T;
  node: T;
}

/** An event announcing the name of a particular node. */
export interface NodeEvent<T extends object> {
  type: "node";
  node: T;
}

/** An event announcing the names of all children associated with a given node. */
export interface ChildrenEvent<T> {
  type: "children";
  node: T;
  children: T[];
}

/** The union of all possible events */
export type TreeEvent<T extends object> =
  | ParentEvent<T>
  | ChildrenEvent<T>
  | NodeEvent<T>;

/** A type for functions that handle these tree events */
export type TreeHandler<T extends object> = (event: TreeEvent<T>) => void;

/**
 * The `TreeVisitor` interface is a very simple interface that can be
 * implemented to handle any data structure that can be synchronously
 * mapped to a tree.
 */
export interface TreeVisitor<T extends object> {
  root: T;
  walk(from: T, handler: TreeHandler<T>): void;
}

/**
 * The `AsyncTreeVisitor` interface is a very simple interface that can be
 * implemented to handle any data structure that can be asynchronously
 * mapped to a tree.
 */
export interface AsyncTreeVisitor<T extends object> {
  root: T;
  walk(from: T, handler: TreeHandler<T>): Promise<void>;
}
