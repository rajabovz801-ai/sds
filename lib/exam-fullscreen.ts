/** Invoke from the click handler, before network work consumes user activation. */
export async function ensureExamFullscreen(doc:Document=document):Promise<boolean>{
 if(doc.fullscreenElement)return true;
 if(!doc.fullscreenEnabled||!doc.documentElement.requestFullscreen)return false;
 try{await doc.documentElement.requestFullscreen();return !!doc.fullscreenElement}catch{return false}
}
