import {
  inherited,
  InheritedAttributeDefinition,
  InheritedOptions,
} from "../kinds/definitions";

export function evalPath<T>(
  opts?: Partial<InheritedOptions>
): InheritedAttributeDefinition<T, string> {
  return inherited(
    "path",
    ({ node, parent }) => {
      return parent.caseOf({
        Nothing: () => "root",
        Just: (p) => {
          if (node === p.node) throw new Error("Node was its own parent?!?");
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
    },
    opts
  );
}
