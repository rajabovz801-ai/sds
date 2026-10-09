"use client";
import {useEffect,useState,type CSSProperties} from 'react';
import {Check,Leaf,Lock,Sunrise,Waves,Award,MoonStar} from 'lucide-react';
export type CosmeticState={theme?:string|null;avatar?:string|null;badge?:string|null;unlocked?:{themes:string[];avatars:string[];decorations:boolean;badges:string[]}};
export const THEMES=[{id:'dawn',name:'Dawn',description:'A fresh start in warm mountain light',color:'#b16f45',Icon:Sunrise},{id:'ocean',name:'Ocean',description:'Calm blue water and open horizons',color:'#247c92',Icon:Waves},{id:'forest',name:'Forest',description:'Quiet woodland and soft morning mist',color:'#497961',Icon:Leaf},{id:'night-sky',name:'Night Sky',description:'Moonlit mountains and a quiet starry sky',color:'#5967a5',Icon:MoonStar}];
const AVATARS=[{id:'boy',name:'Navy hoodie'},{id:'girl',name:'Ponytail'},{id:'girl-hijab',name:'Navy hijab'}];
export function cosmeticCSS(style?:CosmeticState):CSSProperties{
 const theme=THEMES.find(t=>t.id===style?.theme);
 return theme?{'--reward-accent':theme.color,'--reward-cover':`url("/images/rewards/${theme.id}.png")`} as CSSProperties:{};
}
export function ThemeMark({theme,className=''}:{theme?:string|null;className?:string}){
 const t=THEMES.find(x=>x.id===theme);return t?<t.Icon className={'theme-mark '+className} size={20} aria-label={t.name+' theme'}/>:null;
}
export function RewardDecoration({theme,className=''}:{theme?:string|null;className?:string}){
 return THEMES.some(t=>t.id===theme)?<img className={'reward-decoration '+className} src={'/images/rewards/'+theme+'-decor.png'} alt="" aria-hidden="true"/>:null;
}
export function RewardAvatar({avatar,initials,className=''}:{avatar?:string|null;initials:string;className?:string}){
 return <span className={'reward-avatar '+className}>{AVATARS.some(a=>a.id===avatar)?<img src={'/images/rewards/'+avatar+'.png'} alt="Selected avatar"/>:initials}</span>;
}
export function StyleCollection({state,onApplied,preview=false,compact=false}:{compact?:boolean;state:CosmeticState;onApplied:(s:CosmeticState)=>void;preview?:boolean}){
 const [theme,setTheme]=useState(state.theme||''),[avatar,setAvatar]=useState(state.avatar||''),[badge,setBadge]=useState(state.badge||''),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{setTheme(state.theme||'');setAvatar(state.avatar||'');setBadge(state.badge||'')},[state.theme,state.avatar,state.badge]);
 const owned=state.unlocked||{themes:[],avatars:[],decorations:false,badges:[]};
 const draft={...state,theme,avatar,badge};
 async function apply(){setSaving(true);setMessage('');try{const r=await fetch('/api/ark60',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'apply_reward_style',theme:theme||null,avatar:avatar||null,badge:badge||null})});const j=await r.json();if(!r.ok)throw new Error(j.detail||'Could not apply style.');onApplied(j.cosmetics);setMessage(preview?'Demo style applied to your profile.':'Style applied to your profile.')}catch(e){setMessage(e instanceof Error?e.message:'Could not apply style.')}finally{setSaving(false)}}
 return <section className="style-collection"><div className="style-collection-heading"><div><small>YOUR COLLECTION</small><h3>Make it yours</h3><p>Choose a profile background. Your scene appears only on your Profile page.</p></div>{preview&&<span className="demo-label">TRY DEMO</span>}</div>
  {!compact&&<div className={'style-live-preview '+(theme?'has-reward-theme':'')} style={cosmeticCSS(draft)}><div className="style-preview-cover"/><RewardAvatar avatar={avatar} initials="YOU"/><div><b>Your profile <ThemeMark theme={theme}/></b><small>Profile background</small>{badge&&<span className="reward-name-badge"><Award size={14}/>{badge.replace('day-','Day ')}</span>}</div>{owned.decorations&&<RewardDecoration theme={theme} className="style-decor"/>}</div>}
  <div className="theme-choice-grid">{THEMES.map(t=>{const unlocked=owned.themes.includes(t.id);return <button type="button" key={t.id} disabled={!unlocked} aria-pressed={theme===t.id} className={'theme-choice '+(theme===t.id?'selected':'')} onClick={()=>setTheme(t.id)}><img src={'/images/rewards/'+t.id+'.png'} alt=""/><span><t.Icon size={17}/><b>{t.name}</b>{unlocked?(theme===t.id&&<Check size={17}/>):<Lock size={14}/>}</span><small>{unlocked?t.description:'Unlock on reward day '+(t.id==='night-sky'?13:8)}</small></button>})}</div>
  <div className="collection-subheading"><b>Avatar collection</b><small>Choose freely · unlocked on day 8</small></div><div className="avatar-choice-grid"><button type="button" aria-pressed={!avatar} className={!avatar?'selected':''} onClick={()=>setAvatar('')}><span className="avatar-initial-choice">Aa</span><small>Initials</small></button>{AVATARS.map(a=>{const unlocked=owned.avatars.includes(a.id);return <button type="button" key={a.id} disabled={!unlocked} aria-pressed={avatar===a.id} className={avatar===a.id?'selected':''} onClick={()=>setAvatar(a.id)}><img src={'/images/rewards/'+a.id+'.png'} alt=""/><small>{a.name}{!unlocked&&<Lock size={12}/>}</small></button>})}</div>
  <div className="collection-subheading"><b>Name badge</b><small>Earned milestones stay in your collection</small></div><div className="badge-choice-grid"><button className={!badge?'selected':''} onClick={()=>setBadge('')}>None</button>{owned.badges.map(b=><button key={b} className={badge===b?'selected':''} onClick={()=>setBadge(b)}><Award size={15}/>{b.replace('day-','Day ')}</button>)}{!owned.badges.length&&<small>First badge unlocks on day 10.</small>}</div>
  <div className="style-apply-row"><button className="style-apply" disabled={saving} onClick={apply}>{saving?'Applying…':'Apply style'}</button>{theme&&<button className="style-reset" onClick={()=>{setTheme('');setAvatar('');setBadge('')}}>Use default</button>}{message&&<span role="status">{message}</span>}</div>
 </section>;
}
