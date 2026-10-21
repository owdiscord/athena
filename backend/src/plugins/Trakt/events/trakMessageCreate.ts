import { guildPluginEventListener } from "vety";
import { TraktPluginType } from "../types.js";
import { resolveMember, Snowflake } from "utils.js";

export const TrakMessageCreate = guildPluginEventListener<TraktPluginType>()({
  event: "messageCreate",
  async listener({ pluginData, args: { message: msg } }) {
    if (msg.author.bot) return;
    if (!msg.content) return;

    const member = await resolveMember(
      pluginData.client,
      pluginData.guild,
      msg.author.id,
    );
    if (!member) return;

    const channel = pluginData.guild.channels.cache.get(
      msg.channelId as Snowflake,
    );
    if (!channel?.isTextBased()) return;

    const config = pluginData.config.get();
    const now = Date.now();
    const earliestTs = now - 1000 * config.message_cooldown;

    if (pluginData.state.cooldowns[member.id] >= earliestTs) {
      return;
    }
    pluginData.state.cooldowns[member.id] = now;
    pluginData.state.users.messageScoreTick(
      Number(member.id),
      config.message_score_threshold + 10,
    );
  },
});
