import { AttributeDefinition, AttributeEvaluator } from "./kinds/definitions";
import { Attribute } from "./kinds/attributes";

export interface ArborPlugin<T> {
  remapRoot?(root: T): T;
  remapDef?<R>(attr: AttributeDefinition<T, R>): AttributeDefinition<T, R>;
  remapAttr?<R>(attr: Attribute<T, R>): Attribute<T, R>;
  recordInvocation?(d: AttributeDefinition<T, any>, n: T): void;
  recordEvaluation?(e: Attribute<T, any>, n: T): void;
}
