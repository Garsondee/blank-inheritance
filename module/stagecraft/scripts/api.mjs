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
import { publishMoves, arrange, backToPlaces, keepPlaces, setChalkBox, editStage, tidyUp, setLife, setBoard, setSpeaker, setTurn, setBadges, setDown, setEmote, registerMoments, registerCover } from "./foundry/blocking.mjs";
import { EMOTE_ORDER } from "./core/emotes.mjs";
import { TOOL_NAMES } from "./core/brush.mjs";
import { registerMargins } from "./foundry/margins.mjs";
import { registerWings, registerFinder } from "./foundry/wings.mjs";
import { registerCardActions } from "./foundry/card-menu.mjs";
import { registerTokenActors } from "./foundry/tokens.mjs";

export const API_VERSION = "0.15.0";

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
      /** Where the cards stand now becomes where the scene puts them (what ackToPlaces returns them to); ids limits it. Resolves to how many changed. */
      keepPlaces: (scene, ids = null) => keepPlaces(scene, current.host, ids),
      /** Put the box of chalk at a point of the painting [fx, fy] (where the scene's author would have put it). Resolves to whether it was written. */
      setChalkBox: (scene, at) => setChalkBox(scene, at),
      /** Stage by hand: { mark: { id, at } }, { vertex: { id, index, at } }, { zone: { id, dx, dy } }, { addVertex: { id, after } } or { removeVertex: { id, index } }, written into the scene's description. Resolves to whether anything was written. */
      editStage: (scene, edit) => editStage(scene, edit),
      /** Every loose card walks to its nearest free mark. */
      tidy: (scene) => tidyUp(scene, current.host),
      setLife: (scene, on) => setLife(scene, on),
      setBoard: (scene, on) => setBoard(scene, on),
      /** Give someone the floor (a card's id; null takes it back): lit, and everyone turns to look at them. */
      setSpeaker: (scene, id) => setSpeaker(scene, id),
      /** Light a card as the one whose turn it is (a card's id; null puts the light out): nobody turns to look. */
      setTurn: (scene, id) => setTurn(scene, id),
      /** Put badges on a card (a few short labels shown on its face, e.g. conditions); an empty list takes them off. */
      setBadges: (scene, id, badges) => setBadges(scene, id, badges),
      /** Knock a card down (a defeated foe, a character at 0 HP) or stand it back up. */
      setDown: (scene, id, down) => setDown(scene, id, down),
      /** Put an emote on a card (an id from api.emotes), shown once, or with { keep: true } until cleared; null clears it. */
      setEmote: (scene, id, emote, opts = {}) => setEmote(scene, id, emote, opts),
      /** Offer a scene's authored blocking as buttons on the GM's strip: provider(scene) -> [{ id, label, tip?, run(scene) }]. */
      registerMoments: (provider) => registerMoments(provider),
      /** Say what your own interface covers over the stage: provider() -> [{ rect: [x0, y0, x1, y1] } | { circle: [cx, cy, r] }], window pixels. */
      setCover: (provider) => registerCover(provider),
      /** Add your own things to the GM's card menu: provider(scene, cardId, card) -> [{ id, label, run() }], answered at once. Returns a function that takes it away. */
      setCardActions: (provider) => registerCardActions(provider)
    },

    /**
     * Who waits in the wings (core/wings.mjs): the people a scene could still bring on, shown to the GM alone, as a tray along
     * the top of the stage and a faded card where each would stand. Bringing one on raises `stagecraft.bring`; nothing is
     * written or sent by the stage itself.
     */
    wings: {
      /** provider(scene) -> { people: [{ id, name, title?, portrait?, at?, size?, way?, note? }], ways?: [{ id, label }] } (or a promise). Returns a function that takes it away. */
      setProvider: (provider) => registerWings(provider),
      /** finder(scene, query) -> [{ id, name, portrait?, note? }] (or a promise): anyone else the GM can find and bring on. Returns a function that takes it away. */
      setFinder: (finder) => registerFinder(finder),
      /** Ask the providers again, now (your own story changed). Resolves when the tray has been drawn again. */
      refresh: () => current.host?.wings?.refresh() ?? Promise.resolve()
    },

    /**
     * Cards and Foundry's tokens (core/tokens.mjs): every card on a stage has a real token on its scene, never drawn, so what a
     * click controls (`canvas.tokens.controlled`) and what a T aims at (`game.user.targets`) are what Foundry's own canvas would
     * give. The acting GM's screen makes and keeps them; a card's actor is its own `actor`, else the provider's answer.
     */
    tokens: {
      /** provider(scene, card) -> an Actor, an actor id, { id, link: false } (each token its own copy of the actor) or null (or a promise of one): who a card's token stands for. Asked when a card needs a token and when its name changes. Returns a function that takes it away. */
      setActorProvider: (provider) => registerTokenActors(provider),
      /** Make the tokens of the stage on screen agree with its cards, now (your own actors changed). Resolves when done. */
      refresh: () => current.host?.tokens?.ensure({ force: true }) ?? Promise.resolve()
    },

    /**
     * Where this screen looks (core/look.mjs). Everyone pans and zooms their own view; home is the whole stage, fitted
     * clear of what your own interface takes along the window's edges.
     */
    view: {
      /** Say what your interface takes along each edge: provider() -> { left?, right?, top?, bottom? }, window pixels, as now. Returns a function that takes it away. */
      setMargins: (provider) => registerMargins(provider),
      /** Glide this screen's view home (call it when your interface opened, shut or changed size); { animate: false } jumps. Returns whether a stage was there. */
      home: (opts = {}) => current.host?.home(opts) === true
    },

    /** The stage on screen now, or null: { stage, backend }. */
    stage: () => (current.host ? { stage: current.host.stage, backend: current.host.backend } : null),

    zoneKinds: [...ZONE_KINDS],
    chalkModes: [...CHALK_MODES],
    /** The emotes a card can show (its menu offers them all): what api.blocking.setEmote takes. */
    emotes: [...EMOTE_ORDER],
    /** The tools in the chalk kit (chalk.md §5): what the `stagecraft.chalk` hook's `tool` can be. */
    chalkTools: [...TOOL_NAMES]
  };
}
