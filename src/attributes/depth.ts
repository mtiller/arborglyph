import { inherited, InheritedAttributeDefinition } from "../kinds/definitions";

/**
 * Returns a function that computes the depth of a given node.
 */
// export function evalDepth<T>(): InheritedAttributeDefinition<T, number> {
//   return inherited<T, number>((node) =>
//     node.parent.caseOf({
//       Nothing: () => 0,
//       Just: (p) => p.attr + 1,
//     })
//   );
// }

export function evalDepth<T>() {
  return inherited<T, number>("depth", (node) =>
    node.parent.caseOf({
      Nothing: () => 0,
      Just: (p) => p.attr + 1,
    })
  );
}
