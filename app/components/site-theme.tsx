"use client";

import {useEffect} from "react";

/** Keeps the saved UI preference across route changes and browser tabs. */
export default function SiteTheme(){
 useEffect(()=>{
  const sync=()=>{try{document.documentElement.dataset.arkTheme=localStorage.getItem("ark60-theme")==="dark"?"dark":"light"}catch{document.documentElement.dataset.arkTheme="light"}};
  sync();window.addEventListener("storage",sync);window.addEventListener("ark-theme-change",sync);
  return()=>{window.removeEventListener("storage",sync);window.removeEventListener("ark-theme-change",sync)};
 },[]);
 return null;
}
