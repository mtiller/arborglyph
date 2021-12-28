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
      cacheProvider: () => {
        const lru = new LRUCache<T, SyntheticEvaluationRecord<any, any>>(opts);
        return {
          get: (k) => lru.get(k),
          set: (k, v) => lru.set(k, v),
          has: (k) => lru.has(k),
          delete: (k) => lru.del(k),
        };
      },
    }),
  };
}
