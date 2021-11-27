import { inherited, InheritedAttributeDefinition } from "../kinds/definitions";

export function evalPath<T>(): InheritedAttributeDefinition<T, string> {
  return inherited("path", ({ node, parent }) => {
    return parent.caseOf({
      Nothing: () => "root",
      Just: (p) => {
        for (const [key, value] of Object.entries(p.node)) {
          if (value === node) {
            return `${p.attr}/${key}`;
          }
        }
        throw new Error(
          "Unable to find node in parent (this shouldn't happen)"
        );
      },
    });
  });
}
