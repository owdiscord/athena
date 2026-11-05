import { guildPlugin, GuildPluginData, guildPluginSlashGroup } from "vety";
import { TraktPluginType, zTraktConfig } from "./types.js";
import { GuildTrakt } from "../../data/GuildTrakt.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { resolveMember, resolveRoleId } from "../../utils.js";
import { PermissionFlagsBits, Snowflake, TextChannel } from "discord.js";
import { CommonPlugin } from "../../plugins/Common/CommonPlugin.js";
import { TraktUser } from "../../data/entities/TraktUser.js";
import { memberRolesLock } from "../../utils/lockNameHelpers.js";
import { RoleManagerPlugin } from "../../plugins/RoleManager/RoleManagerPlugin.js";
import { ModActionsPlugin } from "../../plugins/ModActions/ModActionsPlugin.js";
import { MutesPlugin } from "../../plugins/Mutes/MutesPlugin.js";
import {
  EditSlashCmd,
  MilestonesMessageCmd,
  ReportSlashCmd,
  ResetSlashCmd,
  TraktMessageCmd,
} from "./commands/TraktCommands.js";
import { SavedMessage } from "../../data/entities/SavedMessage.js";
import { onGuildEvent } from "../../data/GuildEvents.js";

export const TraktPlugin = guildPlugin<TraktPluginType>()({
  name: "trakt",

  dependencies: () => [ModActionsPlugin, MutesPlugin],

  configSchema: zTraktConfig,

  defaultOverrides: [
    {
      level: ">=50",
      config: {
        can_use_trakt: true,
      },
    },
    {
      level: ">=100",
      config: {
        can_modify_trakt: true,
      },
    },
  ],

  messageCommands: [TraktMessageCmd, MilestonesMessageCmd],

  slashCommands: [
    guildPluginSlashGroup<TraktPluginType>()({
      name: "regular",
      description: "Regular tracking",
      defaultMemberPermissions: PermissionFlagsBits.ModerateMembers.toString(),
      subcommands: [ReportSlashCmd, ResetSlashCmd, EditSlashCmd],
    }),
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;
    state.onTraktAssignmentFn = () => onTraktAssignment(pluginData);
    state.onMessageSaveFn = (msg: SavedMessage) =>
      trakMessageCreate(pluginData, msg);

    state.users = GuildTrakt.getGuildInstance(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.cooldowns = new Map();
  },

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },

  async afterLoad(pluginData) {
    const { state, guild } = pluginData;

    // Create our first tick state if necessary - this
    // silently fails if it already exists in the database.
    state.users.tryCreateFirstTickState();

    onGuildEvent(guild.id, "traktAssignment", state.onTraktAssignmentFn);

    // Listen for when a message is created, and run our handler
    pluginData.state.savedMessages.events.on(
      "create",
      pluginData.state.onMessageSaveFn,
    );

    /*
     * Mod action handling
     **/
    const modActionsEvents = pluginData
      .getPlugin(ModActionsPlugin)
      .getEventEmitter();

    // Sanction users when they receive a **Mute**
    pluginData
      .getPlugin(MutesPlugin)
      .getEventEmitter()
      .on("mute", (userId, _reason, _isAutomodAction) => {
        const config = pluginData.config.get();
        pluginData.state.users.sanction(userId, config.mute_delay_periods);
      });

    // Sanction users when the **Warn** mod action is executed
    modActionsEvents.on("warn", (userId, _reason, _isAutomodAction) => {
      const config = pluginData.config.get();
      pluginData.state.users.warn(userId, config.warn_delay_periods);
    });

    // Sanction users when the **Ban** mod action is executed
    modActionsEvents.on("ban", (userId, _reason, _isAutomodAction) => {
      const config = pluginData.config.get();
      pluginData.state.users.sanction(userId, config.ban_delay_periods);
    });
  },
});

