from datetime import date, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="ARK IELTS API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["https://arkielts.vercel.app"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

START = date(2026, 10, 1)
END = date(2026, 11, 29)

@app.get("/api/health")
def health():
    return {"ok": True, "service": "ark-ielts-python", "course_start": str(START), "course_end": str(END)}

@app.get("/api/course/plan")
def course_plan():
    days = []
    for i in range(60):
        d = START + timedelta(days=i)
        mock = d.weekday() == 6
        days.append({"day": i + 1, "date": str(d), "type": "full_mock" if mock else "regular", "modules": ["listening","reading","writing","speaking"] if mock else ["reading","listening","article","vocabulary","writing","speaking"], "locked": date.today() < d})
    return {"start": str(START), "end": str(END), "timezone": "Asia/Tashkent", "days": days}

@app.get("/api/course/rules")
def course_rules():
    return {"unlock":"calendar_date","future_access":False,"late_work":{"allowed":True,"coins":False,"streak":False},"writing_rotation":["task_1","task_2"],"sunday":"full_mock_only","mock_order":["listening","reading","writing","speaking"],"mock_breaks":False,"study_time":"active_platform_time_only","coins":"completion_plus_performance_bonus"}
