'use client';
import {ShoppingBag,Sparkles} from 'lucide-react';
import {useExperience} from './use-experience';
import Shop from './shop';
import {FriendsPanel,InsightsPanel,MistakesPanel,TodayPanel,VocabularyPanel} from './learning';
export function ShopSoon(){return <section className="ex-soon"><span className="ex-soon-icon"><ShoppingBag size={34}/></span><span className="ex-pill">Soon</span><h1>Shop</h1><p>Temalar, avatarlar va shaxsiy kolleksiya.<br/>Tez orada shu yerda ochiladi.</p></section>}
export default function ExperienceWorkspace({view,navigate}:{view:string;navigate:(view:string)=>void}){
 const {data,loading,busy,error,load,act}=useExperience();
 if(!data)return <div className="ex-workspace"><section className="ex-card ex-empty"><h2>{loading?'Workspace yuklanmoqda…':'Yuklab bo‘lmadi'}</h2>{error&&<p role="alert">{error}</p>}{!loading&&<button onClick={()=>load()}>Qayta urinish</button>}</section></div>;
 const props={state:data.state,busy,act};
 return <div className="ex-workspace"><div className="ex-owner-note"><Sparkles size={15}/><span>Rustam uchun yopiq sinov · tanga, reja va natijalar namunaviy</span><button onClick={()=>navigate('Shop')}>Sinov boshqaruvi</button></div>{error&&<div className="ex-error" role="alert">{error}</div>}{busy&&<span className="ex-saving" role="status">Saqlanmoqda…</span>}{view==='Shop'?<Shop data={data} busy={busy} act={act}/>:view==='Themes'?<Shop data={data} busy={busy} act={act} themesOnly/>:view==='Mistakes'?<MistakesPanel {...props}/>:view==='Vocabulary'?<VocabularyPanel {...props}/>:view==='Friends'?<FriendsPanel {...props}/>:view==='Insights'?<InsightsPanel state={data.state}/>:<TodayPanel {...props} navigate={navigate}/>}</div>;
}
