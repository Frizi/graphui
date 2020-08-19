import {
  NodeKind,
  DotKind,
  PreviewCtx,
  IMAGE_SIZE,
  DotValue,
  DotValueImage,
  Vec3,
  Rgba,
} from "./graph";
import { h } from "vue";
import InputAutosize from "./components/InputAutosize.vue";
import ImagePreview from "./components/ImagePreview.vue";

export const kinds = new Map<number, NodeKind>();
let id = 0;

function add<S = any>(k: NodeKind<S>): number {
  const thisId = id++;
  kinds.set(thisId, k);
  return thisId;
}

const MAX_INDEX = IMAGE_SIZE * IMAGE_SIZE * 4;

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
    const state = ctx.state() || 0;
    return h(InputAutosize, {
      type: "text",
      class: "prop-input",
      modelValue: `${state}`,
      "onUpdate:modelValue": (value: string) => {
        ctx.setState(+value);
      },
    });
  },
});

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
          if (
            inputA.kind === DotKind.NUMBER &&
            inputB.kind === DotKind.NUMBER
          ) {
            return {
              kind: DotKind.NUMBER,
              value: inputA.value + inputB.value,
            };
          }

          if (
            inputA.kind === DotKind.VECTOR &&
            inputB.kind === DotKind.VECTOR
          ) {
            const a = inputA.value;
            const b = inputB.value;
            return {
              kind: DotKind.VECTOR,
              value: [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
            };
          }

          if (
            inputA.kind & (DotKind.COLOR | DotKind.VECTOR) &&
            inputB.kind & (DotKind.COLOR | DotKind.VECTOR)
          ) {
            const a = asColor(inputA);
            const b = asColor(inputB);
            return {
              kind: DotKind.COLOR,
              value: [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]],
            };
          }

          let inputImg: DotValueImage;
          let inputOther: DotValue;
          if (inputA.kind === DotKind.IMAGE) {
            [inputImg, inputOther] = [inputA, inputB];
          } else if (inputB.kind === DotKind.IMAGE) {
            [inputImg, inputOther] = [inputB, inputA];
          } else {
            return null;
          }

          if (inputOther.kind == DotKind.IMAGE) {
            const pixels = newImage();
            const a = inputImg.value;
            const b = inputOther.value;
            for (let i = 0; i < MAX_INDEX; i++) {
              pixels[i] = a[i] + b[i];
            }
            return {
              kind: DotKind.IMAGE,
              value: pixels,
            };
          }

          if (inputOther.kind == DotKind.NUMBER) {
            const pixels = newImage();
            const a = inputImg.value;
            const b = inputOther.value;
            for (let i = 0; i < MAX_INDEX; i++) {
              pixels[i] = a[i] + b;
            }
            return {
              kind: DotKind.IMAGE,
              value: pixels,
            };
          }

          if (inputOther.kind & (DotKind.COLOR | DotKind.VECTOR)) {
            const pixels = newImage();
            const a = inputImg.value;
            const b = asColor(inputOther);
            for (let i = 0; i < MAX_INDEX; i += 4) {
              pixels[i] = a[i] + b[0];
              pixels[i + 1] = a[i + 1] + b[1];
              pixels[i + 2] = a[i + 2] + b[2];
              pixels[i + 3] = a[i + 3] + b[3];
            }
            return {
              kind: DotKind.IMAGE,
              value: pixels,
            };
          }

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
  preview: universalPreview(0),
});

