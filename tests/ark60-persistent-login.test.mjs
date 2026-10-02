import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("landing restores a valid student or admin session before showing sign in",()=>{
  const page=read("app/page.tsx");
  assert.match(page,/\/api\/ark60\?action=me/);
  assert.match(page,/\/api\/ark60\?action=admin_me/);
  assert.match(page,/Checking your saved session/);
  assert.match(page,/if\(sessionStatus!=="signed-out"\)return/);
  assert.match(page,/window\.location\.replace\("\/dashboard"\)/);
  assert.match(page,/window\.location\.replace\("\/admin"\)/);
});

test("student remember-me sessions outlast the 60-day challenge and renew older sessions",()=>{
  const api=read("api/ark60.py");
  assert.match(api,/STUDENT_SESSION_DAYS\s*=\s*365/);
  assert.match(api,/timedelta\(days=STUDENT_SESSION_DAYS\)/);
  assert.match(api,/def refresh_student_session\(/);
  assert.match(api,/rows\[0\]\.get\("student_id"\)!=user\.get\("id"\)/);
  assert.match(api,/refresh_student_session\(request,response,user\)/);
  assert.match(api,/cookie\(response,COOKIE,token,days=STUDENT_SESSION_DAYS\)/);
});
