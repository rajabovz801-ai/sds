type SectionSource={page:number;source_page?:number};
type ProgressSource={last_page?:number;visited_pages?:number[];completed_at?:string|null};
export function normalizeArticleSections<T extends SectionSource>(sections:T[]){
 return sections.map((section,index)=>({...section,source_page:section.source_page??section.page,page:index+1}));
}
export function normalizeArticleProgress(progress:ProgressSource|undefined,sections:SectionSource[]){
 const position=(value:number)=>{
  if(Number.isInteger(value)&&value>=1&&value<=sections.length)return value;
  const index=sections.findIndex(s=>(s.source_page??s.page)===value);return index<0?0:index+1;
 };
 return {last_page:position(Number(progress?.last_page))||1,visited_pages:[...new Set((progress?.visited_pages||[]).map(position).filter(Boolean))].sort((a,b)=>a-b),completed_at:progress?.completed_at||null};
}
/** Reflow long blocks without changing source wording or splitting sentences. */
export function articleParagraphs(text:string){
 if(text.trim().split(/\s+/).length<=140)return [text];
 const sentences=Array.from(new Intl.Segmenter('en',{granularity:'sentence'}).segment(text),s=>s.segment.trim()).filter(Boolean);
 const paragraphs:string[]=[];let current='';let count=0;
 for(const sentence of sentences){
  const words=sentence.split(/\s+/).length;
  if(current&&count+words>110){paragraphs.push(current);current='';count=0;}
  current+=(current?' ':'')+sentence;count+=words;
 }
 if(current)paragraphs.push(current);
 return paragraphs;
}
