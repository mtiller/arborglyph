import { Just, Maybe, Nothing } from "purify-ts";

export class PureMap<K, V> extends Map<K, V> {
  constructor(entries?: readonly (readonly [K, V])[] | null) {
    super(entries);
  }
  getMaybe(k: K): Maybe<V> {
    if (!this.has(k)) return Nothing;
    const val = this.get(k);

    /**
     * This value might be undefined.  But Maps can contain undefined
     * values (which is why a Maybe is so much better than using undefined
     * to indicate that a value wasn't found)
     */
    return Just(val as V);
  }

  setFirst(k: K, v: V) {
    if (this.has(k))
      throw new Error(`Map already contains an entry for this key`);
    return this.set(k, v);
  }
  mustGet(k: K, e?: Error): V {
    if (!this.has(k)) {
      throw e ?? new Error(`No entry found for given key`);
    }
    const val = this.get(k);
    return val as V;
  }
}
