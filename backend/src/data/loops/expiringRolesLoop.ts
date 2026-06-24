// tslint:disable:no-console
import moment from "moment-timezone";
import { lazyMemoize, MINUTES, SECONDS } from "../../utils.js";
import { emitGuildEvent, hasGuildEventListener } from "../GuildEvents.js";
import { TemporaryRoles } from "../TemporaryRoles.js";
import Timeout = NodeJS.Timeout;
import { TemporaryRole } from "data/entities/TemporaryRole.js";

const LOOP_INTERVAL = 15 * MINUTES;
const MAX_TRIES_PER_SERVER = 3;
const getTempRolesRepository = lazyMemoize(() => new TemporaryRoles());
const timeouts = new Map<string, Timeout>();

function tempRoleToKey(tempRole: TemporaryRole) {
  return `${tempRole.guild_id}/${tempRole.user_id}/${tempRole.role_id}`;
}

async function broadcastExpiredRole(
  guildId: string,
  userId: string,
  tries = 0,
): Promise<void> {
  const tempRole = await getTempRolesRepository().findTemporaryRole(
    guildId,
    userId,
  );
  if (!tempRole) {
    // Role was already cleared
    return;
  }
  if (
    !tempRole.expires_at ||
    moment(tempRole.expires_at).diff(moment()) > 10 * SECONDS
  ) {
    // Role duration was changed and it's no longer expiring now
    return;
  }

  console.log(
    `[EXPIRING ROLES LOOP] Broadcasting expired role: ${tempRole.guild_id}/${tempRole.user_id}`,
  );
  if (!hasGuildEventListener(tempRole.guild_id, "expiredRole")) {
    // If there are no listeners registered for the server yet, try again in a bit
    if (tries < MAX_TRIES_PER_SERVER) {
      timeouts.set(
        tempRoleToKey(tempRole),
        setTimeout(
          () => broadcastExpiredRole(guildId, userId, tries + 1),
          1 * MINUTES,
        ),
      );
    }
    return;
  }
  emitGuildEvent(tempRole.guild_id, "expiredRole", [tempRole]);
}

export async function runExpiringTemporaryRolesLoop() {
  console.log("[EXPIRING ROLES LOOP] Clearing old timeouts");
  for (const timeout of timeouts.values()) {
    clearTimeout(timeout);
  }

  console.log("[EXPIRING ROLES LOOP] Clearing old expired temproles");
  await getTempRolesRepository().clearOldExpiredTemporaryRoles();

  console.log("[EXPIRING ROLES LOOP] Setting timeouts for expiring roles");
  const expiringMutes =
    await getTempRolesRepository().getSoonExpiringTemporaryRoles(LOOP_INTERVAL);
  for (const mute of expiringMutes) {
    const remaining = Math.max(
      0,
      moment.utc(mute.expires_at!).diff(moment.utc()),
    );
    timeouts.set(
      tempRoleToKey(mute),
      setTimeout(
        () => broadcastExpiredRole(mute.guild_id, mute.user_id),
        remaining,
      ),
    );
  }

  console.log("[EXPIRING ROLES LOOP] Scheduling next loop");
  setTimeout(() => runExpiringTemporaryRolesLoop(), LOOP_INTERVAL);
}

export function registerExpiringTempRole(tempRole: TemporaryRole) {
  clearExpiringTempRole(tempRole);

  if (tempRole.expires_at === null) {
    return;
  }

  console.log("[EXPIRING ROLES LOOP] Registering new expiring role");
  const remaining = Math.max(
    0,
    moment.utc(tempRole.expires_at).diff(moment.utc()),
  );
  if (remaining > LOOP_INTERVAL) {
    return;
  }

  timeouts.set(
    tempRoleToKey(tempRole),
    setTimeout(
      () => broadcastExpiredRole(tempRole.guild_id, tempRole.user_id),
      remaining,
    ),
  );
}

export function clearExpiringTempRole(tempRole: TemporaryRole) {
  console.log("[EXPIRING ROLES LOOP] Clearing expiring temporary roles");
  if (timeouts.has(tempRoleToKey(tempRole))) {
    clearTimeout(timeouts.get(tempRoleToKey(tempRole))!);
  }
}
