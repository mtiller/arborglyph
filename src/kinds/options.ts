import { CacheProvider } from "./cache";

/** Options when reifying an inherited attribute */
export interface ReificationOptions {
  memoize: boolean;
  /** Pre-evaluate all nodes */
  eager: boolean;
  // deps: Array<Attribute<any, any>>;
  cacheProvider: CacheProvider;
  /**
   * If an attribute is "pure", it only depends on the same kinds of attributes.  So, for example,
   * a synthetic attribute that also depends on other attributes is still "pure" so long as those other
   * attributes are synthetic.  A synthetic attribute that depends on an inherited attribute or vice
   * versa is not pure.  This is important for cache invalidation.
   *
   * // TODO: Add a debug mode that detects improper configuration of "pure" options but at some performance cost.
   */
  pure: boolean;
}
