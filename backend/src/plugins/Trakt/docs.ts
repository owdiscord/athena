import { ZeppelinPluginDocs } from "../../types.js";
import { trimPluginDescription } from "../../utils.js";
import { zTraktConfig } from "./types.js";

export const traktPluginDocs: ZeppelinPluginDocs = {
  type: "stable",
  prettyName: "Trakt",
  description: trimPluginDescription(`
    Track regular roles for active users 
  `),
  configSchema: zTraktConfig,
};
