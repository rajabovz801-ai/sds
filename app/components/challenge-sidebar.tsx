"use client";
import Link from "next/link";
import {BookOpen, CalendarDays, ChevronRight, Clock3, Headphones, LayoutDashboard, Mic, Newspaper, NotebookPen, PenLine, ShieldCheck} from "lucide-react";

type ModuleName = "Reading"|"Listening"|"Article"|"Vocabulary"|"Writing"|"Speaking";
type Props = {day:number;active?:ModuleName|"Day"};
const modules: {name:ModuleName;icon:typeof BookOpen;tone:string}[]=[
 {name:"Reading",icon:BookOpen,tone:"purple"},
 {name:"Listening",icon:Headphones,tone:"blue"},
 {name:"Article",icon:Newspaper,tone:"amber"},
 {name:"Vocabulary",icon:NotebookPen,tone:"green"},
 {name:"Writing",icon:PenLine,tone:"orange"},
 {name:"Speaking",icon:Mic,tone:"pink"}
];
export default function ChallengeSidebar({day,active="Day"}:Props){
 const scheduled=[1,5,8,12,15].includes(day);
 const url=(name:ModuleName)=>(name==="Reading"&&scheduled?"/day/"+day+"/reading":name==="Vocabulary"&&scheduled?"/day/"+day+"/vocabulary":name==="Article"&&day===1?"/day/"+day+"/article":null);
 return <aside className="ch-sidebar" aria-label="Challenge navigation">
  <div className="ch-sidebar-brand"><span className="ch-brand-name"><b>ARK</b> EDUCATION</span><span>60 DAY IELTS CHALLENGE <i/></span></div>
  <div className="ch-sidebar-group"><div className="ch-sidebar-label">WORKSPACE</div>
   <Link href="/dashboard" className="ch-nav-item"><LayoutDashboard size={18}/> Dashboard <ChevronRight size={15}/></Link>
   <Link href={"/day/"+day} className={"ch-nav-item "+(active==="Day"?"active":"")} aria-current={active==="Day"?"page":undefined}><CalendarDays size={18}/> Day {String(day).padStart(2,"0")} plan <ChevronRight size={15}/></Link>
  </div>
  <div className="ch-sidebar-group"><div className="ch-sidebar-label">MY MODULES</div>
   {modules.map(m=>{const Icon=m.icon,to=url(m.name);return to?<Link key={m.name} href={to} className={"ch-module-link "+(active===m.name?"selected":"")} aria-current={active===m.name?"page":undefined}><span className={"ch-module-icon "+m.tone}><Icon size={16}/></span>{m.name}<ChevronRight size={14}/></Link>:<div key={m.name} className="ch-module-link disabled" aria-disabled="true"><span className={"ch-module-icon "+m.tone}><Icon size={16}/></span>{m.name}<span className="ch-soon">Soon</span></div>})}
  </div>
  <div className="ch-sidebar-bottom"><ShieldCheck size={19}/><b>One day at a time.</b><p>Read thoughtfully. Learn new words. Track your progress.</p><span><Clock3 size={14}/> Day {String(day).padStart(2,"0")} / 60</span></div>
 </aside>;
}
