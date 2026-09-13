import { sendMessage } from "../telegram.js";
import {
  getPersistentHistory,
  prepareDailyReport,
  savePersistentHistory
} from "../tracker.js";
import { AGENTS, stripBotMentions } from "./config.js";
import { tryHandleQuizRequest, tryHandleStaffAssignment } from "./assignment-workflow-v2.js";
import { tryHandleLocalQuizPreview, tryHandleLocalQuizResults } from "./quiz-preview.js";
import { runAgent } from "./openai.js";
import { sendAgentMessage } from "./telegram.js";

function detectRoute(text = "") {
  const value = String(text).toLowerCase();
  const quiz = /\b(quiz|test|mcq|poll|savol)\b/.test(value);
  const checker = /\b(writing|essay|speaking|audio|tekshir|bahola|band|feedback|xato)\b/.test(value);
  const operations = /\b(homework|vazifa|deadline|reminder|attendance|davomat|coin|streak|shop|retry|topshirm|yubor)\b/.test(value);
  const analyst = /\b(report|natija|result|progress|leaderboard|statistika|analysis|analiz|bajargan|bajarmagan|qilmagan|sust)\b/.test(value) || /guruh.*(holat|ko['‘]?r|tekshir)/.test(value);
  const teacher = /\b(grammar|vocab|vocabulary|reading|listening|tushuntir|explain|mavzu|lesson|dars)\b/.test(value);
  if (quiz && analyst) return ["analyst"];
  if (quiz) return ["teacher", "operations"];
  if (checker) return ["checker"];
  if (operations && analyst) return ["operations", "analyst"];
  if (analyst) return ["analyst"];
  if (operations) return ["operations"];
  if (teacher) return ["teacher"];
  return null;
}

function recentUserText(history = []) {
  return history.filter(item => item?.role === "user" && item?.content).slice(-3).map(item => String(item.content)).join("\n");
}

function routeTask(text = "", history = []) {
  const direct = detectRoute(text);
  if (direct) return direct;
  const previous = recentUserText(history);
  return detectRoute(`${previous}\n${text}`) || ["teacher"];
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
  const next = [...history, { role: "user", content: String(userText || "").slice(0, 2500) }];
  if (assistantText) next.push({ role: "assistant", content: String(assistantText).slice(0, 4000) });
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

function isTeamBroadcast(instruction = "") {
  const value = String(instruction).toLowerCase().replace(/[’ʻ`]/g, "'");
  const wholeTeam = /(agentlar|agentlarim|jamoa|xodimlar|hammangiz|hamma agent)/.test(value);
  const social = /(yaxshimisiz|qalaysiz|qalesiz|salom|bormisiz|tayyormisiz|nima gap)/.test(value);
  return wholeTeam && social;
}

async function handleTeamBroadcast(incoming, instruction, history) {
  await sendMessage(incoming.chatId, "🧸 Yaxshimiz 😄 Jamoa shu yerda. Hammamiz tayyormiz.", incoming.businessConnectionId);
  const outputs = [];
  for (const agentKey of ["teacher", "checker", "operations", "analyst"]) {
    try {
      const result = await runAgent(
        agentKey,
        instruction,
        "The owner is greeting the whole ARK AI STAFF team. Reply in one or two natural sentences in your own role. Do not discuss implementation."
      );
      await sendAgentMessage(agentKey, incoming.chatId, result);
      outputs.push(`${AGENTS[agentKey].name}: ${result}`);
    } catch (error) {
      console.warn(`Team greeting failed for ${agentKey}`, error?.message || error);
    }
  }
  await remember(incoming, history, instruction, outputs.join("\n"));
}

function teddyOpening(route) {
  if (route.length === 1 && route[0] === "checker") return "🧸 Bo'ldi, ko'rib chiqamiz.";
  if (route.length === 1 && route[0] === "analyst") return "🧸 Hozir natijani ko'ramiz.";
  if (route.length === 1 && route[0] === "operations") return "🧸 Bo'ldi, tartibga qo'yaman.";
  if (route.length === 1 && route[0] === "teacher") return "🧸 Bo'ldi, ko'ramiz.";
  return "🧸 Bo'ldi, jamoa ko'rib chiqadi.";
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

  if (isTeamBroadcast(instruction)) {
    await handleTeamBroadcast(incoming, instruction, history);
    return;
  }

  try {
    if (await tryHandleLocalQuizResults(incoming)) {
      await remember(incoming, history, instruction, "ARK Analyst returned tracked quiz results.");
      return;
    }
    if (await tryHandleLocalQuizPreview(incoming)) {
      await remember(incoming, history, instruction, "Interactive local quiz is tracked and non-anonymous.");
      return;
    }
    if (await tryHandleQuizRequest(incoming)) {
      await remember(incoming, history, instruction, "Interactive quiz workflow handled the request.");
      return;
    }
    if (await tryHandleStaffAssignment(incoming)) {
      await remember(incoming, history, instruction, "Assignment workflow handled the request.");
      return;
    }
  } catch (error) {
    console.error("Staff workflow failed", error);
    await sendMessage(incoming.chatId, "🧸 Hozir shu ishda texnik muammo chiqdi. Men logni saqladim — qayta urinib ko'ramiz.", incoming.businessConnectionId);
    return;
  }

  const route = routeTask(instruction, history);
  if (isWaitingForWritingSubmission(instruction, route)) {
    await sendMessage(incoming.chatId, "🧸 Bo'ldi, yuboravering 👍", incoming.businessConnectionId);
    await sendAgentMessage(
      "checker",
      incoming.chatId,
      "Yuboravering 👍 DOCX, PDF, rasm yoki TXT bo'ladi. Avval eng muhim xatolarni ko'raman, keyin band va batafsil PDF beraman."
    );
    await remember(incoming, history, instruction, "Checker writing faylini kutmoqda.");
    return;
  }

  await sendMessage(incoming.chatId, teddyOpening(route), incoming.businessConnectionId);
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
      await sendAgentMessage(agentKey, incoming.chatId, "Hozir bir texnik muammo chiqdi. Teddy ko'rib turibdi, qayta urinib ko'ramiz.").catch(() => {});
      memoryOutputs.push(`${AGENTS[agentKey].name}: technical failure`);
    }
  }

  await remember(incoming, history, instruction, memoryOutputs.join("\n\n"));
}
