## Declarative Attribute Grammars in Javascript

It's an ambitious sounding name, but only time will tell if this is useful or even interesting.

The basic idea here is to implement something akin to
[`kiama`](https://github.com/inkytonik/kiama/blob/master/wiki/Attribution.md#markdown-header-repmin)
but in TypeScript. In practice, what this means is that you can take any tree
structured data (_e.g.,_ a CST, an AST, a file system, a JSON object) and you
can then annotate it with attributes. My thinking (still unproven) is that this
will simultaneously make the programming easier (easier to read, easier to code
all due to the declarative approach) and at the same time allow for lots of
interestion optimizations and tradeoffs in the implementation (lazy vs. eager
evaluation, memoization, observables).

It is worth pointing out that there are three fundamental types of attributes
that are currently supported:

- Synthetic attributes: These are attributes that depend on the contents of a
  given node and the value of this synthetic attribute zero or more children.
  Evaluation of a synthetic attribute is effectively a bottom-up process.
- Inherited attributes: These are attributes that depend on the contents of a
  given node and the value of this inherited attribute on the parent node (if
  one exists). Evaluation of an inherited attribute is effectively a top-down
  process.
- Derived attribute: A derived attribute relies only on the value of the current
  node and is completely independent of the value of this attribute on either
  its children or its parent.

**NB**: This library is written in such a way that attributes can be defined in
layers on a given tree. All the qualifications above about the process by which
attributes are evaluated apply **only to the attribute being defined** and not
on previously defined attributes.

## An Example

As an example, let's consider the same "repmin" example used in
[`kiama`](https://github.com/inkytonik/kiama/blob/master/wiki/Attribution.md#repmin).

We start by defining a very simple tree structure and then an instance of that
tree structure:

```typescript
export type Tree =
  | { type: "fork"; left: Tree; right: Tree }
  | { type: "leaf"; value: number };

const fork = (l: Tree, r: Tree): Tree => ({ type: "fork", left: l, right: r });
const leaf = (n: number): Tree => ({ type: "leaf", value: n });

const data = fork(leaf(3), fork(leaf(2), leaf(10)));
```

Now we can map out this tree and create our initial `ArborGlyph` instance as follows:

```typescript
const map = await TreeMap.create(
  new GenericVisitor(
    data,
    (x): Record<string, Tree> =>
      x.type === "leaf" ? {} : { left: x.left, right: x.right }
  )
);

const attributes = new ArborGlyph(map);
```

But this is pretty boring because we don't have any attributes. The
`arborglyph` API is a chaining API. So we add attributes by appending
additional calls to build up our annotated tree.

### Minimum Value Attribute

Let's say we want to add an attribute called `min` that computes the smallest
leaf value in a given subtree. We do this by adding the following to our definition of the `attributes` variable:

```typescript
let attributes = new ArborGlyph(map)
  .synthetic<number>(({ childAttrs, node }) =>
    node.type === "leaf"
      ? node.value
      : Math.min(childAttrs(node.left), childAttrs(node.right))
  )
  .named("min");
```

The `synthetic` method requires a function that can be used to compute synthetic attributes. In this case, we make use of the `childAttrs` and `node` information to compute the values of this attribute on our children and access the current node, respectively. So in our case, our evaluation first checks if the current node is a leaf and, if so, returns the node's value as the minimum. If, on the other hand, the node is not a leaf then we compute the minimum value between the minimum value associated with each child.

After we add this function, we name the attribute with the `named` method (why do we do this in two steps? it is to improve the developer experience by maximizing the amount of type inferencing possible while still givin the developer the ability to selectively specific some types but not all types, see [here](https://stackoverflow.com/a/60378737) and [here](https://medium.com/@nandiinbao/partial-type-argument-inference-in-typescript-and-workarounds-for-it-d7c772788b2e)).

Note that we don't need to worry about traversing the tree. Also, any time an attribute is calculated for any of these trees, it is cached by default (although you can override this).

### Global Minimum

Now let's say we wanted to compute the global minimum. In other words, let's
say I'm considering some node buried deep down in my tree but in that context, I
want to know "what is the smallest value that appears **anywhere** in this
tree?". That we implement with an _inherited_ attribute as follows:

```typescript
attributes = attributes
  .inherited<number>(({ parentValue, attrs, nid }) =>
    parentValue.orDefault(attrs.min(nid))
  )
  .named("globmin");
```

We just chain this on the end of our previous call. I'm using the `Maybe` type
here from `purify-ts` to represent the value of this global minimum from my
parent. But thing about parent nodes is that node all nodes have them.
Specfically, the root node doesn't have one. So this value is a `Maybe` because
we won't always be supplied one. In the case that we don't have a parent value,
we use the `OrDefault` method to specify what to use instead. In this case, we
grab the `min` attribute for the parent-less (_i.e.,_ root) node. From the
`attrs` object, we can reference any attribute previously defined for any node
in a **type-safe** way. This helps ensure that we aren't doing things that will lead to circular dependencies, for example.

This is one of the more interesting examples of why I think attribute grammars
are interesting. Look how simple the attribute evaluation is. And yet, we have
now communicated this information about the smallest leaf value in the graph to
(potentially) every node in the tree with the combination of these two simple
functions and without having to write any code to efficiently traverse the tree.

## Tree Transformations

OK, the final piece in the `repmin` puzzle is to clone the previous tree but
replace all values with the global minimum value. Since we now have the global
minimum value available for all nodes, our next attribute is another synthetic
attribute that "clones" itself by replacing all values with the global minimum:

```typescript
attributes = attributes
  .synthetic<Tree>(({ childAttrs, node, attrs, nid }) =>
    node.type === "leaf"
      ? leaf(attrs.globmin(nid))
      : fork(childAttrs(node.left), childAttrs(node.right))
  )
  .named("repmin");
```

In summary, here is the definition of our annotated tree:

```typescript
const attributes = new ArborGlyph(map)
  .synthetic<number>(({ childAttrs, node }) =>
    node.type === "leaf"
      ? node.value
      : Math.min(childAttrs(node.left), childAttrs(node.right))
  )
  .named("min")
  .inherited<number>(({ parentValue, attrs, nid }) =>
    parentValue.orDefault(attrs.min(nid))
  )
  .named("globmin")
  .synthetic<Tree>(({ childAttrs, node, attrs, nid }) =>
    node.type === "leaf"
      ? leaf(attrs.globmin(nid))
      : fork(childAttrs(node.left), childAttrs(node.right))
  )
  .named("repmin");
```

We can evaluate `repmin` on our root node as follows:

```typescript
attributes.queryNode("repmin", data);
```

...and the result we get back is:

```json
{
  "type": "fork",
  "left": {
    "type": "leaf",
    "value": 2
  },
  "right": {
    "type": "fork",
    "left": {
      "type": "leaf",
      "value": 2
    },
    "right": {
      "type": "leaf",
      "value": 2
    }
  }
}
```

All the details of the evaluation are completely taken care of behind the
scenes. The current implementations probably have plenty of room for
optimization, but they already implement lazy evaluation and caching. Future
work could be to add `mobx` support as well. But the key here is that a
considerable amount of work could be done on the performance side without having
to worry about rewriting any of the declarative constructs.

## Future Work

I suspect there may be a few other types of attributes worth implementing.

One would be a special synthetic attribute that is evaluated only at the root
(_i.e.,_ as an attribute of the tree as a whole).

Another would be an attribute that effectively defines a whole new tree. This
can already be done trivially with existing attributes for **isomorphic** trees.
But what I'm thinking about is attributes that define new non-isomorphic trees.
When combined with the proper `TreeVisitor`, this process could then lead to an
entire `ArborGlyph` instance associated with the new tree and, therefore,
entirely new layers of attributes layered onto the new tree structure.

A third attribute would be one that handles more pathological cases like
circular dependencies. I noticed that `kiama` has this, but I haven't yet
figured out what the use case is there (although I don't doubt there are some).

Another consideration here is how to deal with semantic error processing in the
context of both the tree traversal as well as in the propagation of errors
between layers of attributes.  I think I need a bit more practical examples
to figure out the best approach here.
