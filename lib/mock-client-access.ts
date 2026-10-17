export type MockGate={scheduled:boolean;opensAt:string|null};
export const mockRuntimeActive=(stage:string,gate:MockGate|null)=>!gate&&['listening','reading','writing','assessing'].includes(stage);
export async function fetchMockWithAccess(fetcher:typeof fetch,input:RequestInfo|URL,init:RequestInit|undefined,onGate:(gate:MockGate)=>void){
 const response=await fetcher(input,init);
 if(!response.ok){
  const data=await response.clone().json().catch(()=>null);
  if(data?.code_required||data?.scheduled)onGate({scheduled:data.scheduled===true,opensAt:data.opens_at||null});
 }
 return response;
}
export function restoreMockDraft(server:Record<string,any>,held:Record<string,any>|null){
 if(!held||held.stage!==server.stage)return server;
 if(server.stage==='reading')return {...server,reading_answers:{...server.reading_answers,...held.rAnswers}};
 if(server.stage==='writing')return {...server,writing_task1:held.w1??server.writing_task1,writing_task2:held.w2??server.writing_task2};
 return server;
}
