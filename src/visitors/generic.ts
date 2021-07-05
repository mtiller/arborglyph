import { Namer } from "./namer";
import { AsyncTreeVisitor, TreeHandler, TreeVisitor } from "./visitor";

/**
 * A function that, when given a node, returns a map naming and identifying each
 * of its children.
 **/
export type NamedChildren<T> = (
  n: T
) => (Record<string, T> & { then?: never }) | {};

const x: NamedChildren<string> = (x) => ({});

/**
 * A function that, when given a node, returns a promise to a map naming and
 * identifying each of its children.
 **/
export type NamedAsyncChildren<T> = (
  n: T
) => Promise<(Record<string, T> & { then?: never }) | {}>;

/**
 * A helper function that recursively walks a generic data structure with the help
 * of a `getChildren` method invoking the `handler` method as it goes.
 *
 * @param cur
 * @param id
 * @param handler
 * @param visited
 * @param getChildren
 * @param namer
 */
function walkGeneric<T extends object>(
  cur: T,
  handler: TreeHandler<T>,
  visited: Set<T>,
  getChildren: NamedChildren<T>
): void {
  /** If we find a node we've already visited, throw an error. */
  if (visited.has(cur))
    throw new Error(`Circular reference found in ObjectVisitor`);

  /** Record this node and its name */
  handler({ type: "node", node: cur });

  /** Now, find all children and map them into a data structure per child */
  const children = Object.entries(getChildren(cur)).map(
    ([childName, child]) => ({
      childName,
      child,
    })
  );

  /** Iterate over the children and... */
  for (const { child } of children) {
    if (child === undefined) continue;
    /** Notify the `handler` of the parentage of this node... */
    handler({ type: "parent", parent: cur, node: child });
    /** ...and then recurse into the children */
    walkGeneric(child, handler, new Set([...visited, cur]), getChildren);
  }
  /** Once we've walked all the children, report all children found to the `handler` */
  handler({
    type: "children",
    node: cur,
    children: children.map((x) => x.child),
  });
}

/**
 * An implementation of the `TreeVisitor` interface that works for any data
 * structure that provides a `NamedChildren` type function.
 */
export class GenericVisitor<T extends object> implements TreeVisitor<T> {
  constructor(
    /** The root node of the tree */
    protected rootNode: T,
    /** The function that identifies children */
    protected namedChildren: NamedChildren<T>
  ) {}
  get root(): T {
    return this.rootNode;
  }
  children(n: T): T[] {
    return Object.entries(this.namedChildren(n)).map(x => x[1]);
  }
  /** Invoke the generic walker and wrap the result in a `Promise` */
  walk(from: T, handler: TreeHandler<any>): void {
    return walkGeneric(from, handler, new Set(), this.namedChildren);
  }
}

/**
 * A helper function that recursively walks a generic data structure with the help
 * of a `getChildren` method invoking the `handler` method as it goes.  This function
 * assumes children are identified asynchronously.
 *
 * @param cur
 * @param id
 * @param handler
 * @param visited
 * @param getChildren
 * @param namer
 */
async function walkAsyncGeneric<T extends object>(
  cur: T,
  handler: TreeHandler<T>,
  visited: Set<T>,
  getChildren: NamedAsyncChildren<T>
): Promise<void> {
  /** If we find a node we've already visited, throw an error. */
  if (visited.has(cur))
    throw new Error(`Circular reference found in ObjectVisitor`);

  /** Record this node and its name */
  handler({ type: "node", node: cur });

  /** Now, find all children and map them into a data structure per child */
  const children = Object.entries(await getChildren(cur)).map(
    ([childName, child]) => ({
      childName,
      child,
    })
  );

  /** Iterate over the children and... */
  for (const { child } of children) {
    /** Notify the `handler` of the parentage of this node... */
    handler({ type: "parent", parent: cur, node: child });
    /** ...and then recurse into the children */
    walkAsyncGeneric(child, handler, new Set([...visited, cur]), getChildren);
  }
  /** Once we've walked all the children, report all children found to the `handler` */
  handler({
    type: "children",
    node: cur,
    children: children.map((x) => x.child),
  });
}

/**
 * An implementation of the `TreeVisitor` interface that works for any data
 * structure that provides a `NamedChildren` type function but needs to
 * make async calls to identify children.
 */
export class GenericAsyncVisitor<T extends object>
  implements AsyncTreeVisitor<T> {
  constructor(
    /** The root node of the tree */
    protected rootNode: T,
    /** The function that identifies children */
    protected namedChildren: NamedAsyncChildren<T>
  ) {}
  get root(): T {
    return this.rootNode;
  }
  async children(n: T): Promise<T[]> {
    const c = await this.namedChildren(n);
    return Object.entries(c).map(x => x[1]);
  }
  /** Invoke the generic walker and wrap the result in a `Promise` */
  walk(from: T, handler: TreeHandler<any>): Promise<void> {
    return walkAsyncGeneric(from, handler, new Set(), this.namedChildren);
  }
}
