"""ARK IELTS 60-day secure Python API (server-side Supabase, HttpOnly sessions)."""
import os
import re
import json
import hmac
import hashlib
import secrets
import unicodedata
from datetime import datetime, timedelta, date, timezone
from urllib.parse import urlencode
from urllib.request import Request as URLRequest, urlopen
from urllib.error import HTTPError, URLError
from zoneinfo import ZoneInfo
from fastapi import FastAPI, Request, Response, HTTPException

app = FastAPI(title="ARK IELTS 60-day API", version="1.1.0")
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "https://svdigxqdivcmljirjwhk.supabase.co").rstrip("/")
COOKIE = "ark60_session"
ADMIN_COOKIE = "ark60_admin"
TZ = ZoneInfo("Asia/Tashkent")
START = date(2026, 10, 1)
END = date(2026, 11, 29)
STUDENT_SESSION_DAYS = 365
SESSION_REFRESH_WINDOW = timedelta(days=60)
MODULES = {"reading","listening","article","vocabulary","writing","speaking"}
TARGET_BANDS = {6.0,6.5,7.0,7.5,8.0,8.5,9.0}

def now():
    return datetime.now(timezone.utc)

def today():
    return datetime.now(TZ).date()

def service_key():
    key = os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not key:
        raise HTTPException(status_code=503, detail="Database connection is not configured")
    return key

def db(method, endpoint, params=None, payload=None, prefer=None):
    key = service_key()
    url = SUPABASE_URL + "/rest/v1/" + endpoint
    if params:
        url += "?" + urlencode(params, doseq=True)
    headers = {"apikey": key,"Authorization": "Bearer " + key,"Accept": "application/json"}
    if payload is not None:
        headers["Content-Type"] = "application/json"
    if prefer:
        headers["Prefer"] = prefer
    encoded = json.dumps(payload).encode() if payload is not None else None
    req = URLRequest(url, data=encoded, headers=headers, method=method)
    try:
        with urlopen(req, timeout=12) as result:
            raw = result.read().decode()
            return json.loads(raw) if raw else []
    except HTTPError as error:
        raw=error.read().decode()[:300]
        if "INVALID_INVITE" in raw:
            raise HTTPException(status_code=400, detail="Invalid, expired or fully used invitation code")
        if error.code == 409 or "23505" in raw:
            raise HTTPException(status_code=409, detail="This username already exists. Please try again.")
        raise HTTPException(status_code=502, detail="Database operation failed")
    except (URLError,TimeoutError):
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()

def hash_password(password):
    salt=secrets.token_bytes(16)
    iters=260000
    hashed=hashlib.pbkdf2_hmac("sha256",password.encode(),salt,iters)
    return "pbkdf2_sha256$" + str(iters) + "$" + salt.hex() + "$" + hashed.hex()

def verify_password(password,stored):
    try:
        algo,iteration,salt,h=stored.split("$")
        if algo!="pbkdf2_sha256":return False
        candidate=hashlib.pbkdf2_hmac("sha256",password.encode(),bytes.fromhex(salt),int(iteration))
        return hmac.compare_digest(candidate,bytes.fromhex(h))
    except (ValueError,TypeError):
        return False

def client_ip(request):
    # Only use Vercel-provided forwarding headers for rate-limit grouping.
    return (request.headers.get("x-real-ip") or request.client.host if request.client else "unknown")[:70]

def rate_limit(request,action,increment=False):
    bucket=digest(action+":"+client_ip(request))
    rows=db("POST","rpc/ark60_check_rate",payload={"p_bucket":bucket,"p_increment":increment,"p_limit":6,"p_window_seconds":900})
    if rows and not rows[0].get("allowed",False):
        raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
    return bucket

def clear_limit(bucket):
    db("DELETE","ark60_auth_limits",params={"bucket":"eq."+bucket})

def cookie(response, name, token, days=30):
    response.set_cookie(key=name,value=token,httponly=True,secure=True,samesite="lax",max_age=days*86400,path="/")

def verify_origin(request):
    origin=request.headers.get("origin")
    if origin:
        expected=str(request.base_url).rstrip("/")
        if origin!=expected:
            raise HTTPException(status_code=403,detail="Invalid request origin")

def session_user(request):
    token=request.cookies.get(COOKIE,"")
    if not token:return None
    rows=db("GET","ark60_sessions",{"select":"student_id,expires_at,revoked_at","token_hash":"eq."+digest(token),"limit":1})
    if not rows or rows[0]["revoked_at"] or datetime.fromisoformat(rows[0]["expires_at"].replace("Z","+00:00"))<=now():
        return None
    user=db("GET","ark60_students",{"select":"id,first_name,last_name,username,target_band,status,created_at,date_of_birth,gender,english_level,exam_date","id":"eq."+rows[0]["student_id"],"limit":1})
    return user[0] if user and user[0]["status"]=="active" else None

