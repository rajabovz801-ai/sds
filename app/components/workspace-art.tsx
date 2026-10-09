"use client";

import {useState} from "react";

/** Decorative artwork never blocks navigation or hides live account data. */
export function WorkspaceArt({name,className=""}:{name:string;className?:string}){
 const [failed,setFailed]=useState(false);
 if(failed)return null;
 return <img src={"/images/workspace/"+name+".png"} className={"workspace-art "+className} alt="" aria-hidden="true" draggable={false} decoding="async" onError={()=>setFailed(true)}/>;
}

export function RankMedal({rank}:{rank:number}){
 return <span className={"rank-medal rank-medal-"+rank} aria-label={"Rank "+rank}><WorkspaceArt name={rank===1?"medal-gold":rank===2?"medal-silver":"medal-bronze"}/><b>{rank}</b></span>;
}
