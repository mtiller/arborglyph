import LRUCache from "lru-cache";
import { ArborPlugin } from "../plugin";

interface SyntheticEvaluationRecord<T, R> {
  result: R;
  children: T[];
}

export interface LRUOptions {
  max?: number;
  maxAge?: number;
  length?: (value: any, key?: any) => number;
}

export function lruPlugin<T extends object>(opts: LRUOptions): ArborPlugin<T> {
  return {
    reificationOptions: (cur) => ({
      ...cur,
      memoize: true,
      cacheProvider: () =>
        new LRUCache<T, SyntheticEvaluationRecord<any, any>>(opts),
    }),
  };
}
