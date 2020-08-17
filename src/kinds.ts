import { NodeKind, DotKind } from "./graph";
import { h } from "vue";

export const kinds = new Map<number, NodeKind>();
let id = 0;

function add<S = any>(k: NodeKind<S>): number {
  const thisId = id++;
  kinds.set(thisId, k);
  return thisId;
}

add({
  name: "Sum",
  inputs: [
    { id: 0, kind: DotKind.ANY, label: "A" },
    { id: 1, kind: DotKind.ANY, label: "B" },
  ],
  outputs: [
    {
      id: 0,
      label: "result",
      run(ctx) {
        const inputA = ctx.getInput(0);
        const inputB = ctx.getInput(1);
        if (inputA != null && inputB != null) {
          if (inputA.kind == DotKind.NUMBER && inputB.kind == DotKind.NUMBER) {
            return {
              kind: DotKind.NUMBER,
              value: inputA.value + inputB.value,
            };
          }

          // todo: other types

          return null;
        }
        if (inputA != null) {
          return inputA;
        }
        if (inputB != null) {
          return inputB;
        }
        return null;
      },
    },
  ],
  preview(ctx) {
    const out = ctx.getOutput(0)?.value;
    const str = JSON.stringify(out);
    return h("div", [str]);
  },
});

add<number>({
  name: "Number",
  inputs: [],
  outputs: [
    {
      id: 0,
      label: "value",
      run(ctx) {
        const value = ctx.state() || 0;
        return { kind: DotKind.NUMBER, value };
      },
    },
  ],
  preview(ctx) {
    const value = ctx.state() || 0;
    return h("input", {
      type: "text",
      value: +value,
      onInput: (e: InputEvent) =>
        ctx.setState(+(e.target as HTMLInputElement).value),
    });
  },
});