add({
  name: "Mix",
  inputs: [
    { id: 0, kind: DotKind.ANY, label: "A" },
    { id: 1, kind: DotKind.ANY, label: "B" },
    { id: 2, kind: DotKind.ANY, label: "factor" },
  ],
  outputs: [
    {
      id: 0,
      label: "result",
      run(ctx) {
        const inputA = ctx.getInput(0);
        const inputB = ctx.getInput(1);
        const factor = asNumber(ctx.getInput(2), 0.5);

        if (inputA != null && inputB != null) {
          if (
            inputA.kind === DotKind.NUMBER &&
            inputB.kind === DotKind.NUMBER
          ) {
            return {
              kind: DotKind.NUMBER,
              value: lerp(factor, inputA.value, inputB.value),
            };
          }

          if (
            inputA.kind === DotKind.VECTOR &&
            inputB.kind === DotKind.VECTOR
          ) {
            const a = inputA.value;
            const b = inputB.value;
            return {
              kind: DotKind.VECTOR,
              value: [
                lerp(factor, a[0], b[0]),
                lerp(factor, a[1], b[1]),
                lerp(factor, a[2], b[2]),
              ],
            };
          }

          if (
            inputA.kind & (DotKind.COLOR | DotKind.VECTOR) &&
            inputB.kind & (DotKind.COLOR | DotKind.VECTOR)
          ) {
            const a = asColor(inputA);
            const b = asColor(inputB);
            return {
              kind: DotKind.COLOR,
              value: [
                lerp(factor, a[0], b[0]),
                lerp(factor, a[1], b[1]),
                lerp(factor, a[2], b[2]),
                lerp(factor, a[3], b[3]),
              ],
            };
          }

          let inputImg: DotValueImage;
          let inputOther: DotValue;
          if (inputA.kind === DotKind.IMAGE) {
            [inputImg, inputOther] = [inputA, inputB];
          } else if (inputB.kind === DotKind.IMAGE) {
            [inputImg, inputOther] = [inputB, inputA];
          } else {
            return null;
          }

          if (inputOther.kind == DotKind.IMAGE) {
            const pixels = newImage();
            const a = inputImg.value;
            const b = inputOther.value;
            for (let i = 0; i < MAX_INDEX; i++) {
              pixels[i] = lerp(factor, a[i], b[i]);
            }
            return {
              kind: DotKind.IMAGE,
              value: pixels,
            };
          }

          if (inputOther.kind == DotKind.NUMBER) {
            const pixels = newImage();
            const a = inputImg.value;
            const b = inputOther.value;
            for (let i = 0; i < MAX_INDEX; i++) {
              pixels[i] = lerp(factor, a[i], b);
            }
            return {
              kind: DotKind.IMAGE,
              value: pixels,
            };
          }

          if (inputOther.kind & (DotKind.COLOR | DotKind.VECTOR)) {
            const pixels = newImage();
            const a = inputImg.value;
            const b = asColor(inputOther);
            for (let i = 0; i < MAX_INDEX; i += 4) {
              pixels[i] = lerp(factor, a[i], b[0]);
              pixels[i + 1] = lerp(factor, a[i + 1], b[1]);
              pixels[i + 2] = lerp(factor, a[i + 2], b[2]);
              pixels[i + 3] = lerp(factor, a[i + 3], b[3]);
            }
            return {
              kind: DotKind.IMAGE,
              value: pixels,
            };
          }

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
  preview: universalPreview(0),
});

add({
  name: "Mul",
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
          if (
            inputA.kind === DotKind.NUMBER &&
            inputB.kind === DotKind.NUMBER
          ) {
            return {
              kind: DotKind.NUMBER,
              value: inputA.value * inputB.value,
            };
          }

          if (
            inputA.kind === DotKind.VECTOR &&
            inputB.kind === DotKind.VECTOR
          ) {
            const a = inputA.value;
            const b = inputB.value;
            return {
              kind: DotKind.VECTOR,
              value: [a[0] * b[0], a[1] * b[1], a[2] * b[2]],
            };
          }

          if (
            inputA.kind & (DotKind.COLOR | DotKind.VECTOR) &&
            inputB.kind & (DotKind.COLOR | DotKind.VECTOR)
          ) {
            const a = asColor(inputA);
            const b = asColor(inputB);
            return {
              kind: DotKind.COLOR,
              value: [a[0] * b[0], a[1] * b[1], a[2] * b[2], a[3] * b[3]],
            };
          }

          let inputImg: DotValueImage;
          let inputOther: DotValue;
          if (inputA.kind === DotKind.IMAGE) {
            [inputImg, inputOther] = [inputA, inputB];
          } else if (inputB.kind === DotKind.IMAGE) {
            [inputImg, inputOther] = [inputB, inputA];
          } else {
            return null;
          }

          if (inputOther.kind == DotKind.IMAGE) {
            const pixels = newImage();
            const a = inputImg.value;
            const b = inputOther.value;
            for (let i = 0; i < MAX_INDEX; i++) {
              pixels[i] = a[i] * b[i];
            }
            return {
              kind: DotKind.IMAGE,
              value: pixels,
            };
          }

          if (inputOther.kind == DotKind.NUMBER) {
            const pixels = newImage();
            const a = inputImg.value;
            const b = inputOther.value;
            for (let i = 0; i < MAX_INDEX; i++) {
              pixels[i] = a[i] * b;
            }
            return {
              kind: DotKind.IMAGE,
              value: pixels,
            };
          }

          if (inputOther.kind & (DotKind.COLOR | DotKind.VECTOR)) {
            const pixels = newImage();
            const a = inputImg.value;
            const b = asColor(inputOther);
            for (let i = 0; i < MAX_INDEX; i += 4) {
              pixels[i] = a[i] * b[0];
              pixels[i + 1] = a[i + 1] * b[1];
              pixels[i + 2] = a[i + 2] * b[2];
              pixels[i + 3] = a[i + 3] * b[3];
            }
            return {
              kind: DotKind.IMAGE,
              value: pixels,
            };
          }

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
  preview: universalPreview(0),
});

add({
  name: "Norm",
  inputs: [{ id: 0, kind: DotKind.ANY, label: "input" }],
  outputs: [
    {
      id: 0,
      label: "result",
      run(ctx) {
        const input = ctx.getInput(0);
        if (input == null) return null;

        if (input.kind == DotKind.IMAGE) {
          const pixels = newImage();
          const a = input.value;
          for (let i = 0; i < MAX_INDEX; i += 4) {
            const x = a[i + 0];
            const y = a[i + 1];
            const z = a[i + 2];
            const n = Math.sqrt(x * x + y * y + z * z);
            pixels[i] = n;
            pixels[i + 1] = n;
            pixels[i + 2] = n;
            pixels[i + 3] = 1;
          }
          return {
            kind: DotKind.IMAGE,
            value: pixels,
          };
        }

        return { kind: DotKind.NUMBER, value: asNumber(input, 0) };
      },
    },
  ],
  preview: universalPreview(0),
});

function newImage(): Float32Array {
  return new Float32Array(IMAGE_SIZE * IMAGE_SIZE * 4);
}

const UV_IMAGE = newImage();
for (let y = 0; y < IMAGE_SIZE; y++)
  for (let x = 0; x < IMAGE_SIZE; x++) {
    const base = 4 * (y * IMAGE_SIZE + x);
    UV_IMAGE[base] = x / IMAGE_SIZE;
    UV_IMAGE[base + 1] = y / IMAGE_SIZE;
    UV_IMAGE[base + 2] = 0;
    UV_IMAGE[base + 3] = 1;
  }

add({
  name: "UV",
  inputs: [],
  outputs: [
    {
      id: 0,
      label: "UV",
      run(_ctx) {
        return { kind: DotKind.IMAGE, value: UV_IMAGE };
      },
    },
  ],
  preview: universalPreview(0),
});

add({
  name: "Combine RGBA",
  inputs: [
    {
      id: 0,
      kind: DotKind.NUMBER,
      label: "R",
    },
    {
      id: 1,
      kind: DotKind.NUMBER,
      label: "G",
    },
    {
      id: 2,
      kind: DotKind.NUMBER,
      label: "B",
    },
    {
      id: 3,
      kind: DotKind.NUMBER,
      label: "A",
    },
  ],
  outputs: [
    {
      id: 0,
      label: "Color",
      run(ctx) {
        return {
          kind: DotKind.COLOR,
          value: [
            asNumber(ctx.getInput(0), 0),
            asNumber(ctx.getInput(1), 0),
            asNumber(ctx.getInput(2), 0),
            asNumber(ctx.getInput(3), 1),
          ],
        };
      },
    },
  ],
  preview: universalPreview(0),
});

add({
  name: "Combine Vec3",
  inputs: [
    {
      id: 0,
      kind: DotKind.NUMBER,
      label: "X",
    },
    {
      id: 1,
      kind: DotKind.NUMBER,
      label: "Y",
    },
    {
      id: 2,
      kind: DotKind.NUMBER,
      label: "Z",
    },
  ],
  outputs: [
    {
      id: 0,
      label: "Vec3",
      run(ctx) {
        return {
          kind: DotKind.VECTOR,
          value: [
            asNumber(ctx.getInput(0), 0),
            asNumber(ctx.getInput(1), 0),
            asNumber(ctx.getInput(2), 0),
          ],
        };
      },
    },
  ],
  preview: universalPreview(0),
});

add<number>({
  name: "Slider",
  inputs: [],
  outputs: [
    {
      id: 0,
      label: "value",
      run(ctx) {
        const value = ctx.state() || 0;
        return { kind: DotKind.NUMBER, value: value / 100 };
      },
    },
  ],
  preview(ctx) {
    const state = ctx.state() || 0;
    return h(InputAutosize, {
      type: "range",
      class: "prop-input",
      modelValue: `${state}`,
      "onUpdate:modelValue": (value: string) => {
        ctx.setState(+value);
      },
    });
  },
});

function universalPreview(output: number) {
  return (ctx: PreviewCtx) => {
    const out = ctx.getOutput(output);
    if (out == null) return null;

    if (out.kind == DotKind.NUMBER) {
      return h("div", [`${out.value}`]);
    } else if (out.kind == DotKind.IMAGE) {
      return h(ImagePreview, {
        pixels: out.value,
      });
    } else if (out.kind == DotKind.COLOR) {
      const [r, g, b, a] = out.value;
      return h("div", {
        style: {
          margin: "auto",
          width: "100px",
          height: "100px",
          border: "1px solid black",
          background: `rgba(${r * 255}, ${g * 255}, ${b * 255}, ${a})`,
        },
      });
    }
    return null;
  };
}

function asNumber(value: DotValue | null, fallback: number): number {
  if (value?.kind == DotKind.NUMBER) return value.value;
  if (value?.kind == DotKind.VECTOR) return vecNorm(value.value);
  if (value?.kind == DotKind.COLOR) return vecNorm(rgbaToVec(value.value));
  return fallback;
}

function asVector(value: DotValue | null): Vec3 {
  if (value?.kind == DotKind.NUMBER)
    return [value.value, value.value, value.value];
  if (value?.kind == DotKind.VECTOR) return value.value;
  if (value?.kind == DotKind.COLOR) return rgbaToVec(value.value);
  return [0, 0, 0];
}

function asColor(value: DotValue): Rgba {
  if (value?.kind == DotKind.NUMBER)
    return [value.value, value.value, value.value, 1];
  if (value?.kind == DotKind.VECTOR) return vecToRgba(value.value);
  if (value?.kind == DotKind.COLOR) return value.value;
  return [0, 0, 0, 1];
}

function vecToRgba(vec: Vec3): Rgba {
  const [x, y, z] = vec;
  return [x, y, z, 1];
}

function rgbaToVec(rgba: Rgba): Vec3 {
  const [r, g, b, _] = rgba;
  return [r, g, b];
}

function vecNorm(vec: Vec3): number {
  const [x, y, z] = vec;
  return Math.sqrt(x * x + y * y + z * z);
}

function lerp(f: number, a: number, b: number): number {
  return (1 - f) * a + f * b;
}
