import { sendMessage } from "../telegram.js";
import {
  getPersistentHistory,
  prepareDailyReport,
  savePersistentHistory
} from "../tracker.js";
import { AGENTS, stripBotMentions } from "./config.js";
import { runAgent } from "./openai.js";
import { sendAgentMessage } from "./telegram.js";

function detectRoute(text = "") {
  const value = String(text).toLowerCase();

  const quiz = /\b(quiz|test|mcq|poll|savol)\b/.test(value);
  const checker = /\b(writing|essay|speaking|audio|tekshir|bahola|band|feedback|xato)\b/.test(value);
  const operations = /\b(homework|vazifa|deadline|reminder|attendance|davomat|coin|streak|shop|retry|topshirm|yubor)\b/.test(value);
  const analyst = /\b(report|natija|result|progress|leaderboard|statistika|analysis|analiz|bajargan|bajarmagan|qilmagan|sust)\b/.test(value) || /guruh.*(holat|ko['‘]?r|tekshir)/.test(value);
  const teacher = /\b(grammar|vocab|vocabulary|reading|listening|tushuntir|explain|mavzu|lesson|dars)\b/.test(value);

  if (quiz) return ["teacher", "operations"];
  if (checker) return ["checker"];
  if (operations && analyst) return ["operations", "analyst"];
  if (analyst) return ["analyst"];
  if (operations) return ["operations"];
  if (teacher) return ["teacher"];
  return null;
}

function recentUserText(history = []) {
  return history
    .filter(item => item?.role === "user" && item?.content)
    .slice(-3)
    .map(item => String(item.content))
    .join("\n");
}

function routeTask(text = "", history = []) {
  const direct = detectRoute(text);
  if (direct) return direct;

  const previous = recentUserText(history);
  const contextual = detectRoute(`${previous}\n${text}`);
  return contextual || ["teacher"];
}

function conversationContext(history = []) {
  const items = history.slice(-8).map(item => {
    const role = item?.role === "assistant" ? "Team" : "User";
    return `${role}: ${String(item?.content || "").slice(0, 1800)}`;
  });
  return items.length ? `Recent ARK AI STAFF conversation:\n${items.join("\n")}` : "";
}

async function loadHistory(incoming) {
  try {
    return await getPersistentHistory(incoming.businessConnectionId, incoming.chatId);
  } catch (error) {
    console.warn("Staff history unavailable", error?.message || error);
    return [];
  }
}

async function remember(incoming, history, userText, assistantText = "") {
  const next = [
    ...history,
    { role: "user", content: String(userText || "").slice(0, 2500) }
  ];
  if (assistantText) {
    next.push({ role: "assistant", content: String(assistantText).slice(0, 4000) });
  }
  try {
    await savePersistentHistory(incoming.businessConnectionId, incoming.chatId, next);
  } catch (error) {
    console.warn("Could not save staff history", error?.message || error);
  }
}

function isWaitingForWritingSubmission(instruction = "", route = []) {
  if (route.length !== 1 || route[0] !== "checker") return false;
  const value = String(instruction).toLowerCase().replace(/[’ʻ`]/g, "'");
  return /writing|essay/.test(value) && /(yuboraman|jo['‘]?nataman|tashlayman|hozir yubor|hozir writing|tekshirib berasan|tekshirib ber|yuborsam)/i.test(value);
}

function teddyOpening(route, instruction) {
  const value = String(instruction || "").toLowerCase();
  if (route.includes("teacher") && route.includes("operations") && /quiz|test|mcq|savol/.test(value)) {
    return "🧸 Bo'ldi. Teacher savollarni tayyorlaydi, Operations esa o'tish mezoni va yuborish qismini yopadi.";
  }
  if (route.length === 1 && route[0] === "checker") return "🧸 Bo'ldi, Checker ko'rib chiqadi.";
  if (route.length === 1 && route[0] === "analyst") return "🧸 Hozir ko'ramiz. Analyst natijalarni chiqaradi.";
  if (route.length === 1 && route[0] === "operations") return "🧸 Bo'ldi, Operationsga berdim.";
  if (route.length === 1 && route[0] === "teacher") return "🧸 Bo'ldi, Teacher ko'rib chiqadi.";
  return `🧸 Bo'ldi. ${route.map(key => AGENTS[key].name).join(" va ")} ko'rib chiqadi.`;
}

async function analystContext(instruction) {
  if (!/(report|natija|progress|bajargan|bajarmagan|qilmagan|homework|vazifa|guruh)/i.test(instruction)) {
    return "Live database report was not requested for this instruction.";
  }
  try {
    const data = await prepareDailyReport();
    return `Live ARK bot daily-report payload (use only these facts; do not invent missing fields):\n${JSON.stringify(data).slice(0, 14000)}`;
  } catch (error) {
    console.warn("Could not prepare live analyst report", error?.message || error);
    return "Live report data is currently unavailable. State that clearly and do not invent student results.";
  }
}

export async function handleStaffManagerMessage(incoming) {
  const raw = incoming?.message?.text || incoming?.message?.caption || "";
  const instruction = stripBotMentions(raw) || raw.trim();
  if (!instruction) {
    await sendMessage(incoming.chatId, "🧸 Ha, yozavering. Nima qilamiz?", incoming.businessConnectionId);
    return;
  }

  const history = await loadHistory(incoming);
  const route = routeTask(instruction, history);

  if (isWaitingForWritingSubmission(instruction, route)) {
    await sendMessage(
      incoming.chatId,
      "🧸 Bo'ldi, yuboravering. Checkerga berdim.",
      incoming.businessConnectionId
    );
    await sendAgentMessage(
      "checker",
      incoming.chatId,
      "Yuboravering 👍 DOCX, PDF, rasm yoki TXT bo'ladi. Avval eng muhim xatolarni ko'raman, keyin band va batafsil PDF beraman."
    );
    await remember(incoming, history, instruction, "Checker writing faylini kutmoqda.");
    return;
  }

  const opening = teddyOpening(route, instruction);
  await sendMessage(incoming.chatId, opening, incoming.businessConnectionId);

  const recentContext = conversationContext(history);
  let previous = "";
  const memoryOutputs = [];

  for (const agentKey of route) {
    let context = [recentContext, previous].filter(Boolean).join("\n\n");
    if (agentKey === "analyst") {
      const live = await analystContext(instruction);
      context = [context, live].filter(Boolean).join("\n\n");
    }

    try {
      const result = await runAgent(agentKey, instruction, context);
      await sendAgentMessage(agentKey, incoming.chatId, result);
      previous = `${AGENTS[agentKey].name}:\n${result}`;
      memoryOutputs.push(previous);
    } catch (error) {
      console.error(`Agent ${agentKey} failed`, error);
      await sendAgentMessage(
        agentKey,
        incoming.chatId,
        "Hozir bir texnik muammo chiqdi. Teddy ko'rib turibdi, qayta urinib ko'ramiz."
      ).catch(() => {});
      memoryOutputs.push(`${AGENTS[agentKey].name}: technical failure`);
    }
  }

  await remember(incoming, history, instruction, memoryOutputs.join("\n\n"));
}
