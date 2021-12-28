/** Used when expecting a particular child node but it can't be found in the parent node. */
export class NoSuchChild<T> extends Error {
  constructor(public parent: T, public child: T, public root: T) {
    super("Unable to find requested child in parent");
  }
}
