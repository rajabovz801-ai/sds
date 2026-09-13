import {
  isAddressedToAgent,
  isGroupMessage,
  isStaffChat,
  stripBotMentions
} from "./config.js";
import { handleCheckerWritingSubmission } from "./checker-writing.js";
import { runAgent } from "./openai.js";
import { sendAgentMessage } from "./telegram.js";

function looksLikeAssignmentRouting(message) {
  const text = String(message?.caption || message?.text || "").toLowerCase().replace(/[ʻ’`]/g, "'");
  return /(guruh|group|uyga\s*vazifa|homework|deadline|gacha|yubor|jo'nat|send)/i.test(text);
}

export async function handleAgentUpdate(agentKey, update) {
  const message = update?.message;
  if (!message?.chat?.id) return;
  if (message.from?.is_bot) return;

  if (agentKey === "checker" && isStaffChat(message) && !looksLikeAssignmentRouting(message)) {
    const handled = await handleCheckerWritingSubmission(message);
    if (handled) return;
  }

  const text = message.text || message.caption || "";
  if (!text.trim()) return;

  if (isGroupMessage(message) && !isAddressedToAgent(message, agentKey)) return;

  const instruction = stripBotMentions(text) || text.trim();
  const response = await runAgent(agentKey, instruction);
  await sendAgentMessage(agentKey, message.chat.id, response);
}
