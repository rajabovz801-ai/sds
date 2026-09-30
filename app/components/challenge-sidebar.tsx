"use client";
import Link from "next/link";
import {BookOpen, CalendarDays, ChevronRight, Clock3, LayoutDashboard, ShieldCheck} from "lucide-react";

type ModuleName = "Reading"|"Listening"|"Article"|"Vocabulary"|"Writing"|"Speaking";
type Props = {day:number;active?:ModuleName|"Day"};
export default function ChallengeSidebar({day,active="Day"}:Props){
 return <aside className="ch-sidebar" aria-label="Challenge navigation">
  <div className="ch-sidebar-brand"><span className="ch-brand-name"><b>ARK</b> EDUCATION</span><span>60 DAY IELTS CHALLENGE <i/></span></div>
  <div className="ch-sidebar-group"><div className="ch-sidebar-label">WORKSPACE</div>
   <Link href="/dashboard" className="ch-nav-item"><LayoutDashboard size={18}/> Dashboard <ChevronRight size={15}/></Link>
   <Link href={"/day/"+day} className={"ch-nav-item "+(active==="Day"?"active":"")} aria-current={active==="Day"?"page":undefined}><CalendarDays size={18}/> Day {String(day).padStart(2,"0")} plan <ChevronRight size={15}/></Link>
  </div>
  <div className="ch-sidebar-bottom"><ShieldCheck size={19}/><b>One day at a time.</b><p>Read thoughtfully. Learn new words. Track your progress.</p><span><Clock3 size={14}/> Day {String(day).padStart(2,"0")} / 60</span></div>
 </aside>;
}
