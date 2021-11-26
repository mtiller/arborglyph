import { Attribute } from "../kinds/attributes";
import { AttributeDefinition } from "../kinds/definitions";
import { ArborPlugin } from "../plugin";

export function counter<T, R>(
  d: AttributeDefinition<T, R>,
  map?: Map<AttributeDefinition<T, R>, number>
): AttributeDefinition<T, R> & { count: number } {
  let count = 0;
  const w: any = (x: any) => {
    count++;
    map?.set(d, count);
    return d.f(x);
  };
  return {
    ...d,
    f: w,
    get count() {
      return count;
    },
  };
}

export function counterPlugin<T>(counts: Map<any, number>): ArborPlugin<T> {
  return {
    remapRoot: (root: any): any => {
      return root;
    },
    remapDef: <R>(
      attr: AttributeDefinition<any, R>
    ): AttributeDefinition<any, R> => {
      counts.set(attr, 0);
      const w: any = (x: any) => {
        let count = counts.get(attr) ?? 0;
        count++;
        counts.set(attr, count);
        return attr.f(x);
      };
      return {
        ...attr,
        f: w,
      };
    },
    remapAttr: <R>(attr: Attribute<T, R>) => {
      const ret = (x: T) => {
        let count = counts.get(ret) ?? 0;
        count++;
        counts.set(ret, count);
        return attr(x);
      };
      counts.set(attr, 0);
      return ret;
    },
  };
}
