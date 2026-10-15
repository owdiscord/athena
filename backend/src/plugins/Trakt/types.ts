import { GuildSavedMessages } from "data/GuildSavedMessages.js";
import { GuildTrakt } from "data/GuildTrakt.js";
import { CommonPlugin } from "plugins/Common/CommonPlugin.js";
import { BasePluginType, pluginUtils } from "vety";
import { z } from "zod";

export const zTraktConfig = z
.strictObject({
  announce_channel: z.string(),
  message_score_threshold: z.number(),
  time_score_threshold: z.number(),
  time_tracking_message_threshold: z.number(),
  message_decay_magnitude: z.number().default(1),
  message_decay_period: z.number().default(86400),
  message_cooldown: z.number(),
  regular_role: z.string(),
  warn_delay_periods: z.number(),
  mute_delay_periods: z.number(),
  ban_delay_periods: z.number(),
  time_score_period: z.number().default(86400),
})

export interface TraktPluginType extends BasePluginType {
  configSchema: typeof zTraktConfig;
  state: {
    savedMessages: GuildSavedMessages;
    users: GuildTrakt;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
    cooldowns: Map<string, number>;
    sweepTimer: NodeJS.Timeout

    onMessageCreateFn;
  };
}