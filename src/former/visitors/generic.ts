import { AsyncTreeVisitor, TreeVisitor } from "./visitor";

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

    return Object.entries(c).map(
      ([_, child]) => child
    );
  }
}
