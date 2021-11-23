# Ideas

1. Get rid of get.

2. Add path attribute + name table

3. Add generic wrapper for caching (LRU, weakmap, etc)

4. Attribute<T,R> extendws ScalarFunction<T,R>

5. Add wrap, unwrap functionality for attrs **and** root (observable). Drop in for `mobx`.

6. Conditional attribute "wrapper" (Either + transform)

Add attributes in bulk (related ones) using desctructuring to get them out. (passing them a tree)

Add rerooting to attributes (support file parsing and `immer`)

Add derived type (skips all tree walking), no caching, no eager evaluation. Transform other attributes.

Rename `pre` to `eager`?

Companion libraries for `mobx`, `immer`, ...?

# Open Questions

**Errors**

- Just push into Either and let it be attributes problem?
- Collect errors while walking tree?
- Propagating errors?

# Completed

- Combine TreeType, WrappedTree into a single tree manager class.
