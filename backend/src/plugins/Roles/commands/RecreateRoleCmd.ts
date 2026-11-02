import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { resolveRoleId } from "../../../utils.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
import { Configs } from "../../../data/Configs.js";
import { rolesCmd } from "../types.js";

export const RecreateRoleCmd = rolesCmd({
  trigger: ["recreaterole", "recreate_role", "reset_role"],
  permission: "can_mass_assign",

  signature: {
    role: ct.string(),
  },

  async run({ message: msg, args, pluginData }) {
    const roleId = await resolveRoleId(
      pluginData.client,
      pluginData.guild.id,
      args.role,
    );
    if (!roleId) {
      void pluginData.state.common.sendErrorMessage(msg, "Invalid role id");
      return;
    }

    const currentRole = await pluginData.guild.roles
      .fetch(roleId)
      .catch(
        (e) =>
          void pluginData.state.common.sendErrorMessage(
            msg,
            `Discord error when deleting role: ${e}`,
          ),
      );
    if (!currentRole) {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: `Unknown role configured for 'roles' plugin: ${roleId}`,
      });
      void pluginData.state.common.sendErrorMessage(
        msg,
        "You cannot recreate that role",
      );
      return;
    }

    const deleted = await currentRole
      .delete("Recreating role")
      .catch(
        (e) =>
          void pluginData.state.common.sendErrorMessage(
            msg,
            `Discord error when deleting role: ${e}`,
          ),
      );
    if (!deleted) {
      void pluginData.state.common.sendErrorMessage(
        msg,
        "Could not delete role due to a Discord error.",
      );
      return;
    }

    const { primaryColor, secondaryColor, tertiaryColor } = currentRole.colors;
    const colors = {
      primaryColor,
      ...(secondaryColor != null && { secondaryColor }),
      ...(tertiaryColor != null && { tertiaryColor }),
    };

    const created = await pluginData.guild.roles
      .create({
        name: currentRole.name,
        colors,
        hoist: currentRole.hoist,
        position: currentRole.position,
        permissions: currentRole.permissions,
        mentionable: currentRole.mentionable,
        icon: currentRole.iconURL(),
        unicodeEmoji: currentRole.unicodeEmoji,
      })
      .catch(
        (e) =>
          void pluginData.state.common.sendErrorMessage(
            msg,
            `Discord error when creating role: ${e}`,
          ),
      );
    if (!created) {
      void pluginData.state.common.sendErrorMessage(
        msg,
        "Could not delete role due to a Discord error.",
      );
      return;
    }

    const key = `guild-${pluginData.guild.id}`;
    const configs = new Configs();
    configs.swapRawValueInPlace(
      key,
      new RegExp(`(?<!\\d)${currentRole.id}(?!\\d)`, "g"),
      created.id,
    );

    pluginData.state.common.sendSuccessMessage(
      msg,
      `Successfully recreated role **${created.name}**. New ID: \`${created.id}\`. Config modified, requires manual reload.`,
    );
  },
});
