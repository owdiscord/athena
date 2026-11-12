import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Message } from "discord.js";
import { buildCustomId } from "utils/buildCustomId.js";
import { parseCustomId } from "utils/parseCustomId.js";
import { guildPluginEventListener } from "vety";
import { CasesPluginType } from "../types.js";
import { MutesPlugin } from "plugins/Mutes/MutesPlugin.js";

export async function addUnmuteContextButton(message: Message, userId: string) {
  const components = createButtonComponents(userId)
  await message.edit({ components })
}

function createButtonComponents(userId: string): Array<ActionRowBuilder<ButtonBuilder>> {
  let currentRow = new ActionRowBuilder<ButtonBuilder>()
  const rows = [currentRow]

  const button = new ButtonBuilder()
    .setLabel("False alarm")
    .setStyle(ButtonStyle.Primary)
    .setCustomId(buildCustomId("caseContext", { name: "automute-undo", user: userId }))

  currentRow.components.push(button)

  return rows;
}

export const onButtonInteraction = guildPluginEventListener<CasesPluginType>()({
  event: "interactionCreate",
  async listener({ pluginData, args }) {
    if (!args.interaction.isButton()) {
      return;
    }

    const { namespace, data } = parseCustomId(args.interaction.customId);
    if (namespace !== "caseContext") {
      return;
    }

    await args.interaction.message.edit({ components: [] })

    const mutesPlugin = pluginData.getPlugin(MutesPlugin)
    mutesPlugin.unmuteUser(data.user, undefined, { reason: "Unmuted via false alarm context button" })
  },
});
