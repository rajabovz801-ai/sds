import { sendMessage } from "../telegram.js";
import { prepareDailyReport } from "../tracker.js";
import { AGENTS, stripBotMentions } from "./config.js";
import { runAgent } from "./openai.js";
import { sendAgentMessage } from "./telegram.js";

function routeTask(text = "") {
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
  return ["teacher"];
}

function assignmentLine(agentKey, instruction) {
  const agent = AGENTS[agentKey];
  const short = String(instruction || "").replace(/\s+/g, " ").slice(0, 240);
  return `${agent.emoji} @${agent.username}, topshiriq: ${short}`;
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
    await sendMessage(incoming.chatId, "🧸 Teddy Manager\nTopshiriqni yozing. Men kerakli agentga beraman.", incoming.businessConnectionId);
    return;
  }

  const route = routeTask(instruction);
  await sendMessage(
    incoming.chatId,
    `🧸 Teddy Manager\nQabul qilindi. ${route.map(key => AGENTS[key].name).join(" → ")} ishlaydi.`,
    incoming.businessConnectionId
  );

  let previous = "";
  for (const agentKey of route) {
    await sendMessage(incoming.chatId, assignmentLine(agentKey, instruction), incoming.businessConnectionId);

    let context = previous;
    if (agentKey === "analyst") {
      const live = await analystContext(instruction);
      context = [previous, live].filter(Boolean).join("\n\n");
    }

    try {
      const result = await runAgent(agentKey, instruction, context);
      await sendAgentMessage(agentKey, incoming.chatId, result);
      previous = `${AGENTS[agentKey].name} output:\n${result}`;
    } catch (error) {
      console.error(`Agent ${agentKey} failed`, error);
      await sendAgentMessage(
        agentKey,
        incoming.chatId,
        `${AGENTS[agentKey].emoji} Hozir topshiriqni bajarishda texnik muammo chiqdi. Teddy Manager logni oldi.`
      ).catch(() => {});
      previous = `${AGENTS[agentKey].name} failed: ${error?.message || "unknown error"}`;
    }
  }

  await sendMessage(
    incoming.chatId,
    `🧸 Teddy Manager\n✅ Agentlar ishini tugatdi. Keyingi buyruqni shu yerga yozavering.`,
    incoming.businessConnectionId
  );
}
