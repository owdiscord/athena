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
    if (isOwnCase || config.can_hidecase)
      await pluginData.state.cases.setHidden(theCase.id, true);
    else failed.push(num);
  }

  if (failed.length === caseNumbers.length) {
    pluginData.state.common.sendErrorMessage(
      context,
      "None of the cases were found!",
    );
    return;
  }
  const failedAddendum =
    failed.length > 0
      ? `\nThe following cases were not found: ${failed.toString().replace(new RegExp(",", "g"), ", ")}`
      : "";

  const amt = caseNumbers.length - failed.length;
  pluginData.state.common.sendSuccessMessage(
    context,
    `${amt} case${amt === 1 ? " is" : "s are"} now hidden! Use \`unhidecase\` to unhide them.${failedAddendum}`,
  );
}
