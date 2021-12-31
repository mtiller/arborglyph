import { ListChildren } from "../children";
import { NoSuchChild } from "../errors";
import { Attribute } from "../kinds/attributes";
import { SyntheticAttributeDefinition } from "../kinds/definitions";
import {
  ChildInformation,
  SyntheticArg,
  SyntheticAttributeEvaluator,
} from "../kinds/synthetic";
import { CacheStorage } from "../kinds/cache";
import { ArborEmitter, MutationMonitor } from "../events";
import { childrenOfNode } from "../utils";
import { ReificationOptions } from "../kinds/options";

/**
 * This is the function that takes a description of a synthetic
 * attribute and returns an actual implementation capable of computing
 * the synthetic attribute for any node in the tree.
 *
 * Note that the definition's return type (DR) may not necessarily match
 * the attribute return type (R).  This allows the reifier to perform
 * some transformations of the resulting attribute (which is useful, for
 * example, when dealing with observables).
 *
 * @param tree Tree we are associating this synthetic attribute with
 * @param evaluator The function that evaluates the synthetic attribute
 * @param opts Various options we have when reifying
 * @returns
 */
export function reifySyntheticAttribute<T extends object, DR, R>(
  root: T,
  list: ListChildren<T>,
  d2: SyntheticAttributeDefinition<T, DR>,
  df: SyntheticAttributeEvaluator<T, R>,
  emitter: ArborEmitter<T>,
  monitor: MutationMonitor<T>,
  opts: ReificationOptions
): Attribute<T, R> {
  /** Check what level of memoization is requested */
  const memo = opts.memoize ?? false;

  const f: typeof df = (x) => {
    const r = df(x);
    emitter.emit("invocation", d2 as any, x.node, r);
    return r;
  };

  let evaluator: typeof df = f;
  if (memo) {
    const storage = opts.cacheProvider();
    monitor.on("invalidate", (synthetic, _) =>
      synthetic.forEach((x) => storage.delete(x))
    );
    evaluator = wrapWithMap(d2, storage, f);
  }

  /** Build a function that can compute our attribute */
  return baseSyntheticAttributeCalculation(d2, root, list, evaluator, emitter);
}

function baseSyntheticAttributeCalculation<T extends object, DR, R>(
  d: SyntheticAttributeDefinition<T, DR>,
  root: T,
  list: ListChildren<T>,
  f: SyntheticAttributeEvaluator<T, R>,
  emitter: ArborEmitter<T>
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
    emitter.emit("evaluation", d as any, x, result);

    return result;
  };
  return ret;
}

interface EvaluationRecord<T, R> {
  result: R;
  children: T[];
}

function wrapWithMap<T extends object, DR, R>(
  def: SyntheticAttributeDefinition<T, DR>,
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
