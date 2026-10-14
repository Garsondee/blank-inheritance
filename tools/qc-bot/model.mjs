/**
 * The canon model, with the two things the QC tools ask of it: a scene's hash now, and the work queue.
 *
 * `loadModel` reads all of canon (about half a second). `freshHash` loads it again, for use after files were changed:
 * the hash a scene has once a report's accepted changes are in is what the queue must recognise as "already reviewed".
 */
import { loadModel as loadStoryModel, sceneHash } from "../story/lib.mjs";
import { ROOT } from "./lib.mjs";
import { buildQueue } from "./queue.mjs";

export function loadModel(root = ROOT) {
  const model = loadStoryModel(root);
  model.sceneHashOf = (sceneId) => sceneHash(model, sceneId);
  model.freshHash = (sceneId) => sceneHash(loadStoryModel(root), sceneId);
  return model;
}

export const queueFor = (model, opts = {}) => buildQueue(model, { root: model.root, ...opts });
