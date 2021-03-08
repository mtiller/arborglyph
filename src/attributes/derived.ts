import { TreeMap } from "../maps/treemap";
import { Attribute, AttributeTypes, DefinedAttributes } from "./attributes";
import { memoizeEvaluator } from "./memoize";

/**
 * Arguments available when computing a derived attribute.
 */
export interface DerivedArgs<T, A extends AttributeTypes, R> {
  node: T;
  attrs: DefinedAttributes<A>;
  nid: string;
}

/**
 * Type signature of the function that computes derived attributes.
 */
export type DerivedFunction<T, A extends AttributeTypes, R> = (
  args: DerivedArgs<T, A, R>
) => R;

/**
 * Options associated with computed derived attributes.
 */
export interface DerivedOptions {
  memoize?: boolean;
}

/**
 * This function creates an `Attribute` that returns the value of the derived
 * attribute.  It will invoke the provided `evaluate` function to do this, but
 * it will try to minimize the invocation of that function.
 *
 * This attribute is a degenerative case of both synthetic and inherited
 * attributes that don't depend on any other nodes except the target node
 * itself.  Using a derived attribute ensures that there are no inadvertent
 * evaluations of "neighboring" nodes.
 * @param evaluate
 * @param tree
 * @param attrs
 * @param memoize
 * @returns
 */
export function derivedAttribute<T, A, R>(
  evaluate: DerivedFunction<T, A, R>,
  tree: TreeMap<T>,
  attrs: DefinedAttributes<A>,
  memoize: boolean
): Attribute<R> {
  const ret = memoizeEvaluator(
    (nid: string): R => {
      const node = tree.node(nid);
      return evaluate({ node, attrs, nid });
    }
  );
  return ret;
}
