import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Temporary diagnostic for the fixed set of Day 20 Listening archive URLs.
// No user-controlled network destination is accepted.
const urls = [
 ["provided", "https://ia600702.us.archive.org/24/items/test-20154/TEST%2520154.mp3"],
 ["provided-download", "https://archive.org/download/test-20154/TEST%2520154.mp3"],
 ["single-encoded-download", "https://archive.org/download/test-20154/TEST%20154.mp3"],
 ["single-encoded-origin", "https://ia600702.us.archive.org/24/items/test-20154/TEST%20154.mp3"],
 ["literal-name-download", "https://archive.org/download/test-20154/TEST%252520154.mp3"],
 ["metadata", "https://archive.org/metadata/test-20154"],
 ["previous-listening", "https://ia601600.us.archive.org/6/items/test-204-ready/TEST_204_ready.mp3"],
 ["public-connectivity", "https://www.google.com/robots.txt"],
 ["mkl021-html", "https://murodkamilov.uz/listening/mkl021/"],
 ["mkl-audio1", "https://murodkamilov.uz/listening/mkl021/audio/section1.mp3"],
 ["mkl-audio2", "https://murodkamilov.uz/listening/mkl021/audio/section2.mp3"],
 ["mkl-audio3", "https://murodkamilov.uz/listening/mkl021/audio/section3.mp3"],
 ["mkl-audio4", "https://murodkamilov.uz/listening/mkl021/audio/section4.mp3"],
 ["catbox-day20", "https://files.catbox.moe/h4j35t.mp3"]
] as const;

async function inspect(name: string, url: string) {
 try {
  const res = await fetch(url, {
   redirect:"follow", cache:"no-store",
   headers: name==="metadata" ? {"Accept":"application/json"} : {"Range":"bytes=0-1023"},
   signal:AbortSignal.timeout(11000),
  });
  const result: Record<string, unknown> = {
   name, status:res.status, contentType:res.headers.get("content-type"),
   length:res.headers.get("content-length"), range:res.headers.get("content-range"),
   finalUrl:res.url
  };
  if(name==="mkl021-html" && res.ok) {
   const html=await res.text();
   result.htmlLength=html.length;
   result.mp3Paths=Array.from(new Set(html.match(/[A-Za-z0-9_/:.%?&=+~-]+[.]mp3/gi)||[])).slice(0,50);
   result.audioTags=(html.match(/.{0,150}<audio.{0,250}/gi)||[]).slice(0,10);
  } else if(name==="metadata" && res.ok) {
   const meta=await res.json();
   result.files=(meta.files||[]).map((x:any)=>({name:x.name,size:x.size,source:x.source,format:x.format})).filter((x:any)=>/mp3|audio|154/i.test(x.name||"")).slice(0,30);
  } else {
   const reader=res.body?.getReader();
   if(reader){
    const first=await reader.read();
    const bytes=first.value||new Uint8Array();
    result.firstBytes=[...bytes.slice(0,16)].map(x=>x.toString(16).padStart(2,"0")).join(" ");
    result.looksLikeMp3=bytes[0]===0x49&&bytes[1]===0x44&&bytes[2]===0x33||bytes[0]===0xff&&(bytes[1]&0xe0)===0xe0;
    await reader.cancel();
   }
  }
  return result;
 } catch(e) {return {name,error:String(e),cause:String((e as any)?.cause||""),code:(e as any)?.cause?.code||null}}
}
export async function GET() {
 const results=await Promise.all(urls.map(([n,u])=>inspect(n,u)));
 return NextResponse.json({results}, {headers:{"Cache-Control":"no-store"}});
}
