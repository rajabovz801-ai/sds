"use client";
import type {ReactNode} from "react";
import {ChevronRight} from "lucide-react";
import {WorkspaceArt} from "./workspace-art";
import styles from "./learning-ui.module.css";
export default function LessonEntry({kind,day,summary,preview,check,notice,onStart,instructions}:{kind:"Listening"|"Speaking";day:number;summary:string;preview?:boolean;check?:ReactNode;notice?:string;onStart:()=>void|Promise<void>;instructions:string}){
 return <section className={styles.entry}><WorkspaceArt name={"wolf-"+kind.toLowerCase()} className={styles.mascot}/><small className={styles.day}>Day {day}</small><h1>{kind}</h1><p className={styles.summary}>{summary}</p>{preview&&<span className={styles.preview} title="Preview only: results and coins are not saved">Teacher preview</span>}{check}{notice&&<p className={styles.notice}>{notice}</p>}<button className={styles.start} onClick={onStart}><span>Start {kind}</span><ChevronRight size={16} aria-hidden="true"/></button><details className={styles.instructions}><summary>Instructions</summary><p>{instructions}</p></details></section>;
}
