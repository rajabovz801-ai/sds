import {
  getPersistentHistory,
  savePersistentHistory
} from "./tracker.js";

const globalStore = globalThis.__arkBotConversationMemory || new Map();
globalThis.__arkBotConversationMemory = globalStore;

function memoryKey(businessConnectionId, chatId) {
  return `${businessConnectionId || "direct"}:${chatId}`;
}

function localGet(businessConnectionId, chatId) {
  const value = globalStore.get(memoryKey(businessConnectionId, chatId));
  return Array.isArray(value) ? value.slice(-16) : [];
}

function localSet(businessConnectionId, chatId, history) {
  globalStore.set(memoryKey(businessConnectionId, chatId), history.slice(-16));
}

export async function getConversationHistory(businessConnectionId, chatId) {
  try {
    const history = await getPersistentHistory(businessConnectionId, chatId);
    if (history.length) localSet(businessConnectionId, chatId, history);
    return history.length ? history : localGet(businessConnectionId, chatId);
  } catch (error) {
    console.warn("Persistent bot memory unavailable; using local memory", error?.message || error);
    return localGet(businessConnectionId, chatId);
  }
}

export async function saveConversationTurn(businessConnectionId, chatId, userText, assistantText) {
  const current = await getConversationHistory(businessConnectionId, chatId);
  const next = [
    ...current,
    { role: "user", text: String(userText).slice(0, 3000) },
    { role: "assistant", text: String(assistantText).slice(0, 3000) }
  ].slice(-16);

  localSet(businessConnectionId, chatId, next);

  try {
    await savePersistentHistory(businessConnectionId, chatId, next);
  } catch (error) {
    console.warn("Could not persist bot memory; local memory remains active", error?.message || error);
  }
}
