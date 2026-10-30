// tslint:disable:no-console

import { MINUTES } from "../../utils.js";
import { emitGuildEvent, getActiveGuildIDsForEvent } from "../GuildEvents.js";

const LOOP_INTERVAL = 10 * MINUTES;

export async function runTraktAssignmentLoop() {
  console.log("[TRAKT ASSIGNMENT LOOP] Evaluating eligable members...");

  try {
    for (const guildID of getActiveGuildIDsForEvent("traktAssignment"))
      emitGuildEvent(guildID, "traktAssignment", []);
  } catch (err) {
    console.error("[TRAKT ASSIGNMENT LOOP] Error in cycle", err);
  }

  console.log("[TRAKT ASSIGNMENT LOOP] Scheduling next loop");
  setTimeout(() => runTraktAssignmentLoop(), LOOP_INTERVAL);
}
