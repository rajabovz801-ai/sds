from datetime import date, timedelta
from fastapi import FastAPI
app = FastAPI()
START = date(2026, 10, 1)
@app.get("/api/course")
def course():
    days=[]
    for i in range(60):
        d=START+timedelta(days=i)
        mock=d.weekday()==6
        days.append({"day":i+1,"date":str(d),"type":"full_mock" if mock else "regular","modules":["listening","reading","writing","speaking"] if mock else ["reading","listening","article","vocabulary","writing","speaking"]})
    return {"timezone":"Asia/Tashkent","start":"2026-10-01","end":"2026-11-29","days":days}
