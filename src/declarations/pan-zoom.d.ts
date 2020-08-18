declare module "pan-zoom" {
  export default function panzoom(
    el: Element,
    handler: (evt: PanZoomEvent) => void
  ): () => void;
  export interface PanZoomEvent {
    dx: number;
    dy: number;
    dz: number;
    x: number;
    y: number;
    type: "mouse" | "touch" | "keyboard";
    target: Element;
    srcElement: Element;
    x0: number;
    y0: number;
  }
}
