export interface CacheStorage<T, R> {
  has(key: T): boolean;
  get(key: T): R | undefined;
  set(key: T, value: R): void;
  delete(key: T): void;
  clear(): void;
}

export type CacheProvider = () => CacheStorage<any, any>;

export class ClearableWeakMap<K extends object, V>
  implements CacheStorage<K, V>
{
  protected wrappedMap: WeakMap<K, V>;
  constructor() {
    this.wrappedMap = new WeakMap();
  }
  clear() {
    this.wrappedMap = new WeakMap();
  }
  delete(k: K) {
    return this.wrappedMap.delete(k);
  }
  get(k: K) {
    return this.wrappedMap.get(k);
  }
  has(k: K) {
    return this.wrappedMap.has(k);
  }
  set(k: K, v: V) {
    this.wrappedMap.set(k, v);
    return this;
  }
}
