'use client';
import {BookOpen,Compass,Moon,Sparkles} from 'lucide-react';
import {catalog,type Product,type ExperienceState} from '@/lib/experience/core';
export function ProductArt({item}:{item:Product}){
 if(item.art)return <img className={'ex-product-image ex-art-'+item.category} src={item.art} alt={item.name} loading="lazy" width={640} height={400}/>;
 if(item.category==='frame')return <div className={'ex-art-frame ex-frame-'+item.tone}><div>R</div></div>;
 return <div className="ex-art-title">{item.id==='night-scholar'?<Moon size={22}/>:<Compass size={22}/>}<span>{item.label}</span></div>;
}
export function ExperienceAvatar({state,name='Rustam'}:{state:ExperienceState;name?:string}){
 const item=catalog.find(x=>x.id===state.equipped.avatar);
 return <span className={'ex-avatar ex-frame-'+(state.equipped.frame||'plain')}>{item?.art?<img src={item.art} alt={item.name} width={80} height={80}/>:<span>{name.slice(0,1)}</span>}</span>;
}
export function CosmeticProfile({state}:{state:ExperienceState}){
 const cover=catalog.find(x=>x.id===state.equipped.cover),title=catalog.find(x=>x.id===state.equipped.title);
 return <article className="ex-profile"><div className="ex-profile-cover" style={cover?.art?{backgroundImage:`url(${cover.art})`}:undefined}>{!cover&&<BookOpen size={30}/>}</div><ExperienceAvatar state={state}/><h3>Rustam</h3>{title&&<span className="ex-title-chip"><Sparkles size={13}/>{title.name}</span>}<p>Bilim sari har kuni bir qadam.</p><small>Tanlangan bezaklar · sinov profili</small></article>;
}
