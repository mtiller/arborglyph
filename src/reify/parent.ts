import { ListChildren } from "../children";
import { Attribute } from "../kinds/attributes";
import { Maybe } from "purify-ts/Maybe";
import { MutationMonitor } from "../events";
import { walkTree } from "../utils";

/**
 * A special function used to reify the parent.  This follows a special procedure
 * since it doesn't have a priori parent information so it must be evaluated eagerly
 * and for the entire tree.
 */
export function reifyParent<T extends object>(
  root: T,
  list: ListChildren<T>,
  monitor: MutationMonitor<T>
): Attribute<T, Maybe<T>> {
  let currentRoot = root;
  const parentCache = new WeakMap<T, Maybe<T>>();

  const walk = () => {
    const seen = new Set<T>();
    walkTree(currentRoot, list, (n: T, parent: Maybe<T>) => {
      if (seen.has(n)) {
        throw new Error(
          "Same node exists multiple times in a single tree, Arbor doesn't allow this (ambiguos parent node)"
        );
      }
      parentCache.set(n, parent);
      seen.add(n);
    });
  };

  /** Perform an initial walk of the tree. */
  walk();

  /** Re-walk if the tree is rerooted */
  monitor.on("reroot", (r) => {
    currentRoot = r;
  });

  /** If any inherited attributes get invalidated, we should probably rewalk the whole tree. */
  monitor.on("invalidate", (_, inherited) => {
    inherited.forEach((x) => parentCache.delete(x));
  });

  monitor.on("finalize", () => {
    walk();
  });

  return (x: T): Maybe<T> => {
    const p = parentCache.get(x);
    if (p) return p;
    throw new Error("No parent entry found for node");
  };
}
