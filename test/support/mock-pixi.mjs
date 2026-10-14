// A recording stand-in for the part of PIXI the Location Editor's overlays draw with (Container, Graphics, Text), for tests that run the drawing code for real.
//
// It records what was drawn, not how it looks. Like the real SmoothGraphics it throws on a second destroy (the bug that once wedged the whole canvas:
// test/tier4-location-draw-layer.test.mjs), so a drawing path that destroys something twice fails here.

class Display {
  constructor() {
    this.children = [];
    this.parent = null;
    this.destroyed = false;
    this.visible = true;
    this.alpha = 1;
    this.position = { x: 0, y: 0, set(x, y) { this.x = x; this.y = y; } };
    this.scale = { x: 1, y: 1, set(x, y = x) { this.x = x; this.y = y; } };
    this.anchor = { x: 0, y: 0, set(x, y = x) { this.x = x; this.y = y; } };
    this.eventMode = "auto";
  }
  addChild(child) { child.parent = this; this.children.push(child); return child; }
  removeChild(child) { const i = this.children.indexOf(child); if (i >= 0) this.children.splice(i, 1); child.parent = null; return child; }
  removeChildren() { const out = this.children; this.children = []; for (const c of out) c.parent = null; return out; }
  destroy() {
    if (this.destroyed) throw new TypeError("Cannot read properties of null (reading 'refCount')");
    this.destroyed = true;
  }
}

class Container extends Display {}

class Graphics extends Display {
  constructor() { super(); this.ops = []; }
  clear() { this.ops = []; return this; }
  lineStyle(width, color, alpha = 1) { this.ops.push({ op: "lineStyle", width, color, alpha }); return this; }
  beginFill(color, alpha = 1) { this.ops.push({ op: "beginFill", color, alpha }); return this; }
  endFill() { this.ops.push({ op: "endFill" }); return this; }
  moveTo(x, y) { this.ops.push({ op: "moveTo", x, y }); return this; }
  lineTo(x, y) { this.ops.push({ op: "lineTo", x, y }); return this; }
  drawCircle(x, y, r) { this.ops.push({ op: "circle", x, y, r }); return this; }
  drawPolygon(points) { this.ops.push({ op: "polygon", points }); return this; }
  /** How many of an op were drawn. */
  count(op) { return this.ops.filter((o) => o.op === op).length; }
  /** The strokes as `{ width, color, alpha, segments }`: a lineStyle and the line segments drawn under it. */
  strokes() {
    const out = [];
    let current = null;
    let pen = null;
    for (const o of this.ops) {
      if (o.op === "lineStyle") { current = { width: o.width, color: o.color, alpha: o.alpha, segments: [] }; out.push(current); }
      else if (o.op === "moveTo") pen = { x: o.x, y: o.y };
      else if (o.op === "lineTo" && current && pen) { current.segments.push([pen, { x: o.x, y: o.y }]); pen = { x: o.x, y: o.y }; }
    }
    return out;
  }
  circles() { return this.ops.filter((o) => o.op === "circle"); }
}

class Text extends Display {
  constructor(text, style) { super(); this.text = text; this.style = style; this.resolution = 1; }
}

/** Put the stand-ins on globalThis.PIXI; returns `restore()`. */
export function installPixi() {
  const before = globalThis.PIXI;
  globalThis.PIXI = { Container, Graphics, Text };
  return () => { globalThis.PIXI = before; };
}

export { Container, Graphics, Text };
