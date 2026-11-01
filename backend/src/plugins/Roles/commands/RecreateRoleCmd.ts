import { RoleColorsResolvable } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { resolveRoleId } from "../../../utils.js";
import { LogsPlugin } from "../../Logs/LogsPlugin.js";
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

    const currentRole = pluginData.guild.roles.cache.get(roleId);
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

    const deleted = await currentRole.delete("Recreating role");
    if (!deleted) {
      void pluginData.state.common.sendErrorMessage(
        msg,
        "Could not delete role due to a Discord error.",
      );
      return;
    }

    const created = await pluginData.guild.roles.create({
      name: currentRole.name,
      colors: currentRole.colors as RoleColorsResolvable,
      hoist: currentRole.hoist,
      position: currentRole.position,
      permissions: currentRole.permissions,
      mentionable: currentRole.mentionable,
      icon: currentRole.icon,
      unicodeEmoji: currentRole.unicodeEmoji,
    });
    if (!created) {
      void pluginData.state.common.sendErrorMessage(
        msg,
        "Could not delete role due to a Discord error.",
      );
      return;
    }

    pluginData.state.common.sendSuccessMessage(
      msg,
      `Successfully recreated role **${created.name}**. New ID: \`${created.id}\``,
    );
  },
});
