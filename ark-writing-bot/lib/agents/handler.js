import {
  isAddressedToAgent,
  isGroupMessage,
  isStaffChat,
  stripBotMentions
} from "./config.js";
import { handleCheckerWritingSubmission } from "./checker-writing.js";
import { runAgent } from "./openai.js";
import { sendAgentMessage } from "./telegram.js";

export async function handleAgentUpdate(agentKey, update) {
  const message = update?.message;
  if (!message?.chat?.id) return;
  if (message.from?.is_bot) return;

  if (agentKey === "checker" && isStaffChat(message)) {
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
