/**
 * The takeover (renderer.md §7). Foundry draws a scene with one PIXI canvas. Where a scene carries a stage description,
 * this scene manager hides that canvas and idles it, puts ours in its place, and gives it back when the scene goes.
 *
 * It uses only the doorway Foundry documents for the purpose: `CONFIG.Canvas.managedScenes` (config.mjs) and the
 * `SceneManager` lifecycle (canvas/scene-manager.mjs). Nothing of Foundry's is patched.
 */

import { NS, isStageScene } from "./scene-data.mjs";
import { StageHost } from "./host.mjs";

/** The host of the stage on screen now, if any. Kept so keybindings and the api can reach it. */
export const current = { host: null };

/**
 * Make Foundry ask us who manages a scene. A Proxy answers from the scene's own flag at the moment Foundry asks, so
 * there is nothing to keep in step when a scene is flagged, edited or deleted. Anyone else's manager for a scene wins.
 */
export function installManager(skins, { makeHost = (options) => new StageHost(options), services = {} } = {}) {
  const Base = foundry.canvas.SceneManager;

  class StageSceneManager extends Base {
    #host = null;
    #hid = null;

    async _onDraw() {
      const board = canvas.app.view;
      this.#host = makeHost({ scene: this.scene, skins, anchor: board, services, onFatal: () => this.#retreat() });
      let ok = false;
      try {
        // Foundry has just made its canvas visible; we hide it and stop it drawing before we start.
        this.#hid = { display: board.style.display };
        board.style.display = "none";
        canvas.app.stop();
        ok = await this.#host.start();
      } catch (err) {
        console.error(`${NS} | could not take over "${this.scene.name}"`, err);
        ui.notifications?.error(game.i18n.format("STAGECRAFT.Notify.Failed", { scene: this.scene.name }));
      }
      if (ok) { current.host = this.#host; return; }
      // it could not be drawn: take down whatever was half built, then give Foundry's canvas back
      try { await this.#host?.stop(); } catch (err) { console.error(`${NS} | the stage did not stop cleanly`, err); }
      this.#host = null;
      this.#giveBack();
    }

    async _onTearDown() {
      if (current.host === this.#host) current.host = null;
      await this.#host?.stop();
      this.#host = null;
      this.#giveBack();
    }

    /** The stage cannot draw: stop it, hand Foundry's canvas back and say so. Safe to call twice. */
    async #retreat() {
      if (!this.#host) return;
      const host = this.#host;
      this.#host = null;
      if (current.host === host) current.host = null;
      ui.notifications?.error(game.i18n.format("STAGECRAFT.Notify.Failed", { scene: this.scene.name }));
      try { await host.stop(); } catch (err) { console.error(`${NS} | the stage did not stop cleanly`, err); }
      this.#giveBack();
    }

    /** Put Foundry's canvas back as it was. Safe to call when nothing was taken. */
    #giveBack() {
      if (!this.#hid) return;
      canvas.app.view.style.display = this.#hid.display || "block";
      canvas.app.start();
      this.#hid = null;
    }
  }

  const registry = CONFIG.Canvas.managedScenes;
  CONFIG.Canvas.managedScenes = new Proxy(registry, {
    get(target, prop, receiver) {
      if (typeof prop !== "string") return Reflect.get(target, prop, receiver);
      if (Object.hasOwn(target, prop)) return target[prop];
      const scene = game.scenes?.get(prop);
      return scene && isStageScene(scene) ? StageSceneManager : undefined;
    }
  });
  return StageSceneManager;
}
