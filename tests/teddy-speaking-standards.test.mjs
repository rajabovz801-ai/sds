import test from "node:test";
import assert from "node:assert/strict";
import { isSpeakingMaterialRequest, buildSpeakingMaterialPrompt } from "../ark-writing-bot/lib/agents/speaking-standards.mjs";

test("simple Uzbek Speaking requests are recognized without group delivery wording", () => {
  assert.equal(isSpeakingMaterialRequest("Speaking mavzu ber"), true);
  assert.equal(isSpeakingMaterialRequest("bugunga B2 speaking topic tayyorlab ber"), true);
  assert.equal(isSpeakingMaterialRequest("grammar mavzusini tushuntir"), false);
});

test("Speaking prompt asks for all three IELTS parts and the requested vocabulary pack", () => {
  const prompt = buildSpeakingMaterialPrompt("Travel", "Speaking mavzu ber");
  for (const required of ["Part 1", "Part 2", "Part 3", "10", "B2+/C1", "Useful phrases"]) {
    assert.ok(prompt.toLowerCase().includes(required.toLowerCase()), `missing ${required}`);
  }
  assert.match(prompt, /do not invent facts/i);
});
