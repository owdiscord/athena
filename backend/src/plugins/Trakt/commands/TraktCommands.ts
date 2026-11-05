import { resolveMember } from "../../../utils.js";
import {
  guildPluginMessageCommand,
  guildPluginSlashCommand,
  slashOptions,
} from "vety";
import { TraktPluginType } from "../types.js";
import { EmbedBuilder, MessageFlags } from "discord.js";

export const ReportSlashCmd = guildPluginSlashCommand<TraktPluginType>()({
  name: "report",
  configPermission: "can_use_trakt",
  description: "Show all regular tracking information for a user",
  allowDms: false,
  signature: [
    slashOptions.user({
      name: "snowflake",
      description: "Username / Snowflake",
      required: true,
    }),
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const member = await resolveMember(
      pluginData.client,
      pluginData.guild,
      options.snowflake.id,
    );
    if (!member) return;
    const user = await pluginData.state.users.find(options.snowflake.id);
    if (user == null) {
      pluginData.state.common.sendSuccessMessage(
        interaction,
        `I'm not tracking **${member.user.username}**.`,
      );
    } else {
      pluginData.state.common.sendSuccessMessage(
        interaction,
        [
          `All regular tracking info for **${member.user.username}**:`,
          `Message score: ${user.message_score}`,
          `Time score: ${user.time_score}`,
          `Has role: ${user.has_regular}`,
        ].join("\n"),
      );
    }
  },
});

export const EditSlashCmd = guildPluginSlashCommand<TraktPluginType>()({
  name: "edit",
  configPermission: "can_modify_trakt",
  description: "Change regular tracking information for a user",
  signature: [
    slashOptions.string({
      name: "snowflake",
      description: "User ID",
      required: true,
    }),
    slashOptions.string({
      name: "type",
      description: "Which score to change",
      required: true,
      choices: [
        { value: "message_score", name: "Message score" },
        { value: "time_score", name: "Time score" },
      ],
    }),
    slashOptions.integer({
      name: "value",
      description: "New value for this score",
      required: true,
    }),
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const member = await resolveMember(
      pluginData.client,
      pluginData.guild,
      options.snowflake,
    );
    if (!member) return;
    if (options.type === "message_score") {
      pluginData.state.users.overrideMessage(options.snowflake, options.value);
    } else if (options.type === "time_score") {
      pluginData.state.users.overrideTime(options.snowflake, options.value);
    } else {
      pluginData.state.common.sendErrorMessage(
        interaction,
        "Invalid score type internally. Please report this bug!",
      );
      return;
    }
    pluginData.state.common.sendSuccessMessage(
      interaction,
      `Forgot about **${member.user.username}**.`,
    );
  },
});

export const ResetSlashCmd = guildPluginSlashCommand<TraktPluginType>()({
  name: "reset",
  configPermission: "can_use_trakt",
  description: "Reset all regular tracking information for a user",
  signature: [
    slashOptions.user({
      name: "snowflake",
      description: "Username / Snowflake",
      required: true,
    }),
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const member = await resolveMember(
      pluginData.client,
      pluginData.guild,
      options.snowflake.id,
    );
    if (!member) return;
    pluginData.state.users.delete(options.snowflake.id);
    pluginData.state.common.sendSuccessMessage(
      interaction,
      `Forgot about **${member.user.username}**.`,
    );
  },
});

export const TraktMessageCmd = guildPluginMessageCommand<TraktPluginType>()({
  trigger: "trakt",
  permission: "can_use_trakt",
  async run({ pluginData, message: msg }) {
    const { state, config } = pluginData;

    const counts = await state.users.returnUserCounts(
      config.get().message_score_threshold,
      config.get().time_score_threshold,
    );

    const embed = new EmbedBuilder();
    embed
      .setColor(0x4ee3fa)
      .setTitle("Trakt")
      .addFields(
        {
          name: "Total users trakt",
          value: counts.tracking.toString(),
        },
        {
          name: "Users close to regular",
          value: counts.close.toString(),
          inline: true,
        },
        {
          name: "Users with Trakt regular",
          value: counts.has_trakt_regular.toString(),
          inline: true,
        },
      )
      .setDescription(
        `- Message threshold: ${config.get().message_score_threshold}\n- Day threshold: ${config.get().time_score_threshold}`,
      );
    msg.channel.send({
      embeds: [embed],
    });
  },
});
