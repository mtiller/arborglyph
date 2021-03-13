import { Just, Maybe, Nothing } from "purify-ts";

/**
 * An extension of the built-in Map type in Javascript with a few additional
 * useful methods.
 */
export class PureMap<K, V> extends Map<K, V> {
  constructor(entries?: readonly (readonly [K, V])[] | null) {
    super(entries);
  }
  /**
   * Implements `get` but with a `Maybe` return value.  I really dislike the use
   * of `undefined` as a "nothing there" response from `Map` because **you can
   * store `undefined` in a `Map`** and there is no way (externally) to
   * distinguish between the case of "that key isn't associated with a value"
   * and "that key is associated with a value that evaluates to `undefined`"
   * @param k
   * @returns
   */
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

  /**
   * This method assumes that the key being used does not have a value
   * associated with it yet.  If the key does have a value associated with it,
   * this method throws.
   * @param k
   * @param v
   * @returns
   */
  setFirst(k: K, v: V, msg?: string) {
    if (this.has(k))
      throw new Error(msg ?? `Map already contains an entry for this key`);
    return this.set(k, v);
  }

  /**
   * This invokes the `set` method but then returns the value that being
   * assigned to the key rather than returning the map.
   * @param k
   * @param v
   * @returns
   */
  setRet(k: K, v: V): V {
    this.set(k, v);
    return v;
  }

  /**
   * This method assumes that the key has a value associated with it.  If no
   * value is associated with the key, this throws.
   * @param k
   * @param e An alternative `Error` to be thrown (potentially with a more descriptive error message)
   * @returns
   */
  mustGet(k: K, e?: Error): V {
    if (!this.has(k)) {
      throw e ?? new Error(`No entry found for given key`);
    }
    const val = this.get(k);
    return val as V;
  }
}
