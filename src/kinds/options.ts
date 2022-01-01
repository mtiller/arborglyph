import { Attribute } from "./attributes";
import { CacheProvider } from "./cache";

/** Options when reifying an inherited attribute */
export interface ReificationOptions {
  memoize: boolean;
  /** Pre-evaluate all nodes */
  eager: boolean;
  // deps: Array<Attribute<any, any>>;
  cacheProvider: CacheProvider;
}
