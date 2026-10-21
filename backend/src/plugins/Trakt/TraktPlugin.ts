import {
  guildPlugin,
  GuildPluginData,
  guildPluginMessageCommand,
  guildPluginSlashGroup,
} from "vety";
import { TraktPluginType, zTraktConfig } from "./types.js";
import { GuildTrakt } from "data/GuildTrakt.js";
import { GuildSavedMessages } from "data/GuildSavedMessages.js";
import { resolveRoleId } from "utils.js";
import { TextChannel } from "discord.js";
import { CommonPlugin } from "plugins/Common/CommonPlugin.js";
import { TraktUser } from "data/entities/TraktUser.js";
import { memberRolesLock } from "utils/lockNameHelpers.js";
import { RoleManagerPlugin } from "plugins/RoleManager/RoleManagerPlugin.js";
import { ModActionsPlugin } from "plugins/ModActions/ModActionsPlugin.js";
import { MutesPlugin } from "plugins/Mutes/MutesPlugin.js";
import { ReportSlashCmd, ResetSlashCmd } from "./commands/TraktCommands.js";
import { TrakMessageCreate } from "./events/trakMessageCreate.js";

export const TraktPlugin = guildPlugin<TraktPluginType>()({
  name: "trakt",

  dependencies: () => [ModActionsPlugin, MutesPlugin],

  configSchema: zTraktConfig,

  messageCommands: [
    guildPluginMessageCommand<TraktPluginType>()({
      trigger: "trakt",
      permission: "can_view",
      async run({ pluginData, message: msg }) {
        msg.reply(
          "Trakt is enabled. Config:\n ```json" +
            JSON.stringify(pluginData.config, null, 2) +
            "```",
        );
      },
    }),
  ],

  slashCommands: [
    guildPluginSlashGroup<TraktPluginType>()({
      name: "regular",
      description: "Regular tracking",
      subcommands: [ReportSlashCmd, ResetSlashCmd],
    }),
  ],

  beforeLoad(pluginData) {
    const { state, guild } = pluginData;
    state.onMessageCreateFn = TrakMessageCreate;
    state.users = GuildTrakt.getGuildInstance(guild.id);
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id);
    state.cooldowns = new Map();
  },

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin);
  },

  async afterLoad(pluginData) {
    pluginData
      .getPlugin(MutesPlugin)
      .getEventEmitter()
      .on("mute", (userId, _reason, _isAutomodAction) => {
        const config = pluginData.config.get();
        pluginData.state.users.sanction(
          Number(userId),
          config.mute_delay_periods,
        );
      });
    const modActionsEvents = pluginData
      .getPlugin(ModActionsPlugin)
      .getEventEmitter();

    pluginData.state.savedMessages.events.on(
      "create",
      pluginData.state.onMessageCreateFn,
    );

    modActionsEvents.on("warn", (userId, _reason, _isAutomodAction) => {
      const config = pluginData.config.get();
      pluginData.state.users.warn(Number(userId), config.warn_delay_periods);
    });
    modActionsEvents.on("ban", (userId, _reason, _isAutomodAction) => {
      const config = pluginData.config.get();
      pluginData.state.users.sanction(Number(userId), config.ban_delay_periods);
    });
    const config = pluginData.config.get();
    pluginData.state.sweepTimer = setInterval(async () => {
      try {
        const deletedUsers = pluginData.state.users.decayTick(
          config.message_decay_magnitude,
        );
        const qualifiedUsers = await pluginData.state.users.regularSweep(
          config.message_score_threshold,
          config.time_score_threshold,
        );
        applyRegular(pluginData, qualifiedUsers);
      } catch (error) {}
    }, config.message_decay_period * 1000);
  },
});

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
  users.forEach(async (user) => {
    const id = String(user.snowflake);
    const lock = await pluginData.locks.acquire(memberRolesLock({ id: id }));
    roleManager.addRole(id, roleId);
    lock.unlock();
    if (channel instanceof TextChannel) {
      pluginData.state.common.sendSuccessMessage(
        channel,
        `Granted <@${id}> Regular.`,
      );
    }
  });
}

async function stripRegular(
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
  users.forEach(async (user) => {
    const id = String(user.snowflake);
    const lock = await pluginData.locks.acquire(memberRolesLock({ id: id }));
    roleManager.removeRole(id, roleId);
    lock.unlock();
    if (channel instanceof TextChannel) {
      pluginData.state.common.sendSuccessMessage(
        channel,
        `<@${id}> lost Regular for inactivity.`,
      );
    }
  });
}
