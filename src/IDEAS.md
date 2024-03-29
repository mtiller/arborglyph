# Ideas

1. Simple fixed length array LRU implementation built in?

1. Conditional attribute "wrapper" (Either + transform)

1. Detect same node with multiple parents (i.e., appears twice in same tree)

Add attributes in bulk (related ones) using desctructuring to get them out. (passing them a tree)

Add rerooting to attributes (support file parsing and `immer`)

Companion libraries for `mobx`, `immer`, ...?

# Open Questions

**Errors**

- Just push into Either and let it be attributes problem?
- Collect errors while walking tree?
- Propagating errors?

# Completed

- Get rid of get. (not sure this is really possible)
- Combine TreeType, WrappedTree into a single tree manager class.
- Attribute<T,R> extendws ScalarFunction<T,R>
- Rename `pre` to `eager`?
- Add path attribute + name table
- Add derived type (skips all tree walking), no caching, no eager evaluation. Transform other attributes.
- Merge memoized value and children into a single entry.
- Builtin parent
- Add a cacheProvider option to allow alternative implementations of `CacheStorage` interface besides `WeakMap`
- Custom reifier for MobX to wrap evaluations and attributes in `IComputedValue`s.
