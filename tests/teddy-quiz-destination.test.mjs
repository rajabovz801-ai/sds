import test from 'node:test';
import assert from 'node:assert/strict';
import { requestsExternalGroup } from '../ark-writing-bot/lib/agents/material-standards.mjs';
test('current staff chat does not trigger student group selection',()=>{
 for(const text of ['30 ta test; shu staff guruhiga alohida spoilerda yubor','shu guruhga yubor','shu yerga yoz','shu chatga yubor']) assert.equal(requestsExternalGroup(text),false,text);
 assert.equal(requestsExternalGroup('909 guruhiga yubor'),true);
 assert.equal(requestsExternalGroup('IELTS groupga send'),true);
 assert.equal(requestsExternalGroup('PDFni 909 guruhga yubor; javoblarni shu staff guruhiga yubor'),true);
});
