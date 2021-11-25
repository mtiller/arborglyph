import LRUCache from "lru-cache";
import { ScalarFunction } from "../kinds/attributes";
import {
  AttributeDefinition,
  derived,
  inherited,
  synthetic,
} from "../kinds/definitions";
import { InheritedAttributeEvaluator } from "../kinds/inherited";
import { SyntheticArg, SyntheticAttributeEvaluator } from "../kinds/synthetic";
import { assertUnreachable } from "../utils";

export function memoize<T extends object, R>(
  d: AttributeDefinition<T, R>
): AttributeDefinition<T, R> {
  switch (d.type) {
    case "syn": {
      const cache = new WeakMap<T, SyntheticEvaluationRecord<T, R>>();
      return synthetic<T, R>(wrapSyntheticWithMap(cache, d.f));
    }
    case "inh": {
      /** If memoization is requested, first create storage for memoized values. */
      const storage = new WeakMap<T, InheritedEvaluationRecord<T, R>>();
      return inherited<T, R>(wrapInheritedWithMap(storage, d.f));
    }
    case "der": {
      const storage = new WeakMap<T, R>();
      return derived(wrapDerivedWithMap(storage, d.f));
    }
    case "trans": {
      throw new Error("Unimplemented");
    }
  }
  return assertUnreachable(d);
}

export function lru<T extends object, R>(
  d: AttributeDefinition<T, R>,
  opts: LRUOptions
) {
  switch (d.type) {
    case "syn": {
      const cache = new LRUCache<T, SyntheticEvaluationRecord<T, R>>(opts);
      return synthetic<T, R>(wrapSyntheticWithMap(cache, d.f));
    }
    case "inh": {
      /** If memoization is requested, first create storage for memoized values. */
      const storage = new LRUCache<T, InheritedEvaluationRecord<T, R>>(opts);
      return inherited<T, R>(wrapInheritedWithMap(storage, d.f));
    }
    case "der": {
      const storage = new LRUCache<T, R>(opts);
      return derived(wrapDerivedWithMap(storage, d.f));
    }
    case "trans": {
      throw new Error("Unimplemented");
    }
  }
  return assertUnreachable(d);
}

interface InheritedEvaluationRecord<T, R> {
  result: R;
  parent: T | null;
}

interface SyntheticEvaluationRecord<T, R> {
  result: R;
  children: T[];
}

export interface CacheStorage<T, R> {
  has(key: T): boolean;
  get(key: T): R | undefined;
  set(key: T, value: R): void;
}

function wrapDerivedWithMap<T, R>(
  storage: CacheStorage<T, R>,
  evaluator: ScalarFunction<T, R>
): ScalarFunction<T, R> {
  return (n) => {
    if (storage.has(n)) return storage.get(n) as R;
    const result = evaluator(n);
    storage.set(n, result);
    return result;
  };
}

function wrapInheritedWithMap<T, R>(
  storage: CacheStorage<T, InheritedEvaluationRecord<T, R>>,
  evaluator: InheritedAttributeEvaluator<T, R>
): InheritedAttributeEvaluator<T, R> {
  /**
   * Now create a special memoized wrapper that checks for memoized values and
   * caches any attributes actually evaluated.
   **/
  return (args) => {
    if (storage.has(args.node)) {
      const entry = storage.get(args.node);
      if (entry === undefined)
        throw new Error("Expected entry for node, found none");
      if (entry.parent === args.parent.extractNullable()) {
        return entry.result;
      }
    }
    const result = evaluator(args);
    storage.set(args.node, {
      result,
      parent: args.parent.map((x) => x.node).extractNullable(),
    });
    return result;
  };
}
function wrapSyntheticWithMap<T extends object, R>(
  childStorage: CacheStorage<T, SyntheticEvaluationRecord<T, R>>,
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

export interface LRUOptions {
  max?: number;
  maxAge?: number;
  length?: (value: any, key?: any) => number;
}