def refresh_student_session(request,response,user):
    token=request.cookies.get(COOKIE,"")
    if not token:return
    rows=db("GET","ark60_sessions",{"select":"student_id,expires_at,revoked_at","token_hash":"eq."+digest(token),"limit":1})
    if not rows or rows[0].get("revoked_at") or rows[0].get("student_id")!=user.get("id"):return
    expires=datetime.fromisoformat(rows[0]["expires_at"].replace("Z","+00:00"))
    if expires-now()>SESSION_REFRESH_WINDOW:return
    renewed=now()+timedelta(days=STUDENT_SESSION_DAYS)
    try:
        db("PATCH","ark60_sessions",params={"token_hash":"eq."+digest(token)},payload={"expires_at":renewed.isoformat()},prefer="return=minimal")
    except HTTPException:
        return
    cookie(response,COOKIE,token,days=STUDENT_SESSION_DAYS)

def admin_auth(request):
    token=request.cookies.get(ADMIN_COOKIE,"")
    if not token:return None
    rows=db("GET","ark60_admin_sessions",{"select":"admin_id,expires_at,revoked_at","token_hash":"eq."+digest(token),"limit":1})
    if not rows or rows[0]["revoked_at"] is not None or datetime.fromisoformat(rows[0]["expires_at"].replace("Z","+00:00"))<=now():
        return None
    admin_id=rows[0].get("admin_id")
    if not admin_id:return None
    admins=db("GET","ark60_admins",{"select":"id,display_name,username,role,status,created_at","id":"eq."+admin_id,"limit":1})
    return admins[0] if admins and admins[0]["status"]=="active" else None

def require_student(request):
    student=session_user(request)
    if not student:
        raise HTTPException(status_code=401,detail="Please sign in.")
    return student

def require_admin(request):
    admin=admin_auth(request)
    if not admin:
        raise HTTPException(status_code=401,detail="Admin sign-in required.")
    return admin

def require_super_admin(request):
    admin=require_admin(request)
    if admin.get("role")!="super_admin":
        raise HTTPException(status_code=403,detail="Super admin access required.")
    return admin

def day_status(day_num):
    if day_num<1 or day_num>60:
        raise HTTPException(status_code=400,detail="Invalid course day")
    d=START+timedelta(days=day_num-1)
    if today()<d:
        raise HTTPException(status_code=403,detail="This day is not yet available")
    return d

def day_unlocked_for_user(user,day_num):
    if day_num<1 or day_num>60:
        return False
    if user.get("username")=="rustam7":
        return True
    d=START+timedelta(days=day_num-1)
    if today()<d:
        return False
    if day_num==1:
        return True
    rows=db("POST","rpc/ark60_student_dashboard_summary",payload={"p_student":user["id"],"p_today":str(today())})
    summary=rows[0] if isinstance(rows,list) and rows else (rows if isinstance(rows,dict) else {})
    required_by_day=summary.get("required_by_day") or {}
    completed=summary.get("completed") or []
    for prior_day in range(1,day_num):
        required=required_by_day.get(str(prior_day)) or []
        if not required:
            continue
        done={str(item.get("module")) for item in completed if int(item.get("day_number") or 0)==prior_day}
        if any(str(module) not in done for module in required):
            return False
    return True

