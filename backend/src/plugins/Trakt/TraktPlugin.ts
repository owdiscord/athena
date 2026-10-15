import { guildPlugin, GuildPluginData } from "vety";
import { TraktPluginType, zTraktConfig } from "./types.js";
import { GuildTrakt } from "data/GuildTrakt.js";
import { GuildSavedMessages } from "data/GuildSavedMessages.js";
import { SavedMessage } from "data/entities/SavedMessage.js";
import { renderUsername, resolveMember, resolveRoleId } from "utils.js";
import { Snowflake, TextChannel, userMention } from "discord.js";
import { CommonPlugin } from "plugins/Common/CommonPlugin.js";
import { TraktUser } from "data/entities/TraktUser.js";
import { memberRolesLock } from "utils/lockNameHelpers.js";
import { RoleManagerPlugin } from "plugins/RoleManager/RoleManagerPlugin.js";
import { ModActionsPlugin } from "plugins/ModActions/ModActionsPlugin.js";
import { MutesPlugin } from "plugins/Mutes/MutesPlugin.js";
import { resolveChannelIds } from "utils/resolveChannelIds.js";

export const TraktPlugin = guildPlugin<TraktPluginType>()({
  name: "trakt",

  dependencies: () => [
    ModActionsPlugin,
    MutesPlugin,
  ],

  configSchema: zTraktConfig,

  beforeLoad(pluginData) {
    const { state, guild } = pluginData
    state.users = GuildTrakt.getGuildInstance(guild.id)
    state.savedMessages = GuildSavedMessages.getGuildInstance(guild.id)
    state.cooldowns = new Map()
  },

  beforeStart(pluginData) {
    pluginData.state.common = pluginData.getPlugin(CommonPlugin)
  },

  async afterLoad(pluginData) {
    pluginData.getPlugin(MutesPlugin).getEventEmitter().on("mute", (userId, reason, isAutomodAction) => {
       const config = pluginData.config.get()
       pluginData.state.users.sanction(Number(userId), config.mute_delay_periods)
    })
    const modActionsEvents = pluginData.getPlugin(ModActionsPlugin).getEventEmitter()
    modActionsEvents.on("warn", (userId, reason, isAutomodAction) => {
      const config = pluginData.config.get()
      pluginData.state.users.warn(Number(userId), config.warn_delay_periods)
    }) 
    modActionsEvents.on("ban", (userId, reason, isAutomodAction) => {
      const config = pluginData.config.get()
      pluginData.state.users.sanction(Number(userId), config.ban_delay_periods)
    }) 
    const config = pluginData.config.get()
    pluginData.state.sweepTimer = setInterval(
      async () => {
        try {
          const deletedUsers = pluginData.state.users.decayTick(config.message_decay_magnitude)
          const qualifiedUsers = await pluginData.state.users.regularSweep(
            config.message_score_threshold,
            config.time_score_threshold
          )
          applyRegular(pluginData, qualifiedUsers)
        } catch (error) {}
      },
      config.message_decay_period * 1000
    )
  }
})

async function applyRegular(pluginData: GuildPluginData<TraktPluginType>, users: TraktUser[]) {
  if (users.length == 0) {
    return
  }
  const config = pluginData.config.get()
  const roleId = await resolveRoleId(pluginData.client, pluginData.guild.id, config.regular_role)
  if (!roleId) {
    return
  }
  const channel = pluginData.guild.channels.cache.get(config.announce_channel)
  const roleManager = pluginData.getPlugin(RoleManagerPlugin)
  users.forEach(async user => {
    const id = String(user.snowflake)
    const lock = await pluginData.locks.acquire(memberRolesLock({ id: id }))
    roleManager.addRole(id, roleId)
    lock.unlock()
    if (channel instanceof TextChannel) {
      pluginData.state.common.sendSuccessMessage(channel, `Granted <@${id}> Regular.`)
    }
  })
}

async function stripRegular(pluginData: GuildPluginData<TraktPluginType>, users: TraktUser[]) {
  if (users.length == 0) {
    return
  }
  const config = pluginData.config.get()
  const roleId = await resolveRoleId(pluginData.client, pluginData.guild.id, config.regular_role)
  if (!roleId) {
    return
  }
  const channel = pluginData.guild.channels.cache.get(config.announce_channel)
  const roleManager = pluginData.getPlugin(RoleManagerPlugin)
  users.forEach(async user => {
    const id = String(user.snowflake)
    const lock = await pluginData.locks.acquire(memberRolesLock({ id: id }))
    roleManager.removeRole(id, roleId)
    lock.unlock()
    if (channel instanceof TextChannel) {
      pluginData.state.common.sendSuccessMessage(channel, `<@${id}> lost Regular for inactivity.`)
    }
  })
}

async function onMessageCreate(pluginData: GuildPluginData<TraktPluginType>, msg: SavedMessage) {
    if (msg.is_bot) return
    if (!msg.data.content) return
  
    const member = await resolveMember(pluginData.client, pluginData.guild, msg.user_id)
    if (!member) return
  
    const channel = pluginData.guild.channels.cache.get(msg.channel_id as Snowflake)
    if (!channel?.isTextBased()) return

    const config = pluginData.config.get()
    const now = Date.now()
    const earliestTs = now - 1000 * config.message_cooldown

    if (pluginData.state.cooldowns[member.id] >= earliestTs) {
      return
    }
    pluginData.state.cooldowns[member.id] = now
    pluginData.state.users.messageScoreTick(Number(member.id), config.message_score_threshold + 10)
}