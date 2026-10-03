/**
 * The skins a table has registered. The module ships one (paper); a table adds its own through the api, and picks one
 * per scene or for everything. Plain data and functions, so a skin can live in another module.
 */

import { paper } from "./paper.mjs";

const required = ["id", "size", "face", "back"];

export class SkinRegistry {
  constructor() {
    this.skins = new Map();
    this.register(paper);
    this.current = "paper";
  }

  register(skin) {
    for (const k of required) if (!skin?.[k]) throw new Error(`a skin needs "${k}"`);
    if (typeof skin.face !== "function" || typeof skin.back !== "function") throw new Error("a skin's face and back are functions");
    if (!(skin.size?.w > 0 && skin.size?.h > 0)) throw new Error("a skin's size is { w, h } in pixels");
    this.skins.set(skin.id, { thickness: 9, fonts: [], stick: { length: 134, collar: 0xb9b3a4, wood: 0xc79a62 }, materials: {}, ...skin });
    return skin.id;
  }

  /** The skin to use: the one named, else the table's current choice, else paper. */
  get(id) {
    return this.skins.get(id) ?? this.skins.get(this.current) ?? this.skins.get("paper");
  }

  use(id) {
    if (!this.skins.has(id)) throw new Error(`no skin "${id}" is registered`);
    this.current = id;
  }

  list() {
    return [...this.skins.keys()];
  }
}
