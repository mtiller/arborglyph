import { Attribute } from "./attributes";
import { NodeSuchChild as NoSuchChild } from "../errors";
import {
  childrenOfNode,
  EvaluationNotifications,
  ListChildren,
} from "../arbor";
import LRUCache from "lru-cache";
import { SyntheticAttributeDefinition } from "./definitions";

export type SyntheticEvaluationWrapper<T> = <S extends T, R>(
  e: SyntheticAttributeEvaluator<S, R>
) => SyntheticAttributeEvaluator<S, R>;

export interface SyntheticOptions {
  memoize: boolean;
  /** Pre-evaluate all nodes */
}

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
  d: SyntheticAttributeDefinition<T, R>,
  root: T,
  list: ListChildren<T>,
  evaluator: SyntheticAttributeEvaluator<T, R>,
  opts: SyntheticOptions
): Attribute<T, R> {
  /** Check what level of memoization is requested */
  const memo = opts.memoize ?? false;

  const e: SyntheticAttributeEvaluator<T, R> = memo
    ? wrapWithMap(d, new WeakMap(), evaluator)
    : evaluator;

  /** Build a function that can compute our attribute */
  return baseSyntheticAttributeCalculation(d, root, list, e);
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

export interface ChildInformation<T, R> {
  node: T;
  attr: R;
}

/**
 * Arguments available when computing a synthetic attribute.
 *
 * Sometimes we will want to request the attribute value for a specific
 * child.  In that case, we can use `attr`.  In other cases, we might wish
 * to iterate over the children.  In that case, we use `children`.
 */
export interface SyntheticArg<T, R> {
  // siblings: Array<ChildInformation<T, R>>;
  node: T;
  attr: (child: T) => R;
  children: Array<ChildInformation<T, R>>;
  createMap: <K, V>() => Map<K, V>;
}

export type SyntheticAttributeEvaluator<T, R> = (x: SyntheticArg<T, R>) => R;

interface EvaluationRecord<T, R> {
  result: R;
  children: T[];
}

export interface CacheStorage<T, R> {
  has(key: T): boolean;
  get(key: T): R | undefined;
  set(key: T, value: R): void;
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
