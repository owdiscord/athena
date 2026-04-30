import { unique } from "../utils.js";
import tlds from "tlds" with { type: "json" };
import { URL } from "url";

const realLinkRegex = /https?:\/\/\S+/; // http://anything or https://anything
const plainLinkRegex = /((?!https?:\/\/)\S)+\.\S+/; // anything.anything, without http:// or https:// preceding it
// Both of the above, with precedence on the first one
const urlRegex = new RegExp(
  `(${realLinkRegex.source}|${plainLinkRegex.source})`,
  "g",
);
const protocolRegex = /^[a-z]+:\/\//;

interface MatchedURL extends URL {
  input: string;
}

export function getUrlsInString(str: string, onlyUnique = false): MatchedURL[] {
  let matches = [...(str.match(urlRegex) ?? [])];
  if (onlyUnique) {
    matches = unique(matches);
  }

  return matches.reduce<MatchedURL[]>((urls, match) => {
    const withProtocol = protocolRegex.test(match) ? match : `https://${match}`;

    let matchUrl: MatchedURL;
    try {
      matchUrl = new URL(withProtocol) as MatchedURL;
      matchUrl.input = match;
    } catch {
      return urls;
    }

    let hostname = matchUrl.hostname.toLowerCase();

    if (hostname.length > 3) {
      hostname = hostname.replace(/[^a-z]+$/, "");
    }

    const hostnameParts = hostname.split(".");
    const tld = hostnameParts[hostnameParts.length - 1];
    if (tlds.includes(tld)) {
      urls.push(matchUrl);
    }

    return urls;
  }, []);
}

export function parseInviteCodeInput(str: string): string {
  const parsedInviteCodes = getInviteCodesInString(str);
  if (parsedInviteCodes.length) {
    return parsedInviteCodes[0];
  }

  return str;
}

// discord.com/invite/<code>
// discordapp.com/invite/<code>
// discord.gg/invite/<code>
// discord.gg/<code>
// discord.com/friend-invite/<code>
const quickInviteDetection =
  /discord(?:app)?\.com\/(?:friend-)?invite\/([a-z0-9-]+)|discord\.gg\/(?:\S+\/)?([a-z0-9-]+)/gi;

const isInviteHostRegex = /(?:^|\.)(?:discord.gg|discord.com|discordapp.com)$/i;
const longInvitePathRegex = /^\/(?:friend-)?invite\/([a-z0-9-]+)$/i;

export function getInviteCodesInString(str: string): string[] {
  const inviteCodes: string[] = [];

  // Clean up markdown
  str = str.replace(/[|*_~]/g, "");

  // Quick detection
  const quickDetectionMatch = str.matchAll(quickInviteDetection);
  if (quickDetectionMatch) {
    inviteCodes.push(...[...quickDetectionMatch].map((m) => m[1] || m[2]));
  }

  // Deep detection via URL parsing
  const linksInString = getUrlsInString(str, true);
  const potentialInviteLinks = linksInString.filter((url) =>
    isInviteHostRegex.test(url.hostname),
  );
  const withNormalizedPaths = potentialInviteLinks.map((url) => {
    url.pathname = url.pathname.replace(/\/{2,}/g, "/").replace(/\/+$/g, "");
    return url;
  });

  const codesFromInviteLinks = withNormalizedPaths
    .map((url) => {
      // discord.gg/[anything/]<code>
      if (url.hostname === "discord.gg") {
        const parts = url.pathname.split("/").filter(Boolean);
        return parts[parts.length - 1];
      }

      // discord.com/invite/<code>[/anything]
      // discordapp.com/invite/<code>[/anything]
      // discord.com/friend-invite/<code>[/anything]
      // discordapp.com/friend-invite/<code>[/anything]
      const longInviteMatch = url.pathname.match(longInvitePathRegex);
      if (longInviteMatch) {
        return longInviteMatch[1];
      }

      return null;
    })
    .filter(Boolean) as string[];

  inviteCodes.push(...codesFromInviteLinks);

  return unique(inviteCodes);
}
