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
    remapAttr: <R>(
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
  };
}
