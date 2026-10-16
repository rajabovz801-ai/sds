export type Category='theme'|'avatar'|'frame'|'cover'|'title'|'companion';
export type Product={id:string;category:Category;name:string;description:string;price:number;art?:string;tone?:string;label?:string};
export const catalog:Product[]=[
 {id:'forest',category:'theme',name:'Forest',description:'Yashil, sokin o‘qish muhiti.',price:150,art:'/art/shop/forest.png'},
 {id:'library',category:'theme',name:'Night Library',description:'To‘q ranglar va iliq kutubxona.',price:180,art:'/art/shop/library.png'},
 {id:'aurora',category:'theme',name:'Aurora',description:'Shimol yog‘dusi ostida diqqat.',price:200,art:'/art/shop/aurora.png'},
 {id:'fox',category:'avatar',name:'Bilimdon tulki',description:'Yangi bilimlar izlovchisi.',price:80,art:'/art/shop/fox.png'},
 {id:'owl-avatar',category:'avatar',name:'Dono boyo‘g‘li',description:'Sokin va sinchkov.',price:80,art:'/art/shop/owl.png'},
 {id:'silver',category:'frame',name:'Silver',description:'Nozik kumush ramka.',price:50,tone:'silver'},
 {id:'gold',category:'frame',name:'Golden Scholar',description:'Iliq oltin jilosi.',price:90,tone:'gold'},
 {id:'emerald',category:'frame',name:'Emerald',description:'Yashil kolleksiyaga mos.',price:70,tone:'emerald'},
 {id:'forest-cover',category:'cover',name:'Forest Retreat',description:'Profil uchun tabiat manzarasi.',price:90,art:'/art/shop/forest.png'},
 {id:'library-cover',category:'cover',name:'Library Corner',description:'Shaxsiy kutubxonangiz.',price:100,art:'/art/shop/library.png'},
 {id:'explorer',category:'title',name:'Explorer',description:'Yangi bilimlarni kashf eting.',price:60,label:'Explorer'},
 {id:'night-scholar',category:'title',name:'Night Scholar',description:'Tungi o‘qish ishqibozi.',price:70,label:'Night Scholar'},
 {id:'owl',category:'companion',name:'Kichik boyo‘g‘li',description:'Dashboarddagi sokin hamroh.',price:120,art:'/art/shop/owl.png'},
 {id:'fox-buddy',category:'companion',name:'Tulki hamroh',description:'Bugungi rejangiz yonida.',price:120,art:'/art/shop/fox.png'},
];
export const categoryLabels:Record<Category,string>={theme:'Temalar',avatar:'Avatarlar',frame:'Ramkalar',cover:'Muqovalar',title:'Unvonlar',companion:'Hamrohlar'};
export function ownerExperienceAllowed(user:{username?:string;status?:string}|null|undefined){return user?.status==='active'&&user.username?.toLowerCase()==='rustam7'}
export function competitionRanks(scores:number[]){return scores.map(score=>1+scores.filter(x=>x>score).length)}
export function practiceOutcome(answer:string,key:string){const norm=(v:string)=>v.trim().normalize('NFKC').toLowerCase().replace(/[.!?]+$/g,'');return !!norm(answer)&&norm(answer)===norm(key)}
export function weeklyProgress(rows:{day:number;module:string}[],start:number){const seen=new Set(rows.filter(x=>x.day>=start&&x.day<start+7).map(x=>`${x.day}:${x.module}`));return {total:seen.size,has:(day:number,module:string)=>seen.has(`${day}:${module}`)}}
export type ExperienceState={wallet:number;owned:string[];equipped:Partial<Record<Category,string>>;reduced_motion:boolean;done:string[];reviews:Record<string,{correct:boolean;due_at:string}>;quest:number;quest_claimed:boolean;history:{label:string;amount:number;at:string}[]};
export type ExperienceData={enabled:true;catalog:Product[];state:ExperienceState;mode:'sandbox'};
export const vocabulary=[
 {id:'reliable',word:'reliable',meaning:'ishonchli',example:'The service is reliable.'},
 {id:'accessible',word:'accessible',meaning:'foydalanish uchun qulay',example:'The library is accessible to everyone.'},
 {id:'implement',word:'implement',meaning:'amalga oshirmoq',example:'They will implement the plan.'},
 {id:'sustain',word:'sustain',meaning:'davom ettirmoq',example:'Regular practice helps sustain progress.'},
 {id:'significant',word:'significant',meaning:'sezilarli',example:'She made significant progress.'},
];
export const mistakes=[
 {id:'transport',module:'Listening',number:12,question:'What is the main purpose of the new project?',options:['To reduce costs','To improve public transport','To attract tourists','To create jobs'],correct:1,given:0,evidence:'The main aim of the project is to improve public transport in the city.',explanation:'“Main aim” savoldagi “main purpose” bilan bir ma’noda. Maqsad — jamoat transportini yaxshilash.'},
 {id:'library-hours',module:'Reading',number:7,question:'The library closes later on Fridays than on Mondays.',options:['TRUE','FALSE','NOT GIVEN'],correct:0,given:2,evidence:'The library closes at 6 pm on Mondays and at 8 pm on Fridays.',explanation:'Juma kuni 20:00, dushanba kuni esa 18:00 da yopiladi. Demak juma kuni kechroq yopiladi — TRUE.'},
];
