export class NodeNotFoundError<T> extends Error {
  constructor(public n: T, public root: T) {
    super("Unable to find node in tree");
  }
}

export class NodeSuchChild<T> extends Error {
  constructor(public parent: T, public child: T, public root: T) {
    super("Unable to find requested child in parent");
  }
}