# Ideas

1. Get rid of get.

1. Add generic wrapper for caching (LRU, weakmap, etc)

1. Add wrap, unwrap functionality for attrs **and** root (observable). Drop in for `mobx`.

1. Conditional attribute "wrapper" (Either + transform)

1. Merge memoized value and children into a single entry.

Add attributes in bulk (related ones) using desctructuring to get them out. (passing them a tree)

Add rerooting to attributes (support file parsing and `immer`)

Companion libraries for `mobx`, `immer`, ...?

# Open Questions

**Errors**

- Just push into Either and let it be attributes problem?
- Collect errors while walking tree?
- Propagating errors?

# Completed

- Combine TreeType, WrappedTree into a single tree manager class.
- Attribute<T,R> extendws ScalarFunction<T,R>
- Rename `pre` to `eager`?
- Add path attribute + name table
- Add derived type (skips all tree walking), no caching, no eager evaluation. Transform other attributes.
