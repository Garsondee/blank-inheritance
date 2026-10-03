/**
 * Stagecraft: Puppet Show. The module's entry point. It registers settings and keys, installs the scene manager that
 * lets a stage scene take over Foundry's canvas, keeps the chalk, and publishes the api other modules use.
 *
 * Foundry draws the first scene BEFORE it calls "ready", so everything a stage needs is made at "init"; "ready" only
 * does what has to wait for the world (the GM's chalk journal, the api).
 */

import { SkinRegistry } from "./skins/registry.mjs";
import { registerSettings } from "./foundry/settings.mjs";
import { installManager, current } from "./foundry/manager.mjs";
import { createApi } from "./api.mjs";
import { registerKeys } from "./foundry/keys.mjs";
import { ChalkStore } from "./foundry/chalk-store.mjs";
import { hideChalkJournal } from "./foundry/journal-tidy.mjs";

const skins = new SkinRegistry();
const services = { chalkStore: null };       // shared by every stage this client draws

Hooks.once("init", () => {
  registerSettings();
  registerKeys(() => current.host);
  services.chalkStore = new ChalkStore();
  hideChalkJournal();
  installManager(skins, { services });
  // a table's own skin must be there for the first scene, which Foundry draws before "ready"
  Hooks.callAll("stagecraft.init", { registerSkin: (skin) => skins.register(skin) });
});

Hooks.once("ready", async () => {
  const module = game.modules.get("stagecraft");
  module.api = createApi({ skins, current });
  // the chalk journal is made only where a scene allows chalk, so a world that never uses it never gets one
  try { if (ChalkStore.wanted()) await ChalkStore.ensure(); } catch (err) { console.warn("stagecraft | could not make the chalk journal", err); }
  Hooks.callAll("stagecraft.ready", module.api);
});
