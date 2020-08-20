import {
  NodeKind,
  DotKind,
  PreviewCtx,
  IMAGE_SIZE,
  DotValue,
  DotValueImage,
  Vec3,
  Rgba,
  DotValueColor,
  newValNumber,
  newValVector,
  newValColor,
  newValImage,
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

type UnifiedValues =
  | ImageValues
  | MixedValues
  | NumberValues
  | VectorValues
  | ColorValues;
interface MixedValues {
  kind: DotKind.ANY;
  values: (DotValueColor | DotValueImage)[];
}
interface ImageValues {
  kind: DotKind.IMAGE;
  values: Float32Array[];
}
interface NumberValues {
  kind: DotKind.NUMBER;
  values: number[];
}

interface VectorValues {
  kind: DotKind.VECTOR;
  values: Vec3[];
}

interface ColorValues {
  kind: DotKind.COLOR;
  values: Rgba[];
}

function unifyValues(values: DotValue[]): UnifiedValues | null {
  const allTypes = values.reduce((k, v) => k | v.kind, 0);
  if (allTypes === 0) return null;
  if (allTypes === DotKind.IMAGE) {
    return {
      kind: DotKind.IMAGE,
      values: values.map((v) => v.value as Float32Array),
    };
  }
  if (allTypes === DotKind.NUMBER) {
    return {
      kind: DotKind.NUMBER,
      values: values.map((v) => v.value as number),
    };
  }
  if (allTypes === DotKind.VECTOR) {
    return {
      kind: DotKind.VECTOR,
      values: values.map((v) => v.value as Vec3),
    };
  }
  if (allTypes === DotKind.COLOR) {
    return {
      kind: DotKind.COLOR,
      values: values.map((v) => v.value as Rgba),
    };
  }

  if ((allTypes & DotKind.IMAGE) === 0) {
    // mixed uniforms, can be upcasted to uniform type
    const strongestType = values.reduce((k, v) => Math.max(k, v.kind), 0);
    switch (strongestType) {
      case DotKind.COLOR:
        return { kind: DotKind.COLOR, values: values.map(asColor) };
      case DotKind.VECTOR:
        return { kind: DotKind.VECTOR, values: values.map(asVector) };
      // number should be already eliminated, as it is the weakest type
      // and thus can't be the strongest in the mix
      case DotKind.NUMBER:
      case DotKind.IMAGE:
      default:
        throw new Error("unreachable");
    }
  } else {
    // mixed uniforms and images.
    // All uniforms are upcasted to color for simplicity
    return {
      kind: DotKind.ANY,
      values: values.map((v) => {
        if (v.kind === DotKind.IMAGE) {
          return v;
        } else {
          return { kind: DotKind.COLOR, value: asColor(v) };
        }
      }),
    };
  }

  return null;
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

const NUM_ZERO = newValNumber(0);
const NUM_ONE = newValNumber(1);
const NUM_HALF = newValNumber(0.5);

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
        const unified = unifyValues([
          ctx.getInput(0) || NUM_ZERO,
          ctx.getInput(1) || NUM_ZERO,
        ]);
        if (unified == null) return null;
        switch (unified.kind) {
          case DotKind.NUMBER: {
            const [a, b] = unified.values;
            return newValNumber(a + b);
          }
          case DotKind.VECTOR: {
            const [a, b] = unified.values;
            return newValVector(vecAdd(a, b));
          }
          case DotKind.COLOR: {
            const [a, b] = unified.values;
            return newValColor(colAdd(a, b));
          }
          case DotKind.IMAGE: {
            const pixels = newImage();
            const [a, b] = unified.values;
            for (let i = 0; i < MAX_INDEX; i++) {
              pixels[i] = a[i] + b[i];
            }
            return newValImage(pixels);
          }
          case DotKind.ANY: {
            const pixels = newImage();
            const [img, color] = splitImgColor(
              unified.values[0],
              unified.values[1]
            );
            for (let i = 0; i < MAX_INDEX; i += 4) {
              pixels[i] = img[i] + color[0];
              pixels[i + 1] = img[i + 1] + color[1];
              pixels[i + 2] = img[i + 2] + color[2];
              pixels[i + 3] = img[i + 3] + color[3];
            }
            return newValImage(pixels);
          }
        }
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
        const unified = unifyValues([
          ctx.getInput(0) || NUM_ZERO,
          ctx.getInput(1) || NUM_ZERO,
          ctx.getInput(2) || NUM_HALF,
        ]);
        if (unified == null) return null;
        switch (unified.kind) {
          case DotKind.NUMBER: {
            const [a, b, f] = unified.values;
            return newValNumber(lerp(f, a, b));
          }
          case DotKind.VECTOR: {
            const [a, b, f] = unified.values;
            return newValVector([
              lerp(f[0], a[0], b[0]),
              lerp(f[1], a[1], b[1]),
              lerp(f[2], a[2], b[2]),
            ]);
          }
          case DotKind.COLOR: {
            const [a, b, f] = unified.values;
            return newValColor([
              lerp(f[0], a[0], b[0]),
              lerp(f[1], a[1], b[1]),
              lerp(f[2], a[2], b[2]),
              lerp(f[3], a[3], b[3]),
            ]);
          }
          case DotKind.IMAGE: {
            const pixels = newImage();
            const [a, b, f] = unified.values;
            for (let i = 0; i < MAX_INDEX; i++) {
              pixels[i] = lerp(f[i], a[i], b[i]);
            }
            return newValImage(pixels);
          }
          case DotKind.ANY: {
            const pixels = newImage();
            const idxImage = (i: number, c: number) => i + c;
            const idxColor = (_i: number, c: number) => c;
            const [av, bv, fv] = unified.values;
            const a = av.value;
            const b = bv.value;
            const f = fv.value;
            const idxA = av.kind === DotKind.IMAGE ? idxImage : idxColor;
            const idxB = bv.kind === DotKind.IMAGE ? idxImage : idxColor;
            const idxF = fv.kind === DotKind.IMAGE ? idxImage : idxColor;
            for (let i = 0; i < MAX_INDEX; i += 4) {
              pixels[i] = lerp(f[idxF(i, 0)], a[idxA(i, 0)], b[idxB(i, 0)]);
              pixels[i + 1] = lerp(f[idxF(i, 1)], a[idxA(i, 1)], b[idxB(i, 1)]);
              pixels[i + 2] = lerp(f[idxF(i, 2)], a[idxA(i, 2)], b[idxB(i, 2)]);
              pixels[i + 3] = lerp(f[idxF(i, 3)], a[idxA(i, 3)], b[idxB(i, 3)]);
            }
            return newValImage(pixels);
          }
        }
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
        const unified = unifyValues([
          ctx.getInput(0) || NUM_ONE,
          ctx.getInput(1) || NUM_ONE,
        ]);
        if (unified == null) return null;
        switch (unified.kind) {
          case DotKind.NUMBER: {
            const [a, b] = unified.values;
            return newValNumber(a * b);
          }
          case DotKind.VECTOR: {
            const [a, b] = unified.values;
            return newValVector(vecMul(a, b));
          }
          case DotKind.COLOR: {
            const [a, b] = unified.values;
            return newValColor(colMul(a, b));
          }
          case DotKind.IMAGE: {
            const pixels = newImage();
            const [a, b] = unified.values;
            for (let i = 0; i < MAX_INDEX; i++) {
              pixels[i] = a[i] * b[i];
            }
            return newValImage(pixels);
          }
          case DotKind.ANY: {
            const pixels = newImage();
            const [img, color] = splitImgColor(
              unified.values[0],
              unified.values[1]
            );
            for (let i = 0; i < MAX_INDEX; i += 4) {
              pixels[i] = img[i] * color[0];
              pixels[i + 1] = img[i + 1] * color[1];
              pixels[i + 2] = img[i + 2] * color[2];
              pixels[i + 3] = img[i + 3] * color[3];
            }
            return newValImage(pixels);
          }
        }
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

add({
  name: "Threshold",
  inputs: [
    { id: 0, kind: DotKind.IMAGE, label: "input" },
    { id: 0, kind: DotKind.ANY, label: "threshold" },
  ],
  outputs: [
    {
      id: 0,
      label: "result",
      run(ctx) {
        const unified = unifyValues([
          ctx.getInput(0) || NUM_ZERO,
          ctx.getInput(1) || NUM_HALF,
        ]);
        if (unified == null) return null;
        switch (unified.kind) {
          case DotKind.NUMBER: {
            const [a, b] = unified.values;
            return newValNumber(a >= b ? 1 : 0);
          }
          case DotKind.VECTOR: {
            const [a, b] = unified.values;
            return newValVector([
              a[0] >= b[0] ? 1 : 0,
              a[1] >= b[1] ? 1 : 0,
              a[2] >= b[2] ? 1 : 0,
            ]);
          }
          case DotKind.COLOR: {
            const [a, b] = unified.values;
            return newValColor([
              a[0] >= b[0] ? 1 : 0,
              a[1] >= b[1] ? 1 : 0,
              a[2] >= b[2] ? 1 : 0,
              a[3] >= b[3] ? 1 : 0,
            ]);
          }
          case DotKind.IMAGE: {
            const pixels = newImage();
            const [a, b] = unified.values;
            for (let i = 0; i < MAX_INDEX; i++) {
              pixels[i] = a[i] >= b[i] ? 1 : 0;
            }
            return newValImage(pixels);
          }
          case DotKind.ANY: {
            const pixels = newImage();
            const [img, color] = splitImgColor(
              unified.values[0],
              unified.values[1]
            );
            for (let i = 0; i < MAX_INDEX; i += 4) {
              pixels[i] = img[i] >= color[0] ? 1 : 0;
              pixels[i + 1] = img[i + 1] >= color[1] ? 1 : 0;
              pixels[i + 2] = img[i + 2] >= color[2] ? 1 : 0;
              pixels[i + 3] = img[i + 3] >= color[3] ? 1 : 0;
            }
            return newValImage(pixels);
          }
        }
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

function vecAdd(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function vecMul(a: Vec3, b: Vec3): Vec3 {
  return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
}

function colAdd(a: Rgba, b: Rgba): Rgba {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
}

function colMul(a: Rgba, b: Rgba): Rgba {
  return [a[0] * b[0], a[1] * b[1], a[2] * b[2], a[3] * b[3]];
}

function splitImgColor(
  a: DotValueColor | DotValueImage,
  b: DotValueColor | DotValueImage
): [Float32Array, Rgba] {
  if (a.kind === DotKind.IMAGE && b.kind === DotKind.COLOR) {
    return [a.value, b.value];
  } else if (a.kind === DotKind.COLOR && b.kind === DotKind.IMAGE) {
    return [b.value, a.value];
  }
  throw new Error(`splitImgColor got wrong kinds ${a.kind}, ${b.kind}`);
}
