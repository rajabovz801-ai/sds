"use client";
export default function TaskVisual({kind}:{kind:string}){
 const source=kind.trim();
 const src=source.startsWith("/")||/^https?:\/\//i.test(source)?source:"/writing/"+source+".svg";
 return <img src={src} alt="Writing Task 1 visual" style={{display:"block",width:"100%",height:"auto",maxHeight:520,objectFit:"contain"}}/>;
}