export const AGENTS = {
  teacher: {
    key: "teacher",
    name: "ARK Teacher",
    username: "Ark_Teacher_Bot",
    tokenEnv: "ARK_TEACHER_BOT_TOKEN",
    emoji: "📚"
  },
  checker: {
    key: "checker",
    name: "ARK Checker",
    username: "Ark_Checker1_Bot",
    tokenEnv: "ARK_CHECKER_BOT_TOKEN",
    emoji: "📝"
  },
  operations: {
    key: "operations",
    name: "ARK Operations",
    username: "Ark_Operations_Bot",
    tokenEnv: "ARK_OPERATIONS_BOT_TOKEN",
    emoji: "⚙️"
  },
  analyst: {
    key: "analyst",
    name: "ARK Analyst",
    username: "Ark_analyst_Bot",
    tokenEnv: "ARK_ANALYST_BOT_TOKEN",
    emoji: "📊"
  }
};

export const TEDDY_USERNAME = "arktutorbot";
export const STAFF_GROUP_TITLE = "ARK AI STAFF";

export function getAgentConfig(agentKey) {
  const config = AGENTS[agentKey];
  if (!config) throw new Error(`Unknown agent: ${agentKey}`);
  return config;
}

export function isGroupMessage(message) {
  return ["group", "supergroup"].includes(message?.chat?.type);
}

export function isStaffChat(message) {
  if (!message?.chat?.id) return false;
  const configuredId = String(process.env.ARK_AI_STAFF_CHAT_ID || "").trim();
  if (configuredId && configuredId === String(message.chat.id)) return true;
  return String(message.chat.title || "").trim().toUpperCase() === STAFF_GROUP_TITLE;
}

export function isReplyToBot(message, username) {
  const replied = message?.reply_to_message?.from;
  if (!replied?.is_bot) return false;
  return String(replied.username || "").toLowerCase() === String(username || "").toLowerCase();
}

export function containsMention(text, username) {
  const value = String(text || "").toLowerCase();
  return value.includes(`@${String(username || "").toLowerCase()}`);
}

export function isAddressedToAgent(message, agentKey) {
  const config = getAgentConfig(agentKey);
  const text = message?.text || message?.caption || "";
  return containsMention(text, config.username) || isReplyToBot(message, config.username);
}

export function isAddressedToTeddy(message) {
  const text = message?.text || message?.caption || "";
  const lower = String(text).toLowerCase();
  return (
    containsMention(text, TEDDY_USERNAME) ||
    isReplyToBot(message, TEDDY_USERNAME) ||
    /(^|\s)teddy(?:\s|[,:.!?]|$)/i.test(lower) ||
    /^\/(start|help|manager)(?:@arktutorbot)?(?:\s|$)/i.test(String(text).trim())
  );
}

export function stripBotMentions(text = "") {
  let value = String(text);
  const usernames = [TEDDY_USERNAME, ...Object.values(AGENTS).map(agent => agent.username)];
  for (const username of usernames) {
    value = value.replace(new RegExp(`@${username}`, "ig"), " ");
  }
  return value.replace(/(^|\s)teddy\s*[:,.-]?\s*/i, "$1").replace(/\s+/g, " ").trim();
}
