import { AttributeDefinition } from "./kinds/definitions";

export interface ArborPlugin<T> {
  remapRoot?(root: T): T;
  remapAttr?<R>(attr: AttributeDefinition<T, R>): AttributeDefinition<T, R>;
}
