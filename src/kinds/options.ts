import { CacheProvider } from "./cache";

/** Options when reifying an inherited attribute */
export interface ReificationOptions {
  memoize: boolean;
  /** Pre-evaluate all nodes */
  eager: boolean;
  cacheProvider: CacheProvider;
}
