"use client";
import {usePathname} from "next/navigation";
import StudentPresence from "./student-presence";

const routeAreas={reading:"Reading",listening:"Listening",article:"Article",vocabulary:"Vocabulary",writing:"Writing",speaking:"Speaking",mock:"Mock"} as const;

export default function LessonResumeTracker(){
 const pathname=usePathname();
 const match=pathname?.match(/^\/day\/([1-9]|[1-5][0-9]|60)\/(reading|listening|article|vocabulary|writing|speaking|mock)\/?$/);
 if(!match)return null; // The day overview already tracks its own presence.
 const day=Number(match[1]);
 const area=routeAreas[match[2] as keyof typeof routeAreas];
 return <StudentPresence key={pathname} area={area} day={day}/>;
}
