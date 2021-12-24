import { childrenOfNode, ListChildren } from "../arbor";
import { NoSuchChild } from "../errors";
import { Attribute } from "../kinds/attributes";
import { SyntheticAttributeDefinition } from "../kinds/definitions";
import {
  ChildInformation,
  CommonSyntheticOptions,
  SyntheticArg,
  SyntheticAttributeEvaluator,
} from "../kinds/synthetic";
import { CacheStorage } from "../kinds/cache";

/**
 * This is the function that takes a description of a synthetic
 * attribute and returns an actual implementation capable of computing
 * the synthetic attribute for any node in the tree.
 *
 * @param tree Tree we are associating this synthetic attribute with
 * @param evaluator The function that evaluates the synthetic attribute
 * @param opts Various options we have when reifying
 * @returns
 */
export function reifySyntheticAttribute<T extends object, R>(
  root: T,
  list: ListChildren<T>,
  d: SyntheticAttributeDefinition<T, R>,
  opts: CommonSyntheticOptions
): Attribute<T, R> {
  /** Check what level of memoization is requested */
  const memo = opts.memoize ?? false;

  const evaluator: SyntheticAttributeEvaluator<T, R> = memo
    ? wrapWithMap(d, new WeakMap(), d.f)
    : d.f;

  /** Build a function that can compute our attribute */
  return baseSyntheticAttributeCalculation(d, root, list, evaluator);
}

function baseSyntheticAttributeCalculation<T, R>(
  d: SyntheticAttributeDefinition<T, R>,
  root: T,
  list: ListChildren<T>,
  f: SyntheticAttributeEvaluator<T, R>
): Attribute<T, R> {
  const ret = (x: T): R => {
    const childNodes = childrenOfNode<T>(list, x);
    const children = childNodes.map((c): ChildInformation<T, R> => {
      return {
        node: c,
        get attr() {
          const result = ret(c);
          return result;
        },
      };
    });
    const args: SyntheticArg<T, R> = {
      node: x,
      children: children,
      attr: (n: T) => {
        const child = children.find((c) => c.node === n);
        if (child === undefined) throw new NoSuchChild(x, n, root);
        return child.attr;
      },
      createMap: <K, V>() => new Map<K, V>(),
    };
    const result = f(args);
    return result;
  };
  return ret;
}

interface EvaluationRecord<T, R> {
  result: R;
  children: T[];
}

function wrapWithMap<T extends object, R>(
  def: SyntheticAttributeDefinition<T, R>,
  childStorage: CacheStorage<T, EvaluationRecord<T, R>>,
  evaluator: SyntheticAttributeEvaluator<T, R>
): SyntheticAttributeEvaluator<T, R> {
  return (args: SyntheticArg<T, R>) => {
    const children = args.children.map((c) => c.node);
    if (childStorage.has(args.node)) {
      const entry = childStorage.get(args.node);
      if (entry === undefined)
        throw new Error(
          "Expected cached entry, found none...this should not happen"
        );
      const cachedChildren = entry.children;
      const cachedResult = entry.result;
      if (
        children.length === cachedChildren.length &&
        children.every((c, i) => c === cachedChildren[i])
      )
        return cachedResult;
    }
    const result = evaluator(args);
    childStorage.set(args.node, { result, children });
    return result;
  };
}