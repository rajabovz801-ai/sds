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
    user=db("GET","ark60_students",{"select":"id,first_name,last_name,username,target_band,status,created_at","id":"eq."+rows[0]["student_id"],"limit":1})
    return user[0] if user and user[0]["status"]=="active" else None

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

@app.get("/api/ark60")
def get_data(request:Request, action:str="health", day:int=1):
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
        totals=db("GET","ark60_study_sessions",{"select":"active_seconds,study_date,module,day_number","student_id":"eq."+user["id"],"limit":5000})
        completed=db("GET","ark60_submissions",{"select":"day_number,module,score,band,review_status","student_id":"eq."+user["id"],"limit":1000})
        coins=db("GET","ark60_coin_events",{"select":"amount","student_id":"eq."+user["id"],"limit":1000})
        return {"student":user,"active_seconds":sum(int(x["active_seconds"]) for x in totals),"today_seconds":sum(int(x["active_seconds"]) for x in totals if x["study_date"]==str(today())),"by_module":{m:sum(int(x["active_seconds"]) for x in totals if x["module"]==m) for m in sorted(MODULES)},"completed":completed,"coins":sum(int(x["amount"]) for x in coins)}
    if action=="day":
        require_student(request)
        d=day_status(day)
        available=["listening","reading","writing","speaking"] if d.weekday()==6 else ["reading","listening","article","vocabulary","writing","speaking"]
        rows=db("GET","ark60_content",{"select":"module,title,payload","day_number":"eq."+str(day),"status":"eq.published","limit":6})
        return {"day":day,"date":str(d),"mock":d.weekday()==6,"modules":available,"published":rows}
    if action=="admin_me":
        return {"admin":require_admin(request)}
    if action=="admin_dashboard":
        admin=require_admin(request)
        students=db("GET","ark60_students",{"select":"id,first_name,last_name,username,target_band,status,created_at","status":"neq.deleted","limit":2000})
        hours=db("GET","ark60_study_sessions",{"select":"student_id,active_seconds,study_date,module","limit":20000})
        pending=db("GET","ark60_submissions",{"select":"module,review_status","review_status":"eq.pending","limit":1000})
        by_student={x["id"]:{"id":x["id"],"first_name":x["first_name"],"last_name":x["last_name"],"username":x["username"],"target_band":x["target_band"],"status":x["status"],"created_at":x["created_at"],"today_seconds":0,"total_seconds":0} for x in students}
        for h in hours:
            item=by_student.get(h["student_id"])
            if item:
                item["total_seconds"]+=int(h["active_seconds"])
                if h["study_date"]==str(today()):item["today_seconds"]+=int(h["active_seconds"])
        return {"admin":admin,"students":list(by_student.values()),"total_students":len(students),"active_today":sum(1 for x in by_student.values() if x["today_seconds"]>0),"today_seconds":sum(x["today_seconds"] for x in by_student.values()),"pending_writing":sum(1 for x in pending if x["module"]=="writing"),"pending_speaking":sum(1 for x in pending if x["module"]=="speaking"),"pending_requests":sum(1 for x in students if x["status"]=="pending")}
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
        clear_limit(bucket)
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
        db("POST","ark60_sessions",payload={"token_hash":digest(token),"student_id":rows[0]["id"],"expires_at":(now()+timedelta(days=30)).isoformat()},prefer="return=minimal")
        cookie(response,COOKIE,token)
        response.delete_cookie(ADMIN_COOKIE,path="/")
        clear_limit(bucket)
        return {"ok":True,"role":"student","redirect":"/dashboard","username":rows[0]["username"]}
    if action=="logout":
        token=request.cookies.get(COOKIE)
        if token:
            db("PATCH","ark60_sessions",params={"token_hash":"eq."+digest(token)},payload={"revoked_at":now().isoformat()},prefer="return=minimal")
        response.delete_cookie(COOKIE,path="/")
        return {"ok":True}
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
    if action=="heartbeat":
        user=require_student(request)
        day=data.get("day")
        module=data.get("module")
        if not isinstance(day,int) or module not in MODULES:
            raise HTTPException(status_code=400,detail="Invalid module")
        d=day_status(day)
        today_d=today()
        # Record actual date of activity, not the original course date for late work.
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
