import { createClient } from "@supabase/supabase-js";

const globalStore = globalThis.__arkBotConversationMemory || new Map();
globalThis.__arkBotConversationMemory = globalStore;

function memoryKey(businessConnectionId, chatId) {
  return `${businessConnectionId || "direct"}:${chatId}`;
}

function localGet(businessConnectionId, chatId) {
  const value = globalStore.get(memoryKey(businessConnectionId, chatId));
  return Array.isArray(value) ? value.slice(-12) : [];
}

function localSet(businessConnectionId, chatId, history) {
  globalStore.set(memoryKey(businessConnectionId, chatId), history.slice(-12));
}

function supabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function connectionKey(value) {
  return value || "";
}

export async function getConversationHistory(businessConnectionId, chatId) {
  const supabase = supabaseClient();
  if (!supabase) return localGet(businessConnectionId, chatId);

  try {
    const { data, error } = await supabase
      .from("ark_bot_conversation_memory")
      .select("history")
      .eq("business_connection_id", connectionKey(businessConnectionId))
      .eq("chat_id", chatId)
      .maybeSingle();

    if (error) throw error;
    const history = Array.isArray(data?.history) ? data.history.slice(-12) : localGet(businessConnectionId, chatId);
    if (history.length) localSet(businessConnectionId, chatId, history);
    return history;
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
  ].slice(-12);

  localSet(businessConnectionId, chatId, next);

  const supabase = supabaseClient();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from("ark_bot_conversation_memory")
      .upsert({
        business_connection_id: connectionKey(businessConnectionId),
        chat_id: chatId,
        history: next,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "business_connection_id,chat_id"
      });

    if (error) throw error;
  } catch (error) {
    console.warn("Could not persist bot memory; local memory remains active", error?.message || error);
  }
}
