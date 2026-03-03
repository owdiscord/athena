import { waitForButtonConfirm } from "../../../../utils/waitForInteraction.js";
import { commandTypeHelpers as ct } from "../../../../commandTypes.js";
import { updateCase } from "../../functions/updateCase.js";
import { modActionsMsgCmd } from "../../types.js";

export const UpdateMsgCmd = modActionsMsgCmd({
  trigger: ["update", "reason"],
  permission: "can_note",
  description:
    "Update the specified case (or, if case number is omitted, your latest case) by adding more notes/details to it",

  signature: [
    {
      caseNumber: ct.number(),
      note: ct.string({ required: false, catchAll: true }),
    },
    {
      note: ct.string({ required: false, catchAll: true }),
    },
  ],

  async run({ pluginData, message: msg, args }) {
    const caseNumber = args.caseNumber;

    if (caseNumber != null && caseNumber < 1000) {
      const confirmed = await waitForButtonConfirm(
        msg,
        {
          content: `! Case \`#${caseNumber}\` is a low-numbered case. Are you sure you want to update it?`,
        },
        { restrictToId: msg.author.id },
      );

      if (!confirmed) {
        pluginData.state.common.sendErrorMessage(msg, "Update cancelled.");
        return;
      }
    }

    await updateCase(pluginData, msg, msg.author, caseNumber, args.note, [
      ...msg.attachments.values(),
    ]);
  },
});
