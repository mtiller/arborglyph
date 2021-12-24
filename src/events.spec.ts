import { createEmitter } from "./events";
import { Attribute } from "./kinds/attributes";

describe("Test event emitter", () => {
  it("should create an event emitter", () => {
    const te = createEmitter<any>();
    let count = 0;
    const foo = te.on("evaluation", (attr) => {
      count++;
    });
    te.on("invocation", () => {});
    te.emit("evaluation", null as any);
    te.emit("evaluation", null as any);
    te.emit("invocation", null as any);
    expect(count).toEqual(2);
    // te.emit("what", null as any); // Compile time error, yay!
    expect(te.listenerCount("evaluation")).toEqual(1);
    foo.removeAllListeners("evaluation");
    te.emit("evaluation", null as any);
    expect(count).toEqual(2);

    expect(te.listenerCount("evaluation")).toEqual(0);
  });
});
