import { SavedMessage } from "data/entities/SavedMessage.js";
import { GuildSavedMessages } from "../../data/GuildSavedMessages.js";
import { GuildTrakt } from "../../data/GuildTrakt.js";
import { CommonPlugin } from "../../plugins/Common/CommonPlugin.js";
import { BasePluginType, pluginUtils } from "vety";
import { z } from "zod";
import { convertDelayStringToMS } from "../../utils.js";

export const zTraktConfig = z.strictObject({
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
  can_use_trakt: z.boolean().default(false),
  can_modify_trakt: z.boolean().default(false),
  milestone_roles: z
    .record(
      z.string(),
      z.string().transform((val, ctx) => {
        const ms = convertDelayStringToMS(val);

        if (!ms) {
          ctx.addIssue(`invalid delay: ${val}`);
          return z.NEVER;
        }

        return ms;
      }),
    )
    .default({}),
});

export interface TraktPluginType extends BasePluginType {
  configSchema: typeof zTraktConfig;
  state: {
    savedMessages: GuildSavedMessages;
    users: GuildTrakt;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
    cooldowns: Map<string, number>;
    sweepTimer: NodeJS.Timeout;

    onMessageSaveFn: (msg: SavedMessage) => void;
    onTraktAssignmentFn: () => void;
  };
}