@app.get("/api/ark60")
def get_data(request:Request,response:Response, action:str="health", day:int=1):
    if action=="health":
        return {"ok":True,"backend":"python-fastapi","database_configured":bool(os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")),"database_host":SUPABASE_URL.split("/")[2],"admin_storage_ready":bool(db("GET","ark60_admins",{"select":"id","status":"eq.active","limit":1}))}
    if action=="username_available":
        candidate=str(request.query_params.get("username","")).strip().lower()
        valid=bool(re.fullmatch(r"[a-z][a-z0-9._-]{3,23}",candidate))
        if not valid:
            return {"valid":False,"available":False,"message":"Use 4–24 characters, start with a letter; letters, digits, dots, underscores and hyphens only."}
        # Reserve usernames already used by students (including archived ones) or admins.
        students=db("GET","ark60_students",{"select":"id","username":"eq."+candidate,"limit":1})
        admins=db("GET","ark60_admins",{"select":"id","username":"eq."+candidate,"limit":1})
        free=not students and not admins
        return {"valid":True,"available":free,"message":"Available" if free else "Username already taken"}
    if action=="me":
        user=require_student(request)
        refresh_student_session(request,response,user)
        rows=db("POST","rpc/ark60_student_dashboard_summary",payload={"p_student":user["id"],"p_today":str(today())})
        summary=rows[0] if isinstance(rows,list) and rows else (rows if isinstance(rows,dict) else {})
        preview=user.get("username")=="rustam7"
        return {
            "student":user,
            "active_seconds":0 if preview else int(summary.get("active_seconds") or 0),
            "today_seconds":0 if preview else int(summary.get("today_seconds") or 0),
            "by_module":({m:0 for m in sorted(MODULES)} if preview else (summary.get("by_module") or {m:0 for m in sorted(MODULES)})),
            "completed":[] if preview else (summary.get("completed") or []),
            "coins":0 if preview else int(summary.get("coins") or 0),
            "required_by_day":summary.get("required_by_day") or {},
            "preview":preview
        }
    if action=="reward_center":
        user=require_student(request)
        preview=user.get("username")=="rustam7"
        if preview:
            return {"balance":0,"claimed_today":False,"today_amount":0,"streak_day":0,"next_amount":1,"history":[],"preview":True}
        rows=db("POST","rpc/ark60_reward_center",payload={"p_student":user["id"],"p_today":str(today())})
        center=rows[0] if isinstance(rows,list) and rows else (rows if isinstance(rows,dict) else {})
        center["preview"]=False
        return center
    if action=="leaderboard":
        user=require_student(request)
        period=str(request.query_params.get("period","all")).strip().lower()
        if period not in {"week","30d","all"}:
            raise HTTPException(status_code=400,detail="Invalid leaderboard period")
        local_today=today()
        start_date=None
        if period=="week":
            start_date=local_today-timedelta(days=local_today.weekday())
        elif period=="30d":
            start_date=local_today-timedelta(days=29)
        rows=db("POST","rpc/ark60_student_leaderboard_period",payload={"p_start":str(start_date) if start_date else None})
        board=rows if isinstance(rows,list) else []
        presence=[]
        try:
            presence=db("GET","ark60_presence",{"select":"student_id,last_seen_at,last_interaction_at","limit":500})
        except HTTPException:
            presence=[]
        pmap={x.get("student_id"):x for x in presence}
        stamp=now()
        current=None
        for idx,item in enumerate(board):
            item["rank"]=idx+1
            p=pmap.get(item.get("student_id")) or {}
            seen_age=10**9
            interaction_age=10**9
            try:
                if p.get("last_seen_at"):
                    seen_age=(stamp-datetime.fromisoformat(str(p.get("last_seen_at")).replace("Z","+00:00"))).total_seconds()
                if p.get("last_interaction_at"):
                    interaction_age=(stamp-datetime.fromisoformat(str(p.get("last_interaction_at")).replace("Z","+00:00"))).total_seconds()
            except (ValueError,TypeError):
                pass
            status="offline"
            if seen_age<=60:
                status="online" if interaction_age<=90 else "idle"
            item["status"]=status
            if item.get("student_id")==user["id"]:
                current=item
        return {
            "leaderboard":board,
            "current":current,
            "period":period,
            "period_start":str(start_date) if start_date else None,
            "preview":user.get("username")=="rustam7"
        }

    if action=="day":
        user=require_student(request)
        if day<1 or day>60:
            raise HTTPException(status_code=400,detail="Invalid course day")
        d=START+timedelta(days=day-1)
        if not day_unlocked_for_user(user,day):
            raise HTTPException(status_code=403,detail="Finish all required tasks from earlier days first")
        available=["listening","reading","writing","speaking"] if d.weekday()==6 else ["reading","listening","article","vocabulary","writing","speaking"]
        rows=db("GET","ark60_content",{"select":"module,title,payload","day_number":"eq."+str(day),"status":"eq.published","limit":6})
        return {"day":day,"date":str(d),"mock":d.weekday()==6,"modules":available,"published":rows,"preview":user.get("username")=="rustam7"}
    if action=="admin_me":
        return {"admin":require_admin(request)}
    if action=="admin_leaderboard":
        require_admin(request)
        rows=db("POST","rpc/ark60_leaderboard_snapshot",payload={})
        board=rows if isinstance(rows,list) else []
        for idx,item in enumerate(board):
            item["rank"]=idx+1
        return {"leaderboard":board}
    if action=="admin_live_activity":
        require_admin(request)
        students=db("GET","ark60_students",{"select":"id,first_name,last_name,username,status","status":"eq.active","username":"neq.rustam7","order":"first_name.asc","limit":300})
        presence=db("GET","ark60_presence",{"select":"student_id,last_seen_at,last_interaction_at,current_area,day_number","limit":300})
        today_rows=db("GET","ark60_study_sessions",{"select":"student_id,day_number,module,active_seconds,last_active_at","study_date":"eq."+str(today()),"limit":3000})
        board=db("POST","rpc/ark60_leaderboard_snapshot",payload={})
        sessions=db("GET","ark60_sessions",{"select":"student_id,created_at,revoked_at","order":"created_at.desc","limit":1500})
        pmap={x.get("student_id"):x for x in presence}
        total_map={x.get("student_id"):int(x.get("active_seconds") or 0) for x in (board if isinstance(board,list) else [])}
        today_map={}
        module_map={}
        for row in today_rows:
            sid=row.get("student_id")
            sec=int(row.get("active_seconds") or 0)
            today_map[sid]=today_map.get(sid,0)+sec
            prev=module_map.get(sid)
            if not prev or str(row.get("last_active_at") or "")>str(prev.get("last_active_at") or ""):
                module_map[sid]=row
        login_map={}
        logout_map={}
        for row in sessions:
            sid=row.get("student_id")
            if sid not in login_map: login_map[sid]=row.get("created_at")
            if row.get("revoked_at") and sid not in logout_map: logout_map[sid]=row.get("revoked_at")
        stamp=now()
        items=[]
        for student in students:
            sid=student.get("id")
            p=pmap.get(sid) or {}
            last_seen=p.get("last_seen_at")
            last_interaction=p.get("last_interaction_at")
            seen_age=10**9
            interaction_age=10**9
            try:
                if last_seen: seen_age=(stamp-datetime.fromisoformat(str(last_seen).replace("Z","+00:00"))).total_seconds()
                if last_interaction: interaction_age=(stamp-datetime.fromisoformat(str(last_interaction).replace("Z","+00:00"))).total_seconds()
            except (ValueError,TypeError):
                pass
            status="offline"
            if seen_age<=60:
                status="online" if interaction_age<=90 else "idle"
            latest=module_map.get(sid) or {}
            items.append({
                "student_id":sid,
                "full_name":(str(student.get("first_name") or "")+" "+str(student.get("last_name") or "")).strip() or "Student",
                "username":student.get("username") or "student",
                "status":status,
                "current_area":p.get("current_area") or (str(latest.get("module") or "").title() if latest else "Offline"),
                "day_number":p.get("day_number") or latest.get("day_number"),
                "last_seen_at":last_seen,
                "last_interaction_at":last_interaction,
                "today_seconds":today_map.get(sid,0),
                "total_seconds":total_map.get(sid,0),
                "last_login_at":login_map.get(sid),
                "last_logout_at":logout_map.get(sid)
            })
        order={"online":0,"idle":1,"offline":2}
        items.sort(key=lambda x:(order.get(x["status"],3),-(datetime.fromisoformat(str(x["last_seen_at"]).replace("Z","+00:00")).timestamp() if x.get("last_seen_at") else 0)))
        return {"activity":items,"online_now":sum(1 for x in items if x["status"]=="online"),"idle_now":sum(1 for x in items if x["status"]=="idle")}
    if action=="admin_notifications":
        require_admin(request)
        cutoff=(now()-timedelta(hours=72)).isoformat()
        writing=db("GET","ark60_submissions",{"select":"id,student_id,day_number,submitted_at","module":"eq.writing","review_status":"eq.pending","submitted_at":"gte."+cutoff,"order":"submitted_at.desc","limit":200})
        speaking=db("GET","ark60_speaking_attempts",{"select":"id,student_id,day_number,submitted_at,expires_at","status":"eq.submitted","review_status":"eq.pending","expires_at":"gt."+now().isoformat(),"order":"submitted_at.desc","limit":200})
        student_ids=list({x.get("student_id") for x in writing+speaking if x.get("student_id")})
        student_rows=db("GET","ark60_students",{"select":"id,first_name,last_name,username","id":"in.("+",".join(student_ids)+")","limit":300}) if student_ids else []
        by_id={x.get("id"):x for x in student_rows if str(x.get("username") or "").lower()!="rustam7"}
        notes=[]
        for module,rows2 in (("writing",writing),("speaking",speaking)):
            for row in rows2:
                student=by_id.get(row.get("student_id"))
                if not student: continue
                submitted=str(row.get("submitted_at") or "")
                expires=row.get("expires_at")
                if not expires and submitted:
                    try: expires=(datetime.fromisoformat(submitted.replace("Z","+00:00"))+timedelta(hours=72)).isoformat()
                    except ValueError: expires=None
                notes.append({
                    "id":row.get("id"),"module":module,"day_number":row.get("day_number"),
                    "student_name":(str(student.get("first_name") or "")+" "+str(student.get("last_name") or "")).strip(),
                    "username":student.get("username"),"submitted_at":row.get("submitted_at"),"expires_at":expires
                })
        notes.sort(key=lambda x:str(x.get("submitted_at") or ""),reverse=True)
        return {"notifications":notes}
    if action=="admin_dashboard":
        admin=require_admin(request)
        rows=db("POST","rpc/ark60_admin_dashboard_summary",payload={"p_today":str(today())})
        summary=rows[0] if isinstance(rows,list) and rows else (rows if isinstance(rows,dict) else {})
        cutoff=(now()-timedelta(hours=72)).isoformat()
        writing=db("GET","ark60_submissions",{"select":"student_id","module":"eq.writing","review_status":"eq.pending","submitted_at":"gte."+cutoff,"limit":500})
        speaking=db("GET","ark60_speaking_attempts",{"select":"student_id","status":"eq.submitted","review_status":"eq.pending","expires_at":"gt."+now().isoformat(),"limit":500})
        preview_rows=db("GET","ark60_students",{"select":"id","username":"eq.rustam7","limit":1})
        preview_id=preview_rows[0].get("id") if preview_rows else None
        presence=db("GET","ark60_presence",{"select":"last_seen_at,last_interaction_at","limit":500})
        stamp=now()
        online_now=0
        idle_now=0
        for row in presence:
            try:
                seen=(stamp-datetime.fromisoformat(str(row.get("last_seen_at")).replace("Z","+00:00"))).total_seconds()
                interaction=(stamp-datetime.fromisoformat(str(row.get("last_interaction_at")).replace("Z","+00:00"))).total_seconds()
            except (ValueError,TypeError):
                continue
            if seen<=60:
                if interaction<=90: online_now+=1
                else: idle_now+=1
        return {
            "admin":admin,
            "students":summary.get("students") or [],
            "total_students":int(summary.get("total_students") or 0),
            "active_today":int(summary.get("active_today") or 0),
            "today_seconds":int(summary.get("today_seconds") or 0),
            "pending_writing":sum(1 for x in writing if x.get("student_id")!=preview_id),
            "pending_speaking":sum(1 for x in speaking if x.get("student_id")!=preview_id),
            "pending_requests":int(summary.get("pending_requests") or 0),
            "online_now":online_now,
            "idle_now":idle_now
        }
    if action=="admin_content":
        require_admin(request)
        if day<1 or day>60:
            raise HTTPException(status_code=400,detail="Invalid course day")
        reading=db("GET","ark60_reading_passages",{"select":"status,title","day_number":"eq."+str(day),"limit":10})
        articles=db("GET","ark60_articles",{"select":"status,title","day_number":"eq."+str(day),"limit":5})
        vocab=db("GET","ark60_vocab_units",{"select":"status,source_title","day_number":"eq."+str(day),"limit":20})
        generic=db("GET","ark60_content",{"select":"module,status,title","day_number":"eq."+str(day),"limit":10})
        def state(rows,expected=None):
            published=sum(1 for x in rows if x.get("status")=="published")
            drafts=sum(1 for x in rows if x.get("status")=="draft")
            total=len(rows)
            ready=published>0 and (expected is None or published>=expected) and drafts==0
            return {"status":"Published" if ready else ("Draft" if total else "Missing"),"published":published,"drafts":drafts,"total":total}
        modules={
            "Reading":state(reading,2),
            "Article":state(articles,1),
            "Vocabulary":state(vocab,6)
        }
        for name in ("Listening","Writing","Speaking"):
            rows=[x for x in generic if x.get("module")==name.lower()]
            modules[name]=state(rows,1)
        return {"day":day,"modules":modules}
    if action=="admin_admins":
        admin=require_super_admin(request)
        rows=db("GET","ark60_admins",{"select":"id,display_name,username,role,status,created_at","order":"created_at.asc","limit":200})
        return {"admin":admin,"admins":rows}
    if action=="admin_requests":
        admin=require_admin(request)
        rows=db("GET","ark60_students",{"select":"id,first_name,last_name,username,target_band,status,created_at,reviewed_at,review_note","status":"in.(pending,active,rejected)","order":"created_at.desc","limit":200})
        return {"admin":admin,"requests":rows}
    raise HTTPException(status_code=404,detail="Unknown action")

@app.post("/api/ark60")
async def actions(request:Request,response:Response):
    verify_origin(request)
    raw=await request.body()
    if len(raw)>12000:raise HTTPException(status_code=413,detail="Payload too large")
    try:
        data=json.loads(raw)
    except (TypeError,ValueError):
        raise HTTPException(status_code=400,detail="Invalid JSON")
    action=data.get("action","")
    if action=="register":
        # Students request admission. An admin must approve before sign-in is allowed.
        bucket=rate_limit(request,"register")
        first=str(data.get("first_name","")).strip()
        last=str(data.get("last_name","")).strip()
        pwd=str(data.get("password",""))
        username=str(data.get("username","")).strip().lower()
        try: band=float(data.get("target_band",0))
        except (ValueError,TypeError): band=0
        if not (1<=len(first)<=55 and 1<=len(last)<=55 and 8<=len(pwd)<=128 and band in TARGET_BANDS):
            raise HTTPException(status_code=400,detail="Enter your name, IELTS target and a password with at least 8 characters.")
        if not re.fullmatch(r"[a-z][a-z0-9._-]{3,23}",username):
            raise HTTPException(status_code=400,detail="Choose a username of 4–24 characters that starts with a letter.")
        rate_limit(request,"register",True)
        # Recheck on submission; the live availability indicator is informative only.
        reserved=db("GET","ark60_admins",{"select":"id","username":"eq."+username,"limit":1})
        existing=db("GET","ark60_students",{"select":"id","username":"eq."+username,"limit":1})
        if reserved or existing:
            raise HTTPException(status_code=409,detail="Username is unavailable. Please choose another.")
        rows=db("POST","ark60_students",payload={"first_name":first,"last_name":last,"username":username,"password_hash":hash_password(pwd),"target_band":band,"status":"pending"},prefer="return=representation")
        if not rows:raise HTTPException(status_code=502,detail="Could not submit registration request")
        # Keep successful registrations in the rate bucket too; otherwise one IP can
        # create unlimited valid pending accounts by clearing the limiter on every success.
        return {"ok":True,"username":username,"target_band":band,"status":"pending","message":"Registration request sent. Save your username and wait for admin approval."}
    if action=="login":
        # One login form for students, admins and the single Super Admin.
        # Resolve the role using a protected database lookup, not client-supplied roles.
        bucket=rate_limit(request,"login")
        username=str(data.get("username","")).strip().lower()
        pwd=str(data.get("password",""))
        if not (3<=len(username)<=48 and 1<=len(pwd)<=128):
            raise HTTPException(status_code=400,detail="Invalid username or password")

        admins=db("GET","ark60_admins",{"select":"id,display_name,username,password_hash,role,status","username":"eq."+username,"limit":1})
        if admins:
            account=admins[0]
            if account["status"]!="active" or not verify_password(pwd.strip(),account["password_hash"]):
                rate_limit(request,"login",True)
                raise HTTPException(status_code=401,detail="Invalid username or password")
            token=secrets.token_urlsafe(40)
            db("POST","ark60_admin_sessions",payload={"token_hash":digest(token),"admin_id":account["id"],"expires_at":(now()+timedelta(hours=12)).isoformat()},prefer="return=minimal")
            cookie(response,ADMIN_COOKIE,token,days=1)
            response.delete_cookie(COOKIE,path="/")
            clear_limit(bucket)
            return {"ok":True,"role":account["role"],"redirect":"/admin","admin":{"display_name":account["display_name"],"role":account["role"]}}

        rows=db("GET","ark60_students",{"select":"id,username,password_hash,status","username":"eq."+username,"limit":1})
        if not rows or not verify_password(pwd,rows[0]["password_hash"]):
            rate_limit(request,"login",True)
            raise HTTPException(status_code=401,detail="Invalid username or password")
        if rows[0]["status"]=="pending":
            raise HTTPException(status_code=403,detail="Your registration request is awaiting admin approval.")
        if rows[0]["status"]=="rejected":
            raise HTTPException(status_code=403,detail="Your registration request was declined. Please contact ARK Education.")
        if rows[0]["status"]!="active":
            raise HTTPException(status_code=403,detail="This account is not currently active.")
        token=secrets.token_urlsafe(40)
        db("POST","ark60_sessions",payload={"token_hash":digest(token),"student_id":rows[0]["id"],"expires_at":(now()+timedelta(days=STUDENT_SESSION_DAYS)).isoformat()},prefer="return=minimal")
        cookie(response,COOKIE,token,days=STUDENT_SESSION_DAYS)
        response.delete_cookie(ADMIN_COOKIE,path="/")
        clear_limit(bucket)
        return {"ok":True,"role":"student","redirect":"/dashboard","username":rows[0]["username"]}
    if action=="logout":
        token=request.cookies.get(COOKIE)
        if token:
            db("PATCH","ark60_sessions",params={"token_hash":"eq."+digest(token)},payload={"revoked_at":now().isoformat()},prefer="return=minimal")
        response.delete_cookie(COOKIE,path="/")
        return {"ok":True}
    if action=="logout_all":
        user=require_student(request)
        db("PATCH","ark60_sessions",params={"student_id":"eq."+user["id"],"revoked_at":"is.null"},payload={"revoked_at":now().isoformat()},prefer="return=minimal")
        response.delete_cookie(COOKIE,path="/")
        return {"ok":True}
    if action=="claim_daily_reward":
        user=require_student(request)
        if user.get("username")=="rustam7":
            return {"ok":True,"claimed":True,"preview":True,"streak_day":1,"amount":1,"balance":0,"next_amount":2}
        rows=db("POST","rpc/ark60_claim_daily_reward",payload={"p_student":user["id"],"p_today":str(today())})
        reward=rows[0] if isinstance(rows,list) and rows else (rows if isinstance(rows,dict) else {})
        return reward
    if action=="update_profile":
        user=require_student(request)
        first=str(data.get("first_name","")).strip()
        last=str(data.get("last_name","")).strip()
        dob=str(data.get("date_of_birth","")).strip()
        gender=str(data.get("gender","")).strip()
        level=str(data.get("english_level","")).strip().upper()
        exam=str(data.get("exam_date","")).strip()
        try: band=float(data.get("target_band",0))
        except (TypeError,ValueError): band=0
        if not (1<=len(first)<=55 and 1<=len(last)<=55):
            raise HTTPException(status_code=400,detail="Enter your first and last name.")
        if gender and gender not in {"male","female","prefer_not_to_say"}:
            raise HTTPException(status_code=400,detail="Choose a valid gender option.")
        if level and level not in {"A1","A2","B1","B2","C1","C2"}:
            raise HTTPException(status_code=400,detail="Choose a valid English level.")
        if band not in TARGET_BANDS:
            raise HTTPException(status_code=400,detail="Choose a valid target band.")
        dob_date=None
        exam_date=None
        if dob:
            try: dob_date=date.fromisoformat(dob)
            except ValueError: raise HTTPException(status_code=400,detail="Choose a valid date of birth.")
            if dob_date>=today() or dob_date<date(1940,1,1):
                raise HTTPException(status_code=400,detail="Choose a valid date of birth.")
        if exam:
            try: exam_date=date.fromisoformat(exam)
            except ValueError: raise HTTPException(status_code=400,detail="Choose a valid IELTS exam date.")
            if exam_date<today()-timedelta(days=1) or exam_date>today()+timedelta(days=1095):
                raise HTTPException(status_code=400,detail="Choose a realistic IELTS exam date.")
        payload={
            "first_name":first,
            "last_name":last,
            "date_of_birth":dob or None,
            "gender":gender or None,
            "english_level":level or None,
            "target_band":band,
            "exam_date":exam or None
        }
        updated=db("PATCH","ark60_students",params={"id":"eq."+user["id"]},payload=payload,prefer="return=representation")
        if not updated:raise HTTPException(status_code=502,detail="Could not update your profile.")
        saved=updated[0]
        complete=bool(saved.get("first_name") and saved.get("last_name") and saved.get("date_of_birth") and saved.get("gender") and saved.get("english_level") and saved.get("target_band") and saved.get("exam_date"))
        bonus=False
        if complete and user.get("username")!="rustam7":
            try:
                inserted=db("POST","ark60_coin_events",params={"on_conflict":"student_id,day_number,module,kind"},payload={"student_id":user["id"],"day_number":1,"module":"profile","kind":"profile_bonus","amount":1},prefer="resolution=ignore-duplicates,return=representation")
                bonus=bool(inserted)
            except Exception:
                bonus=False
        return {"ok":True,"student":saved,"profile_complete":complete,"profile_bonus_awarded":bonus}

    if action=="admin_login":
        bucket=rate_limit(request,"admin_login")
        username=str(data.get("username","")).strip().lower()
        pwd=str(data.get("password","")).strip()
        if not (3<=len(username)<=48 and 1<=len(pwd)<=128):
            raise HTTPException(status_code=400,detail="Invalid admin username or password")
        rows=db("GET","ark60_admins",{"select":"id,display_name,username,password_hash,role,status","username":"eq."+username,"limit":1})
        if not rows or rows[0]["status"]!="active" or not verify_password(pwd,rows[0]["password_hash"]):
            rate_limit(request,"admin_login",True)
            raise HTTPException(status_code=401,detail="Invalid admin username or password")
        token=secrets.token_urlsafe(40)
        db("POST","ark60_admin_sessions",payload={"token_hash":digest(token),"admin_id":rows[0]["id"],"expires_at":(now()+timedelta(hours=12)).isoformat()},prefer="return=minimal")
        cookie(response,ADMIN_COOKIE,token,days=1)
        clear_limit(bucket)
        return {"ok":True,"admin":{"id":rows[0]["id"],"display_name":rows[0]["display_name"],"username":rows[0]["username"],"role":rows[0]["role"]}}
    if action=="admin_logout":
        require_admin(request)
        token=request.cookies.get(ADMIN_COOKIE)
        db("PATCH","ark60_admin_sessions",params={"token_hash":"eq."+digest(token)},payload={"revoked_at":now().isoformat()},prefer="return=minimal")
        response.delete_cookie(ADMIN_COOKIE,path="/")
        return {"ok":True}
    if action=="review_request":
        actor=require_admin(request)
        student_id=str(data.get("student_id","")).strip()
        decision=str(data.get("decision","")).strip()
        note=str(data.get("note","")).strip()[:400]
        if not re.fullmatch(r"[0-9a-fA-F-]{36}",student_id) or decision not in {"approve","reject"}:
            raise HTTPException(status_code=400,detail="Invalid request or decision")
        target=db("GET","ark60_students",{"select":"id,status","id":"eq."+student_id,"limit":1})
        if not target:
            raise HTTPException(status_code=404,detail="Registration request not found")
        if target[0]["status"]!="pending":
            raise HTTPException(status_code=409,detail="This request has already been reviewed")
        final_status="active" if decision=="approve" else "rejected"
        updated=db("PATCH","ark60_students",params={"id":"eq."+student_id,"status":"eq.pending"},payload={"status":final_status,"reviewed_by":actor["id"],"reviewed_at":now().isoformat(),"review_note":note or None},prefer="return=representation")
        if not updated:
            raise HTTPException(status_code=409,detail="This request was already reviewed")
        return {"ok":True,"student_id":student_id,"status":final_status}
    if action=="delete_student":
        actor=require_admin(request)
        student_id=str(data.get("student_id","")).strip()
        if not re.fullmatch(r"[0-9a-fA-F-]{36}",student_id):
            raise HTTPException(status_code=400,detail="Invalid student")
        target=db("GET","ark60_students",{"select":"id,username,status","id":"eq."+student_id,"limit":1})
        if not target or target[0]["status"]=="deleted":
            raise HTTPException(status_code=404,detail="Student was not found")
        # Archive the account and revoke active sessions. Keep results for audit.
        changed=db("PATCH","ark60_students",params={"id":"eq."+student_id,"status":"neq.deleted"},payload={"status":"deleted","deleted_at":now().isoformat(),"deleted_by":actor["id"]},prefer="return=representation")
        if not changed:
            raise HTTPException(status_code=409,detail="Student was already removed")
        db("PATCH","ark60_sessions",params={"student_id":"eq."+student_id,"revoked_at":"is.null"},payload={"revoked_at":now().isoformat()},prefer="return=minimal")
        return {"ok":True,"student_id":student_id,"status":"deleted","message":"Student removed; access revoked and learning history retained."}
    if action=="create_admin":
        actor=require_super_admin(request)
        name=str(data.get("display_name","")).strip()
        username=str(data.get("username","")).strip().lower()
        pwd=str(data.get("password",""))
        if not (2<=len(name)<=60 and re.fullmatch(r"[a-z0-9._-]{3,32}",username) and 10<=len(pwd)<=128):
            raise HTTPException(status_code=400,detail="Use a name, 3–32 character username and password with at least 10 characters.")
        existing=db("GET","ark60_admins",{"select":"id","username":"eq."+username,"limit":1})
        student_name=db("GET","ark60_students",{"select":"id","username":"eq."+username,"limit":1})
        if existing or student_name:raise HTTPException(status_code=409,detail="That username is already reserved.")
        rows=db("POST","ark60_admins",payload={"display_name":name,"username":username,"password_hash":hash_password(pwd),"role":"admin","status":"active","created_by":actor["id"]},prefer="return=representation")
        item=rows[0] if rows else None
        return {"ok":True,"admin":{"id":item["id"],"display_name":item["display_name"],"username":item["username"],"role":item["role"],"status":item["status"]}}
    if action=="set_admin_status":
        actor=require_super_admin(request)
        admin_id=str(data.get("admin_id","")).strip()
        status=str(data.get("status","")).strip()
        if status not in {"active","disabled"}:raise HTTPException(status_code=400,detail="Invalid admin status")
        if admin_id==actor["id"]:raise HTTPException(status_code=400,detail="You cannot disable your own super-admin account.")
        target=db("GET","ark60_admins",{"select":"id,role","id":"eq."+admin_id,"limit":1})
        if not target:raise HTTPException(status_code=404,detail="Admin not found")
        if target[0]["role"]=="super_admin":raise HTTPException(status_code=403,detail="Another super-admin account cannot be changed here.")
        db("PATCH","ark60_admins",params={"id":"eq."+admin_id},payload={"status":status,"updated_at":now().isoformat()},prefer="return=minimal")
        if status=="disabled":
            db("PATCH","ark60_admin_sessions",params={"admin_id":"eq."+admin_id,"revoked_at":"is.null"},payload={"revoked_at":now().isoformat()},prefer="return=minimal")
        return {"ok":True,"status":status}
    if action=="presence":
        user=require_student(request)
        if user.get("username")=="rustam7":
            return {"ok":True,"preview":True}
        area=str(data.get("area") or "Dashboard").strip().title()
        allowed={"Dashboard","Day","Notifications","Reading","Listening","Article","Vocabulary","Writing","Speaking"}
        if area not in allowed:
            area="Dashboard"
        day=data.get("day")
        if day is not None and (not isinstance(day,int) or day<1 or day>60):
            day=None
        stamp=now()
        interaction_raw=str(data.get("last_interaction_at") or "")
        interaction=stamp
        try:
            parsed=datetime.fromisoformat(interaction_raw.replace("Z","+00:00"))
            if abs((stamp-parsed).total_seconds())<=300:
                interaction=parsed
        except (ValueError,TypeError):
            pass
        payload={"student_id":user["id"],"last_seen_at":stamp.isoformat(),"last_interaction_at":interaction.isoformat(),"current_area":area,"day_number":day,"updated_at":stamp.isoformat()}
        db("POST","ark60_presence",params={"on_conflict":"student_id"},payload=payload,prefer="resolution=merge-duplicates,return=minimal")
        return {"ok":True}
    if action=="heartbeat":
        user=require_student(request)
        day=data.get("day")
        module=data.get("module")
        if not isinstance(day,int) or module not in MODULES:
            raise HTTPException(status_code=400,detail="Invalid module")
        if user.get("username")=="rustam7":
            return {"ok":True,"preview":True,"added_seconds":0}
        day_status(day)
        today_d=today()
        # Record actual date of activity, not the original course date for late work.
        if module=="reading":
            content=db("GET","ark60_reading_passages",{"select":"id","day_number":"eq."+str(day),"status":"eq.published","limit":1})
        elif module=="article":
            content=db("GET","ark60_articles",{"select":"id","day_number":"eq."+str(day),"status":"eq.published","limit":1})
        elif module=="vocabulary":
            content=db("GET","ark60_vocab_units",{"select":"id","day_number":"eq."+str(day),"status":"eq.published","limit":1})
        else:
            content=db("GET","ark60_content",{"select":"id","day_number":"eq."+str(day),"module":"eq."+module,"status":"eq.published","limit":1})
        if not content:raise HTTPException(status_code=403,detail="This module is not yet available")
        # A heartbeat can add at most 20 seconds every 18 seconds per module.
        rows=db("GET","ark60_study_sessions",{"select":"id,last_active_at,active_seconds","student_id":"eq."+user["id"],"study_date":"eq."+str(today_d),"day_number":"eq."+str(day),"module":"eq."+module,"order":"last_active_at.desc","limit":1})
        if rows:
            last=datetime.fromisoformat(rows[0]["last_active_at"].replace("Z","+00:00"))
            elapsed=(now()-last).total_seconds()
            if elapsed<18: return {"ok":True,"added_seconds":0}
            added=min(20,int(elapsed))
            db("PATCH","ark60_study_sessions",params={"id":"eq."+rows[0]["id"],"last_active_at":"eq."+rows[0]["last_active_at"]},payload={"active_seconds":int(rows[0]["active_seconds"])+added,"last_active_at":now().isoformat()},prefer="return=minimal")
            return {"ok":True,"added_seconds":added}
        db("POST","ark60_study_sessions",payload={"student_id":user["id"],"study_date":str(today_d),"day_number":day,"module":module,"active_seconds":0},prefer="return=minimal")
        return {"ok":True,"added_seconds":0}
    raise HTTPException(status_code=404,detail="Unknown action")
