import { isAddressedToAgent, isGroupMessage, stripBotMentions } from "./config.js";
import { runAgent } from "./openai.js";
import { sendAgentMessage } from "./telegram.js";

export async function handleAgentUpdate(agentKey, update) {
  const message = update?.message;
  if (!message?.chat?.id) return;
  if (message.from?.is_bot) return;

  const text = message.text || message.caption || "";
  if (!text.trim()) return;

  if (isGroupMessage(message) && !isAddressedToAgent(message, agentKey)) return;

  const instruction = stripBotMentions(text) || text.trim();
  const response = await runAgent(agentKey, instruction);
  await sendAgentMessage(agentKey, message.chat.id, response);
}
