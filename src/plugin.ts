import { AttributeDefinition } from "./kinds/definitions";
import { Attribute } from "./kinds/attributes";

export interface ArborPlugin<T> {
  remapRoot?(root: T): T;
  remapDef?<R>(attr: AttributeDefinition<T, R>): AttributeDefinition<T, R>;
  remapAttr?<R>(attr: Attribute<T, R>): Attribute<T, R>;
}
