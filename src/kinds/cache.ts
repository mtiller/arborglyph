export interface CacheStorage<T, R> {
  has(key: T): boolean;
  get(key: T): R | undefined;
  set(key: T, value: R): void;
  delete(key: T): void;
}

export type CacheProvider = () => CacheStorage<any, any>;