async function onTraktAssignment(pluginData: GuildPluginData<TraktPluginType>) {
  const { state, config } = pluginData;
  const {
    message_score_threshold,
    time_score_threshold,
    message_decay_magnitude,
  } = config.get();
  // Apply regular to newly-qualified users
  const qualified = await state.users.regularSweep(
    message_score_threshold,
    time_score_threshold,
  );
  await applyRegular(pluginData, qualified);

  // Strip regular from now-unworthy users, and tick down if necessary.
  const revoked = await pluginData.state.users.tryDecay(
    10,
    time_score_threshold,
    message_decay_magnitude,
  );
  stripRegular(pluginData, revoked);
  console.log(
    `[TRAKT] ${qualified.length} user(s) receive regular, ${revoked.length} no longer qualified.`,
  );
}

async function applyRegular(
  pluginData: GuildPluginData<TraktPluginType>,
  users: TraktUser[],
) {
  if (users.length == 0) {
    return;
  }
  const config = pluginData.config.get();
  const roleId = await resolveRoleId(
    pluginData.client,
    pluginData.guild.id,
    config.regular_role,
  );
  if (!roleId) {
    return;
  }
  const channel = pluginData.guild.channels.cache.get(config.announce_channel);
  const roleManager = pluginData.getPlugin(RoleManagerPlugin);
  const extraApplications: { role: string; user: string }[] = [];
  users.forEach(async (user) => {
    const id = String(user.snowflake);
    const lock = await pluginData.locks.acquire(memberRolesLock({ id: id }));
    roleManager.addRole(id, roleId);
    const joinedAtDiff =
      Date.now() -
      ((await pluginData.guild.members.fetch(user.snowflake))
        ?.joinedTimestamp || 0);
    for (const [roleID, diff] of Object.entries(config.milestone_roles)) {
      if (joinedAtDiff >= diff) {
        roleManager.addRole(user.snowflake, roleID);
        extraApplications.push({ user: user.snowflake, role: roleID });
      }
    }
    lock.unlock();
  });

  if (channel instanceof TextChannel) {
    pluginData.state.common.sendSuccessMessage(
      channel,
      `Trakt has granted Regular to ${users.map((u) => `<@${u.snowflake}>`).join(", ")}`,
    );

    if (extraApplications.length > 0)
      pluginData.state.common.sendSuccessMessage(
        channel,
        `Additionally, the following users received milestone roles: ${extraApplications.map(({ user, role }) => `<@${user}> - <@&${role}>`).join(", ")}`,
      );
  }

  for (const [user, time] of pluginData.state.cooldowns.entries()) {
    if (time > Date.now() + (config.message_cooldown + 1000) * 1.5) {
      pluginData.state.cooldowns.delete(user);
    }
  }
}

async function stripRegular(
  pluginData: GuildPluginData<TraktPluginType>,
  userSnowflakes: string[],
) {
  if (userSnowflakes.length == 0) {
    return;
  }
  const config = pluginData.config.get();
  const roleId = await resolveRoleId(
    pluginData.client,
    pluginData.guild.id,
    config.regular_role,
  );
  if (!roleId) {
    return;
  }
  const channel = pluginData.guild.channels.cache.get(config.announce_channel);
  const roleManager = pluginData.getPlugin(RoleManagerPlugin);
  for (const id of userSnowflakes) {
    const lock = await pluginData.locks.acquire(memberRolesLock({ id: id }));
    roleManager.removeRole(id, roleId);
    lock.unlock();
  }

  if (channel instanceof TextChannel) {
    pluginData.state.common.sendSuccessMessage(
      channel,
      `Trakt has removed Regular from ${userSnowflakes.map((u) => `<@${u}>`).join(", ")} for inactivity.`,
    );
  }
}

async function trakMessageCreate(
  pluginData: GuildPluginData<TraktPluginType>,
  msg: SavedMessage,
) {
  if (msg.is_bot) return;
  if (!msg.data.content) return;

  const member = await resolveMember(
    pluginData.client,
    pluginData.guild,
    msg.user_id,
  );
  if (!member) return;

  const channel = pluginData.guild.channels.cache.get(
    msg.channel_id as Snowflake,
  );
  if (!channel?.isTextBased()) return;

  const config = pluginData.config.get();
  const now = Date.now();
  const earliestTs = now - 1000 * config.message_cooldown;

  if (pluginData.state.cooldowns[member.id] >= earliestTs) {
    return;
  }
  pluginData.state.cooldowns[member.id] = now;
  pluginData.state.users.tickUserScore(
    member.id,
    config.message_score_threshold + 10,
  );
}
