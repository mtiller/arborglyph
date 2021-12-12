import { AttributeDefinition } from "./kinds/definitions";
import { Attribute } from "./kinds/attributes";
import { EvaluationNotifications } from "./arbor";

export interface ArborPlugin<T> {
  remapRoot?(root: T): T;
  remapDef?<R>(
    attr: AttributeDefinition<T, R>,
    notify: EvaluationNotifications<T>
  ): AttributeDefinition<T, R>;
  remapAttr?<R>(attr: Attribute<T, R>): Attribute<T, R>;
  recordInvocation?<R>(d: AttributeDefinition<T, R>, n: T, result: R): void;
  recordEvaluation?<R>(e: Attribute<T, R>, n: T, reasult: R): void;
}
