import { ChatInputCommandInteraction, Message } from "discord.js";
import { GuildPluginData } from "vety";
import { ModActionsPluginType } from "../../types.js";

export async function actualHideCaseCmd(
  pluginData: GuildPluginData<ModActionsPluginType>,
  context: Message | ChatInputCommandInteraction,
  caseNumbers: number[],
) {
  const config = await (context instanceof Message
    ? pluginData.config.getForMessage(context)
    : pluginData.config.getForInteraction(context));

  const failed: number[] = [];
  const forbidden: number[] = [];

  for (const num of caseNumbers) {
    const theCase = await pluginData.state.cases.findByCaseNumber(num);
    if (!theCase) {
      failed.push(num);
      continue;
    }

    const isOwnCase =
      theCase.mod_id ===
      (context instanceof Message ? context.author.id : context.user.id);

    // Set the case to hidden if it is a self-created case, otherwise push to failures.
    if (isOwnCase || config.can_hidecase) {
      await pluginData.state.cases.setHidden(theCase.id, true);

      // If we're hiding it, let's clear the log too.
      if (theCase.log_message_id) {
        const [channelID, messageID] = theCase.log_message_id.split("-");
        const channel = pluginData.guild.channels.cache.get(channelID);
        if (channel?.isTextBased()) {
          // catch and void, it doesn't matter if the message doesn't exist.
          await channel.messages.delete(messageID).catch(() => {});
        }
      }
    } else forbidden.push(num);
  }

  if (failed.length + forbidden.length === caseNumbers.length) {
    pluginData.state.common.sendErrorMessage(
      context,
      "None of the cases could be hidden!",
    );
    return;
  }
  const failedAddendum =
    failed.length > 0
      ? `\nThe following cases were not found: ${failed.toString().replace(new RegExp(",", "g"), ", ")}`
      : "";

  const forbiddenAddendum =
    forbidden.length > 0
      ? `\nThe following cases are owned by someone else: ${failed.toString().replace(new RegExp(",", "g"), ", ")}`
      : "";

  const amt = caseNumbers.length - failed.length;
  pluginData.state.common.sendSuccessMessage(
    context,
    `${amt} case${amt === 1 ? " is" : "s are"} now hidden! Use \`unhidecase\` to unhide them.${failedAddendum}${forbiddenAddendum}`,
  );
}
