import { PropType } from "vue";

let idCounter = 0;
export function nextId(): number {
  return idCounter++;
}

export function req<T>(ty: T): { type: T; required: true } {
  return { type: ty, required: true };
}

export function reqobj<T>(): { type: PropType<T>; required: true } {
  return { type: Object as PropType<T>, required: true };
}

export function isDefined<T>(t: T | null | undefined): t is T {
  return t != null;
}
