import { Maybe } from "purify-ts/Maybe";
import { PureWeakMap } from "./puremap";
import { AsyncTreeVisitor, TreeEvent, TreeVisitor } from "../visitors/visitor";

/**
 * This class generates a tree map which is simply a representation of the
 * parent and child relationships in a given structure.  We don't traverse the
 * tree here, that is handled `TreeVisitor` instance.  We just record events
 * that occur as the tree is traverse and cache that information for easy
 * retrieval later.
 */
export class TreeMap<T extends object> {
  /**
   * Use a synchronous `TreeVisitor` to create the map.  It would be ideal if this
   * could (at some point) be made part of the constructor.  But, unfortunately,
   * the current API makes it difficult to deal with synchrnous and asynchrnous
   * mapping.  This is a potential are of improvement.
   *
   * @param visitor
   * @returns
   */
  static create<T extends object>(visitor: TreeVisitor<T>): TreeMap<T> {
    const ret = new TreeMap<T>(visitor);
    ret.rewalk();
    return ret;
  }

  /**
   * Because the `AsyncTreeVisitor` is operating asynchronously, we use a
   * static method that returns a `Promise` to a constructoed `TreeMap` once the
   * traversal is complete.
   *
   * As part of this process, each node in the tree will be given a unique
   * identifier.
   * 
   * TODO: I'm reconsidering the wisdom of supporting this.  It seems to me that
   * perhaps a better approach would be to have an async step that builds a
   * complete tree in memory rather than making the tree building itself async.
   * The effect would be that we wouldn't need to treat async as a special case.
   * 
   * TODO: Make this a method of the Visitor?
   *
   * @param visitor
   * @returns
   */
  static async createAsync<T extends object>(
    visitor: AsyncTreeVisitor<T>
  ): Promise<TreeMap<T>> {
    const ret = new TreeMap<T>(visitor);
    await visitor.walk(eventProcessor(ret.parentMap, ret.nodeSet, ret.childMap));
    return ret;
  }

  /** A method to clear the existing map in preparation for rewalking the tree. */
  protected clear() {
    this.parentMap = new PureWeakMap<T, T>();
    this.childMap = new PureWeakMap<T, T[]>();
    this.nodeSet = new Set<T>();
  }

  /** 
   * Trigger rewalking of the tree.
   * 
   * TODO: Optimize so we only rewalk the subtree that changed.  To do this,
   * we'll need to clear out **only** the nodes affected from `parentMap`,
   * `childMap` and `nodeSet` before rewalking.
  */
  public rewalk(from?: T) {
    this.clear();
    return this.visitor.walk(eventProcessor(this.parentMap, this.nodeSet, this.childMap));
  }

  /**
   * Maps a node's id to the parents id (if the parent exists).
   */
  protected parentMap = new PureWeakMap<T, T>();
  /**
   * Maps a node's id to the ids of all its children.
   */
  protected childMap = new PureWeakMap<T, T[]>();
  /**
   * The set of nodes in the tree
   */
  protected nodeSet = new Set<T>();
  /**
   * A constructor that is only invoked by the `TreeMap.create` method.
   * @param visitor
   */
  protected constructor(protected visitor: TreeVisitor<T>) {}

  get nodes() {
    return this.nodeSet;
  }
  /** Id of the root node */
  get root() {
    return this.visitor.root;
  }

  /** Determine if a given (potential) node is in this tree */
  contains(n: T): boolean {
    return this.nodeSet.has(n);
  }
  /**
   * Returns the parent node (if it exsts) of the given node id.
   * @param n
   * @returns
   */
  parent(n: T): Maybe<T> {
    return this.parentMap.getMaybe(n);
  }
  /**
   * Return the children of this node.
   * @param n
   * @returns
   */
  children(n: T): T[] {
    return this.childMap.mustGet(
      n,
      new Error(`Node ${n} does not exist in this tree`)
    );
  }
}

function eventProcessor<T extends object>(
  parentMap: PureWeakMap<T, T>,
  nodeSet: WeakSet<T>,
  childMap: PureWeakMap<T, T[]>
) {
  return (event: TreeEvent<T>) => {
    switch (event.type) {
      case "parent": {
        parentMap.setFirst(
          event.node,
          event.parent,
          `Setting parent node for node that already has a parent`
        );
        break;
      }
      case "node": {
        if (nodeSet.has(event.node))
          throw new Error(`Adding node that was already added`);
        nodeSet.add(event.node);
        break;
      }
      case "children": {
        childMap.setFirst(
          event.node,
          event.children,
          `Setting children of node that already has children associated with it`
        );
        break;
      }
    }
  };
}

/**
 * A function that invokes the asynchronous `visitor`'s `walk` method
 * and records information it receives during the walk.
 * @returns
 */
async function populateAsync<T extends object>(
  visitor: AsyncTreeVisitor<T>,
  parentMap: PureWeakMap<T, T>,
  nodeSet: WeakSet<T>,
  childMap: PureWeakMap<T, T[]>
): Promise<void> {
  return visitor.walk(eventProcessor(parentMap, nodeSet, childMap));
}
