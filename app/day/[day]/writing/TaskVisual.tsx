"use client";
export default function TaskVisual({kind}:{kind:string}){
 const src=kind.startsWith("/")?kind:"/writing/"+kind+".svg";
 return <img src={src} alt="Writing Task 1 visual" style={{display:"block",width:"100%",height:"auto",maxHeight:520,objectFit:"contain"}}/>;
}