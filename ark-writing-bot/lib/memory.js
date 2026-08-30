import { createClient } from "@supabase/supabase-js";

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase bot-memory environment variables are missing");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

function connectionKey(value) {
  return value || "";
}

export async function getConversationHistory(businessConnectionId, chatId) {
  const supabase = client();
  const { data, error } = await supabase
    .from("ark_bot_conversation_memory")
    .select("history")
    .eq("business_connection_id", connectionKey(businessConnectionId))
    .eq("chat_id", chatId)
    .maybeSingle();

  if (error) throw error;
  return Array.isArray(data?.history) ? data.history.slice(-12) : [];
}

export async function saveConversationTurn(businessConnectionId, chatId, userText, assistantText) {
  const supabase = client();
  const key = connectionKey(businessConnectionId);
  const current = await getConversationHistory(businessConnectionId, chatId);
  const next = [
    ...current,
    { role: "user", text: String(userText).slice(0, 3000) },
    { role: "assistant", text: String(assistantText).slice(0, 3000) }
  ].slice(-12);

  const { error } = await supabase
    .from("ark_bot_conversation_memory")
    .upsert({
      business_connection_id: key,
      chat_id: chatId,
      history: next,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "business_connection_id,chat_id"
    });

  if (error) throw error;
}
