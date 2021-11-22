import { TreeType } from "./treetypes";

export class NodeNotFoundError<T> extends Error {
  constructor(public n: T, public tree: TreeType<T>) {
    super("Unable to find node in tree");
  }
}
