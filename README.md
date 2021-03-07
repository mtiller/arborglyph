# Basic Idea

- Support various types of tree (files, JSON objects, ???), so an `TreeWalker` interface is required.

  - All nodes in a tree must have a unique `id`

- Support four fundamental transforms

  - Synthetic attribute
  - Inherited attribute
  - Root attribute
  - New Tree (from root attribute, i.e., new `TreeWalker`)

- Support multiple evaluation strategies

  - Uncached (simplest...just evaluate every time)
  - Lazy cached (don't evaluate anything until we need it)
  - Eager cached (evaluate everything right at the start)

- Attributes should be layered
  - Use a chaining API to layer on attributes
  - Each new layer (only) gets access to attributes defined previously.
  - Each layer can define evaluation function, caching strategy, other options.
