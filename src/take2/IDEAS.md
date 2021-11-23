0. Combine TreeType, WrappedTree into a single tree manager class.

1. Get rid of get.

2. Add path attribute + name table

3. Attribute<T,R> extendws ScalarFunction<T,R>

4. Add wrap, unwrap functionality. Drop in for `mobx`.

Add attributes in bulk (related ones) using desctructuring to get them out. (passing them a tree)

Add rerooting to attributes (support file parsing and `immer`)

Add derived type (skips all tree walking), no caching, no eager evaluation. Transform other attributes.

Rename `pre` to `eager`?

Companion libraries for `mobx`, `immer`, ...?
