import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQuiz, reviewQuizContent } from '../ark-writing-bot/lib/agents/openai.js';
const q = text => ({question:text,options:['is','are','am','be'],correct_option_id:0,explanation:'Singular subject.'});
test('duplicate generation reaches Checker and is repaired', async () => {
 const original = global.fetch; const key = process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY='test';
 const replies=[{questions:[q('He ___ happy.'),q('He ___ happy.')]},{valid:true,questions:[q('He ___ happy.'),q('She ___ tired.')]}];
 global.fetch=async()=>({ok:true,json:async()=>({output_text:JSON.stringify(replies.shift())})});
 try { const result=await generateQuiz({topic:'Present Simple',count:2}); assert.equal(result.questions.length,2); assert.notEqual(result.questions[0].question,result.questions[1].question); assert.equal(replies.length,0); }
 finally {global.fetch=original; if(key===undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=key;}
});
test('Checker retries invalid duplicates with feedback', async () => {
 const original=global.fetch; const key=process.env.OPENAI_API_KEY; process.env.OPENAI_API_KEY='test'; let calls=0;
 global.fetch=async()=>({ok:true,json:async()=>({output_text:JSON.stringify({valid:true,questions:calls++===0?[q('He ___ happy.'),q('He ___ happy.')]:[q('He ___ happy.'),q('She ___ tired.')]})})});
 try {const result=await reviewQuizContent({questions:[q('He ___ happy.'),q('She ___ tired.')]});assert.equal(calls,2);assert.equal(result.questions.length,2);}
 finally {global.fetch=original;if(key===undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY=key;}
});
