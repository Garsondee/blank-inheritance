/**
 * The Director's Party tab — reads sf2e's own real Party actor
 * (`game.actors.party`, confirmed live 2026-09-17: `.members` is a live
 * Collection of full Actor documents, populated via
 * `party.update({"system.details.members":[{uuid}, ...]})`) rather than
 * scanning scene tokens, so a PC not currently placed on the viewed scene
 * still shows up here. See foundry/cast.mjs for the scene-token board this
 * is deliberately NOT reusing — that one drives the bar's quick-roll
 * selection and is scene-scoped on purpose.
 */

import { partyOverview } from "../core/party-overview.mjs";
import { partyMemberSnapshot } from "./sheet-data.mjs";

/** The whole Party tab's context. No party actor, or an empty one, both resolve to a valid empty overview rather than throwing. */
export function partyOverviewData() {
  const party = game.actors?.party;
  const members = party ? Array.from(party.members ?? []) : [];
  return partyOverview(members.map(partyMemberSnapshot));
}
