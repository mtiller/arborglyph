# Cache Invalidation

When the `memoize` option is used, the results of a calculation are memoized.
This minimizes the number of re-evaluations of that attribute. In general, this
is a good thing. However, there are various complications to be aware of.

## Pure Attributes

When we create attributes, we declare them generally as either synthetic (value
computed based on current node and descendent nodes) or inherited (value
computed on current node or ancestor nodes).

If a synthetic attribute depends exclusively on the values of the current node
or descendents, we call it `pure`. Similarly, if an inherited attribute depends
exclusively on the values of the current node or its ancestors, we also call it
`pure`.

But you might ask "how could it be any other way?". Although the functions used
to define attributes limit access in that function to values of attributes of
either immediate children or the parent node (depending on whether it is a
synthetic attribute or inherited attribute, respectively), these functions also
have access to the node being evaluated. That node can also be used to invoke
_other_ attributes (_i.e._, if the evaluation function encloses other
attributes).

## Why Does This Matter?

If no memoization is being performed, it doesn't matter. But as soon as we are
concerned with memoization, it matters quite a bit. Let's take the pure cases first. Imagine a tree link the following:

[![](https://mermaid.ink/svg/eyJjb2RlIjoiZ3JhcGggVERcbiAgICBBIC0tPiBCXG4gICAgQSAtLT4gQyBcbiAgICBCIC0tPiBEIFxuICAgIEIgLS0-IEVcbiAgICBDIC0tPiBGXG4gICAgQyAtLT4gR1xuXG4gICIsIm1lcm1haWQiOnsidGhlbWUiOiJkYXJrIn0sInVwZGF0ZUVkaXRvciI6ZmFsc2UsImF1dG9TeW5jIjp0cnVlLCJ1cGRhdGVEaWFncmFtIjpmYWxzZX0)](https://mermaid.live/edit/#eyJjb2RlIjoiZ3JhcGggVERcbiAgICBBIC0tPiBCXG4gICAgQSAtLT4gQyBcbiAgICBCIC0tPiBEIFxuICAgIEIgLS0-IEVcbiAgICBDIC0tPiBGXG4gICAgQyAtLT4gR1xuXG4gICIsIm1lcm1haWQiOiJ7XG4gIFwidGhlbWVcIjogXCJkYXJrXCJcbn0iLCJ1cGRhdGVFZGl0b3IiOmZhbHNlLCJhdXRvU3luYyI6dHJ1ZSwidXBkYXRlRGlhZ3JhbSI6ZmFsc2V9)

If we consider attribute values associated with node `C`, we find that synthetic attributes associated with node `C` will depend only on nodes `C`, `F` and `G`. However, inherited attributes of node `C` will depend on node `C` and node `A`.

This information is useful for invalidating cached (memoized) attribute values.
If a change is made, for example, to node `F`, we now that any synthetic
attributes associated with nodes `A`, `C` and `F` might be impacted. But we
also know that only inherited attribute values associated with node` F` will be
impacted (because `F` has no children). Similarly, if a change to node `C` is
made, we know that this will invalidate any cached synthetic attribute values
associated with node `C` and node `A` as well as any cached inherited values
associated with nodes `C`, `F` and `G`.

But these assumptions are only true if the attribute is **`pure`**.

## Complex Cases

If the other enclosed attributes are the same type (_i.e._, a synthetic
attribute encloses another synthetic attribute or an inherited attrbute encloses
another inherited attribute), there are no real issues. This is because the so
called "domain of dependence" is the same in both cases, _i.e.,_ the same nodes
impact each attribute.

But things get more complicated if the two attributes are of different types.
This is because they will have different domains of dependences (as explained
previously). Let's go through an example. Consider the previous tree. Imagine we
used an inherited attribute, `fqn`, to assign each node a unique, fully
qualified name. The `fqn` function is simple, for each node it concatenates the
value of `fqn` defined for the parent with the node's own name. The resulting
attribute values (arranged in the same tree) might look something like this:

[![](https://mermaid.ink/svg/eyJjb2RlIjoiZ3JhcGggVERcbiAgICBBW0FdIC0tPiBCXG4gICAgQSAtLT4gQyBcbiAgICBCW0EuQl0gLS0-IERbQS5CLkRdIFxuICAgIEIgLS0-IEVbQS5CLkVdXG4gICAgQ1tBLkNdIC0tPiBGW0EuQy5GXVxuICAgIEMgLS0-IEdbQS5DLkddIFxuXG4gICIsIm1lcm1haWQiOnsidGhlbWUiOiJkYXJrIn0sInVwZGF0ZUVkaXRvciI6ZmFsc2UsImF1dG9TeW5jIjp0cnVlLCJ1cGRhdGVEaWFncmFtIjpmYWxzZX0)](https://mermaid.live/edit/#eyJjb2RlIjoiZ3JhcGggVERcbiAgICBBW0FdIC0tPiBCXG4gICAgQSAtLT4gQyBcbiAgICBCW0EuQl0gLS0-IERbQS5CLkRdIFxuICAgIEIgLS0-IEVbQS5CLkVdXG4gICAgQ1tBLkNdIC0tPiBGW0EuQy5GXVxuICAgIEMgLS0-IEdbQS5DLkddIFxuXG4gICIsIm1lcm1haWQiOiJ7XG4gIFwidGhlbWVcIjogXCJkYXJrXCJcbn0iLCJ1cGRhdGVFZGl0b3IiOmZhbHNlLCJhdXRvU3luYyI6dHJ1ZSwidXBkYXRlRGlhZ3JhbSI6ZmFsc2V9)

As mentioned before, since this is an inherited attribute, changing the value
associated with node `F` will not impact the values at any other nodes besides
`F`. So if `F` changed its name to `P`, then `fqn` would return `A.C.P` for
that node, but the `fqn` values associated with other nodes would be uneffected
(and, therefore, it is only the cached value associated with that one leaf node
that would need to be invalidated).

But now depend we had another attribute that was a _synthetic_ attribute but
which referenced this `fqn` function. For example, a function that lists all
descendents _by their fully qualified name_. Then attribute values overlaid on
the previous tree would look something like this:

[![](https://mermaid.ink/svg/eyJjb2RlIjoiZ3JhcGggVERcbiAgICBBW0EsIEEuQiwgQS5DLCBBLkIuRCwgQS5CLkUsIEEuQy5GLCBBLkMuR10gLS0-IEJcbiAgICBBIC0tPiBDIFxuICAgIEJbQS5CLCBBLkIuRCwgQS5CLkVdIC0tPiBEW0EuQi5EXSBcbiAgICBCIC0tPiBFW0EuQi5FXVxuICAgIENbQS5DLCBBLkMuRiwgQS5DLkddIC0tPiBGW0EuQy5GXVxuICAgIEMgLS0-IEdbQS5DLkddIFxuXG4gICIsIm1lcm1haWQiOnsidGhlbWUiOiJkYXJrIn0sInVwZGF0ZUVkaXRvciI6ZmFsc2UsImF1dG9TeW5jIjp0cnVlLCJ1cGRhdGVEaWFncmFtIjpmYWxzZX0)](https://mermaid.live/edit/#eyJjb2RlIjoiZ3JhcGggVERcbiAgICBBW0EsIEEuQiwgQS5DLCBBLkIuRCwgQS5CLkUsIEEuQy5GLCBBLkMuR10gLS0-IEJcbiAgICBBIC0tPiBDIFxuICAgIEJbQS5CLCBBLkIuRCwgQS5CLkVdIC0tPiBEW0EuQi5EXSBcbiAgICBCIC0tPiBFW0EuQi5FXVxuICAgIENbQS5DLCBBLkMuRiwgQS5DLkddIC0tPiBGW0EuQy5GXVxuICAgIEMgLS0-IEdbQS5DLkddIFxuXG4gICIsIm1lcm1haWQiOiJ7XG4gIFwidGhlbWVcIjogXCJkYXJrXCJcbn0iLCJ1cGRhdGVFZGl0b3IiOmZhbHNlLCJhdXRvU3luYyI6dHJ1ZSwidXBkYXRlRGlhZ3JhbSI6ZmFsc2V9)

Imagine if we changed the name of the `C` node here. This is a synthetic
attribute and _if it were pure_, it could only impact that value of the
attribute on its ancestors. But this isn't pure. As a result, changing the
name of the `C` node impacts both descendents and ancestors. More importantly,
it invalidates cached attribute values of both ancestors and descendents.

The `Arbor` class takes this into account when managing the caches of memoized
values. It is worth noting that it matters how these attributes are composed.
There are two possible cases:

1. A synthetic attribute that depends on an inherited attribute. This is the
   case we discussed above where the fully qualified names of all descendent
   nodes are collected. As we can see in that case, a change to a leaf node
   only impacts ancestors. But as we move closer to the root of the tree, the
   impact (the domain of influence) of changing a node name widens until,
   finally, a change in the root node leads to a change in the value of the
   attribute at all nodes.
2. An inherited attribute that depends on a synthetic attribute is worse. To
   understand this case, consider a synthetic attribute that determines, among
   its own name and the attribute values of its children, which comes last in
   the alphabet. In our original tree, this attribute (again, overlaid over the
   tree) would look like this:

[![](https://mermaid.ink/svg/eyJjb2RlIjoiZ3JhcGggVERcbiAgICBBW0ddIC0tPiBCXG4gICAgQVtHXSAtLT4gQyBcbiAgICBCW0VdIC0tPiBEIFxuICAgIEJbRV0gLS0-IEVcbiAgICBDW0ddIC0tPiBGXG4gICAgQ1tHXSAtLT4gR1xuXG4gICIsIm1lcm1haWQiOnsidGhlbWUiOiJkYXJrIn0sInVwZGF0ZUVkaXRvciI6ZmFsc2UsImF1dG9TeW5jIjp0cnVlLCJ1cGRhdGVEaWFncmFtIjpmYWxzZX0)](https://mermaid.live/edit/#eyJjb2RlIjoiZ3JhcGggVERcbiAgICBBW0ddIC0tPiBCXG4gICAgQVtHXSAtLT4gQyBcbiAgICBCW0VdIC0tPiBEIFxuICAgIEJbRV0gLS0-IEVcbiAgICBDW0ddIC0tPiBGXG4gICAgQ1tHXSAtLT4gR1xuXG4gICIsIm1lcm1haWQiOiJ7XG4gIFwidGhlbWVcIjogXCJkYXJrXCJcbn0iLCJ1cGRhdGVFZGl0b3IiOmZhbHNlLCJhdXRvU3luYyI6dHJ1ZSwidXBkYXRlRGlhZ3JhbSI6ZmFsc2V9)

...but now imagine an inherited attribute that returns either its parents value
for this synthetic attribute or its own name, which ever comes later in the
alphabet. The resulting tree would then look like this:

[![](https://mermaid.ink/svg/eyJjb2RlIjoiZ3JhcGggVERcbiAgICBBW0ddIC0tPiBCXG4gICAgQSAtLT4gQyBcbiAgICBCW0ddIC0tPiBEW0ddXG4gICAgQltHXSAtLT4gRVtHXVxuICAgIENbR10gLS0-IEZbR11cbiAgICBDW0ddIC0tPiBHXG5cbiAgIiwibWVybWFpZCI6eyJ0aGVtZSI6ImRhcmsifSwidXBkYXRlRWRpdG9yIjpmYWxzZSwiYXV0b1N5bmMiOnRydWUsInVwZGF0ZURpYWdyYW0iOmZhbHNlfQ)](https://mermaid.live/edit/#eyJjb2RlIjoiZ3JhcGggVERcbiAgICBBW0ddIC0tPiBCXG4gICAgQSAtLT4gQyBcbiAgICBCW0ddIC0tPiBEW0ddXG4gICAgQltHXSAtLT4gRVtHXVxuICAgIENbR10gLS0-IEZbR11cbiAgICBDW0ddIC0tPiBHXG5cbiAgIiwibWVybWFpZCI6IntcbiAgXCJ0aGVtZVwiOiBcImRhcmtcIlxufSIsInVwZGF0ZUVkaXRvciI6ZmFsc2UsImF1dG9TeW5jIjp0cnVlLCJ1cGRhdGVEaWFncmFtIjpmYWxzZX0)

What makes this so bad is that a change to one (leaf) node will impact that
value of this attribute at every node.

## Really Complex Cases

What we've described so far are worst case scenarios. What this means in
practice is that with this approach we assume the widest possible domain of
dependence and we may, in practice, invalidate cache entries that are not, in
fact, stale. We can see this in the case of our last example. While changing
the value of the `G` node will change the attribute value of every node in that
example (worst case), changing the value of the `C` node will have no impact at
all. But because we don't include the facility to reason about precisely what
the impact will be, we assume the worst possible case (_i.e.,_ all nodes are
potentially impacted).

Hopefully, the cost to recalculate such invalidated values is negligible. But it
is certainly possible to imagine use cases where a finer grained way of
determining the domain of dependence would be useful to avoid these
recalculations. For this case, there is no sense in reinventing the wheel. The
`mobx` package already does an excellent job of solving this problem and
`arborglyph` supports `mobx` directly with a special "reifier" that leverages
`mobx`'s `IComputedValue` objects behind the scenes to perform fine-grained
memoization.
