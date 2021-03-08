import { Just, Maybe, Nothing } from "purify-ts/Maybe";
import { PureMap } from "./puremap";
import { TreeVisitor } from "../visitors/visitor";

/**
 * This class generates a tree map which is simply a representation of the
 * parent and child relationships in a given structure.  We don't traverse the
 * tree here, that is handled `TreeVisitor` instance.  We just record events
 * that occur as the tree is traverse and cache that information for easy
 * retrieval later.
 */
export class TreeMap<T> {
  /**
   * Because the `TreeVisitor` is potentially operating asynchronously, we use a
   * static method that returns a `Promise` to a constructoed `TreeMap` once the
   * traversal is complete.
   *
   * As part of this process, each node in the tree will be given a unique
   * identifier.
   *
   * @param visitor
   * @returns
   */
  static async create<T>(visitor: TreeVisitor<T>): Promise<TreeMap<T>> {
    const ret = new TreeMap<T>(visitor);
    await ret.populate();
    return ret;
  }

  /**
   * Maps a node's id to the parents id (if the parent exists).
   */
  protected parentMap = new PureMap<string, string>();
  /**
   * Maps a node's id to the ids of all its children.
   */
  protected childMap = new PureMap<string, string[]>();
  /**
   * Maps a node's id to the underlying node (of type `T`)
   */
  protected nodeMap = new PureMap<string, T>();
  /**
   * A constructor that is only invoked by the `TreeMap.create` method.
   * @param visitor
   */
  protected constructor(protected visitor: TreeVisitor<T>) {}

  /**
   * A protected method that invokes the `visitor`'s `walk` method
   * and records information it receives during the walk.
   * @returns
   */
  protected populate(): Promise<void> {
    return this.visitor.walk((event) => {
      switch (event.type) {
        case "parent": {
          this.parentMap.setFirst(event.id, event.parent);
          break;
        }
        case "node": {
          this.nodeMap.setFirst(event.id, event.node);
          break;
        }
        case "children": {
          this.childMap.setFirst(event.id, event.children);
          break;
        }
      }
    });
  }
  /** ids of all nodes in the tree */
  get ids() {
    return this.nodeMap.keys();
  }
  /** Id of the root node */
  get root() {
    return this.visitor.root;
  }
  /**
   * Find a given node of type `T` and return its id.  Note that this search is
   * not (currently) optimized and it is (at least) O(n) since it is being done
   * in the reverse direction.  So the use of this function should be minimized.
   **/
  find(n: T): Maybe<string> {
    for (const [id, node] of this.nodeMap.entries()) {
      if (node === n) return Just(id);
    }
    return Nothing;
  }
  /**
   * Returns the parent node (if it exsts) of the given node id.
   * @param n
   * @returns
   */
  parentNode(n: string): Maybe<T> {
    return this.parent(n).map((p) => this.node(p));
  }
  /**
   * Returns the parent node id (if it exsts) of the given node id.
   * @param n
   * @returns
   */
  parent(n: string): Maybe<string> {
    if (n === this.visitor.root) return Nothing;
    return Just(
      this.parentMap.mustGet(
        n,
        new Error(`Node ${n} does not exist in this tree`)
      )
    );
  }
  /**
   * Return the ids of any children of this node.
   * @param n
   * @returns
   */
  children(n: string): string[] {
    return this.childMap.mustGet(
      n,
      new Error(`Node ${n} does not exist in this tree`)
    );
  }
  /**
   * Return the underlying node associated with a given node id
   * @param n
   * @returns
   */
  node(n: string): T {
    return this.nodeMap.mustGet(
      n,
      new Error(`Node ${n} does not exist in this tree`)
    );
  }
}
