import { z } from "zod";
import { convertDelayStringToMS, zDelayString } from "../../../utils.js";
import { automodTrigger } from "../helpers.js";

const configSchema = z.strictObject({
  new_threshold: zDelayString.default("1h"),
});

export const NameNumMemberJoinTrigger = automodTrigger<unknown>()({
  configSchema,

  async match({ context, triggerConfig }) {
    if (!context.joined || !context.member) {
      return;
    }

    const threshold =
      Date.now() - convertDelayStringToMS(triggerConfig.new_threshold)!;
    const displayNames = (
      context.member.displayName ||
      context.member.user.displayName ||
      ""
    ).split(" ");

    const joined = displayNames.map((v) => v.toLowerCase().trim()).join("");
    const isSuspiciousName =
      displayNames.length === 2 &&
      context.member.user.username.startsWith(joined) &&
      /^[A-Za-z]+_\d{5}$/.test(context.member.user.username);

    return context.member.user.createdTimestamp >= threshold && isSuspiciousName
      ? {}
      : null;
  },

  renderMatchInformation() {
    return "";
  },
});
