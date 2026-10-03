/**
 * The public interface: `game.modules.get("stagecraft").api`. Anything not reachable from here is not part of the
 * module's contract and may change without notice. `api.schema.json` lists exactly what is here, and a test fails if
 * this file and that one disagree (module.md §3, rule 4).
 */

import { describeScene, ZONE_KINDS, CHALK_MODES } from "./core/scene.mjs";
import { isStageScene, readStage } from "./foundry/scene-data.mjs";
import { FORMATIONS } from "./core/formations.mjs";
import { GAIT_NAMES } from "./core/walks.mjs";
import { ROUTINES } from "./core/life.mjs";
import { publishMoves, arrange, backToPlaces, tidyUp, setLife, setBoard, setSpeaker, setDown, registerMoments, registerCover } from "./foundry/blocking.mjs";

export const API_VERSION = "0.4.0";

export function createApi({ skins, current }) {
  return {
    version: API_VERSION,

    skins: {
      register: (skin) => skins.register(skin),
      use: (id) => skins.use(id),
      list: () => skins.list()
    },

    scenes: {
      /** Is this a stage scene (does it carry a description)? */
      isStage: (scene) => isStageScene(scene),
      /** The description of a scene, understood: { ok, usable, scene, problems }. */
      describe: (scene) => readStage(scene),
      /** Understand a description that is not in a scene yet (a GM's draft). */
      validate: (raw) => describeScene(raw)
    },

    /**
     * Where people stand and how they get there (stage.md §5): every call is a GM's write to the scene, which every screen
     * then walks out together. Positions are fractions of the painting.
     */
    blocking: {
      formations: [...FORMATIONS],
      gaits: [...GAIT_NAMES],
      routines: [...ROUTINES],
      /** Send cards somewhere: [{ id, at: [fx, fy] | mark, yaw?, lean?, pitch?, gait?, still?, packed? }]. */
      move: (scene, moves) => publishMoves(scene, moves),
      /** A formation: { ids?, focus?: [fx, fy] | cardId, target?, speakers?, party?, gait? }. */
      arrange: (scene, kind, opts = {}) => arrange(scene, kind, opts, current.host),
      /** Everyone moved goes back to where the scene put them (`home`), and back to their routines. */
      backToPlaces: (scene) => backToPlaces(scene),
      /** Every loose card walks to its nearest free mark. */
      tidy: (scene) => tidyUp(scene, current.host),
      setLife: (scene, on) => setLife(scene, on),
      setBoard: (scene, on) => setBoard(scene, on),
      /** Give someone the floor (a card's id; null takes it back): lit, and everyone turns to look at them. */
      setSpeaker: (scene, id) => setSpeaker(scene, id),
      /** Knock a card down (a defeated foe, a character at 0 HP) or stand it back up. */
      setDown: (scene, id, down) => setDown(scene, id, down),
      /** Offer a scene's authored blocking as buttons on the GM's strip: provider(scene) -> [{ id, label, tip?, run(scene) }]. */
      registerMoments: (provider) => registerMoments(provider),
      /** Say what your own interface covers over the stage: provider() -> [{ rect: [x0, y0, x1, y1] } | { circle: [cx, cy, r] }], window pixels. */
      setCover: (provider) => registerCover(provider)
    },

    /** The stage on screen now, or null: { stage, backend }. */
    stage: () => (current.host ? { stage: current.host.stage, backend: current.host.backend } : null),

    zoneKinds: [...ZONE_KINDS],
    chalkModes: [...CHALK_MODES]
  };
}
