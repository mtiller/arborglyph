import { Namer } from "./namer";
import { AsyncTreeVisitor, TreeHandler, TreeVisitor } from "./visitor";

/**
 * A function that, when given a node, returns a map naming and identifying each
 * of its children.
 **/
export type NamedChildren<T> = (n: T) => Record<string, T> | {};

/**
 * A function that, when given a node, returns a promise to a map naming and
 * identifying each of its children.
 **/
export type NamedAsyncChildren<T> = (n: T) => Promise<Record<string, T> | {}>;

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
function walkGeneric<T>(
  cur: T,
  id: string,
  handler: TreeHandler<T>,
  visited: Set<T>,
  getChildren: NamedChildren<T>,
  namer: Namer
): void {
  /** If we find a node we've already visited, throw an error. */
  if (visited.has(cur))
    throw new Error(`Circular reference found in ObjectVisitor`);

  /** Record this node and its name */
  handler({ type: "node", id: id, node: cur });

  /** Now, find all children and map them into a data structure per child */
  const children = Object.entries(getChildren(cur)).map(
    ([childName, child]) => ({
      childName,
      child,
      childId: namer(id, childName),
    })
  );

  /** Iterate over the children and... */
  for (const { child, childId } of children) {
    /** Notify the `handler` of the parentage of this node... */
    handler({ type: "parent", id: childId, parent: id });
    /** ...and then recurse into the children */
    walkGeneric(
      child,
      childId,
      handler,
      new Set([...visited, cur]),
      getChildren,
      namer
    );
  }
  /** Once we've walked all the children, report all children found to the `handler` */
  handler({
    type: "children",
    id: id,
    children: children.map((x) => x.childId),
  });
}

/**
 * An implementation of the `TreeVisitor` interface that works for any data
 * structure that provides a `NamedChildren` type function.
 */
export class GenericVisitor<T> implements TreeVisitor<T> {
  constructor(
    /** The root node of the tree */
    protected rootNode: T,
    /** The function that identifies children */
    protected children: NamedChildren<T>,
    /** A function used to formulate hierarchical names */
    protected namer: Namer = (parent, child) => `${parent}.${child}`,
    /** The name given to the root node */
    protected rootName: string = "$"
  ) {}
  get root(): string {
    return this.rootName;
  }
  /** Invoke the generic walker and wrap the result in a `Promise` */
  walk(handler: TreeHandler<any>): void {
    return walkGeneric(
      this.rootNode,
      this.rootName,
      handler,
      new Set(),
      this.children,
      this.namer
    );
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
async function walkAsyncGeneric<T>(
  cur: T,
  id: string,
  handler: TreeHandler<T>,
  visited: Set<T>,
  getChildren: NamedAsyncChildren<T>,
  namer: Namer
): Promise<void> {
  /** If we find a node we've already visited, throw an error. */
  if (visited.has(cur))
    throw new Error(`Circular reference found in ObjectVisitor`);

  /** Record this node and its name */
  handler({ type: "node", id: id, node: cur });

  /** Now, find all children and map them into a data structure per child */
  const children = Object.entries(await getChildren(cur)).map(
    ([childName, child]) => ({
      childName,
      child,
      childId: namer(id, childName),
    })
  );

  /** Iterate over the children and... */
  for (const { child, childId } of children) {
    /** Notify the `handler` of the parentage of this node... */
    handler({ type: "parent", id: childId, parent: id });
    /** ...and then recurse into the children */
    walkGeneric(
      child,
      childId,
      handler,
      new Set([...visited, cur]),
      getChildren,
      namer
    );
  }
  /** Once we've walked all the children, report all children found to the `handler` */
  handler({
    type: "children",
    id: id,
    children: children.map((x) => x.childId),
  });
}

/**
 * An implementation of the `TreeVisitor` interface that works for any data
 * structure that provides a `NamedChildren` type function but needs to
 * make async calls to identify children.
 */
export class GenericAsyncVisitor<T> implements AsyncTreeVisitor<T> {
  constructor(
    /** The root node of the tree */
    protected rootNode: T,
    /** The function that identifies children */
    protected children: NamedAsyncChildren<T>,
    /** A function used to formulate hierarchical names */
    protected namer: Namer = (parent, child) => `${parent}.${child}`,
    /** The name given to the root node */
    protected rootName: string = "$"
  ) {}
  get root(): string {
    return this.rootName;
  }
  /** Invoke the generic walker and wrap the result in a `Promise` */
  walk(handler: TreeHandler<any>): Promise<void> {
    return walkAsyncGeneric(
      this.rootNode,
      this.rootName,
      handler,
      new Set(),
      this.children,
      this.namer
    );
  }
}
