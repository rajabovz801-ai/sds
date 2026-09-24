"use client";

import { useEffect, useMemo, useState } from "react";

type Task = {
  id: string;
  title: string;
  subtitle: string;
  minutes: number;
  tone: string;
};

const tasks: Task[] = [
  { id: "reading", title: "Reading passage", subtitle: "One passage, timed", minutes: 20, tone: "violet" },
  { id: "listening", title: "Listening practice", subtitle: "One section + check answers", minutes: 20, tone: "cyan" },
  { id: "writing", title: "Writing task", subtitle: "Write, review, improve", minutes: 40, tone: "amber" },
  { id: "vocabulary", title: "Vocabulary", subtitle: "New words + review", minutes: 10, tone: "green" },
  { id: "speaking", title: "Speaking practice", subtitle: "Record one answer", minutes: 15, tone: "pink" },
];

const weekdays = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function dateFor(day: number) {
  const start = new Date(2026, 9, 1);
  start.setDate(start.getDate() + day - 1);
  return start;
}

function shortDate(day: number) {
  const d = dateFor(day);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function longDate(day: number) {
  return dateFor(day).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export default function Home() {
  const [selectedDay, setSelectedDay] = useState(1);
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ark-60-progress");
      if (saved) setDone(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ark-60-progress", JSON.stringify(done));
    } catch {}
  }, [done]);

  const key = (day: number, task: string) => `${day}:${task}`;

  const completedDays = useMemo(() => {
    let total = 0;
    for (let day = 1; day <= 60; day++) {
      if (tasks.every((task) => done[key(day, task.id)])) total++;
    }
    return total;
  }, [done]);

  const selectedCompleted = tasks.filter((task) => done[key(selectedDay, task.id)]).length;
  const totalCompletedTasks = Object.values(done).filter(Boolean).length;

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">A</div>
          <div>
            <strong>ARK</strong>
            <span>MASTERY SYSTEM</span>
          </div>
        </div>

        <div className="sideLabel">HOME</div>
        <button className="navItem active"><span>⌂</span> Dashboard</button>

        <div className="sideLabel">MODULES</div>
        {["Listening", "Reading", "Writing", "Speaking", "Vocabulary"].map((item, i) => (
          <button className="navItem" key={item}><span>{i + 1}</span> {item}</button>
        ))}

        <div className="sideLabel">TRACK</div>
        <button className="navItem"><span>◎</span> Mock tests</button>
        <button className="navItem"><span>↗</span> My progress</button>
      </aside>

      <section className="content">
        <header className="topbar">
          <button className="menuBtn">☰</button>
          <div className="topProgress">
            <span>60-day journey</span>
            <div><i style={{ width: `${(completedDays / 60) * 100}%` }} /></div>
            <b>{completedDays}/60</b>
          </div>
          <div className="topActions">
            <button>EN</button>
            <div className="avatar">R</div>
          </div>
        </header>

        <div className="workspace">
          <div className="headlineRow">
            <div>
              <h1>🚀 Your 60-day plan</h1>
              <p>Every day has five focused tasks. Open the day, complete the work, tick it off and keep moving.</p>
            </div>
            <div className="startPill">60 DAY SYSTEM</div>
          </div>

          <div className="stats">
            <div className="stat"><strong>60</strong><span>days</span></div>
            <div className="stat"><strong>5</strong><span>tasks every day</span></div>
            <div className="stat"><strong>300</strong><span>tasks in total</span></div>
            <div className="stat"><strong>{completedDays} / 60</strong><span>days completed</span></div>
          </div>

          <div className="mainGrid">
            <section className="calendarCard">
              <div className="weekHead">
                {weekdays.map((w) => <span key={w}>{w}</span>)}
              </div>
              <div className="calendar">
                {Array.from({ length: 60 }, (_, index) => {
                  const day = index + 1;
                  const count = tasks.filter((task) => done[key(day, task.id)]).length;
                  const complete = count === tasks.length;
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`day ${selectedDay === day ? "selected" : ""} ${complete ? "complete" : ""}`}
                    >
                      <b>{day}</b>
                      <small>{shortDate(day)}</small>
                      <div className="dots">
                        {tasks.map((task) => (
                          <i
                            key={task.id}
                            className={`${task.tone} ${done[key(day, task.id)] ? "filled" : ""}`}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="legend">
                {tasks.map((task) => <span key={task.id}><i className={task.tone} />{task.title.split(" ")[0]}</span>)}
              </div>
            </section>

            <aside className="dayPanel">
              <div className="dayPanelHead">
                <div>
                  <h2>Day {selectedDay}</h2>
                  <p>{selectedCompleted} of {tasks.length} tasks · about 1h 45m</p>
                </div>
                <span>{longDate(selectedDay)}</span>
              </div>

              <div className="dayProgress"><i style={{ width: `${(selectedCompleted / tasks.length) * 100}%` }} /></div>

              <div className="tasks">
                {tasks.map((task) => {
                  const taskKey = key(selectedDay, task.id);
                  const checked = !!done[taskKey];
                  return (
                    <button
                      key={task.id}
                      className={`task ${checked ? "taskDone" : ""}`}
                      onClick={() => setDone((prev) => ({ ...prev, [taskKey]: !prev[taskKey] }))}
                    >
                      <span className={`check ${task.tone}`}>{checked ? "✓" : ""}</span>
                      <span className="taskText">
                        <b>{task.title}</b>
                        <small>{task.subtitle} · {task.minutes} min</small>
                      </span>
                      <span className="open">{checked ? "Done" : "Open →"}</span>
                    </button>
                  );
                })}
              </div>

              <div className="saved">✓ Progress is saved on this device · {totalCompletedTasks} tasks completed</div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
