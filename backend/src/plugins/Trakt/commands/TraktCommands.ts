import { resolveMember } from "../../../utils.js";
import { guildPluginSlashCommand, slashOptions } from "vety";
import { TraktPluginType } from "../types.js";

export const ReportSlashCmd = guildPluginSlashCommand<TraktPluginType>()({
  name: "report",
  description: "Show all regular tracking information for a user",
  allowDms: false,
  signature: [
    slashOptions.string({
      name: "snowflake",
      description: "User ID",
      required: true,
    }),
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: true });
    const member = await resolveMember(
      pluginData.client,
      pluginData.guild,
      options.snowflake,
    );
    if (!member) return;
    const user = await pluginData.state.users.find(Number(options.snowflake));
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
    await interaction.deferReply({ ephemeral: true });
    const member = await resolveMember(
      pluginData.client,
      pluginData.guild,
      options.snowflake,
    );
    if (!member) return;
    if (options.type === "message_score") {
      pluginData.state.users.overrideMessage(
        Number(options.snowflake),
        options.value,
      );
    } else if (options.type === "time_score") {
      pluginData.state.users.overrideTime(
        Number(options.snowflake),
        options.value,
      );
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
  description: "Reset all regular tracking information for a user",
  signature: [
    slashOptions.string({
      name: "snowflake",
      description: "User ID",
      required: true,
    }),
  ],

  async run({ interaction, options, pluginData }) {
    await interaction.deferReply({ ephemeral: true });
    const member = await resolveMember(
      pluginData.client,
      pluginData.guild,
      options.snowflake,
    );
    if (!member) return;
    pluginData.state.users.delete(Number(options.snowflake));
    pluginData.state.common.sendSuccessMessage(
      interaction,
      `Forgot about **${member.user.username}**.`,
    );
  },
});
