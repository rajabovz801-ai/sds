export function mockDraftBridgeScript() {
  return `
<script>
(function(){
  if(new URLSearchParams(location.search).get('mode')!=='mock') return;
  var last='';
  function controls(){
    return Array.from(document.querySelectorAll('input,select,textarea')).map(function(el){
      return {id:el.id||'',name:el.name||'',type:String(el.type||el.tagName||'').toLowerCase(),value:String(el.value||''),checked:Boolean(el.checked)};
    });
  }
  function currentAnswers(){
    try{if(typeof answers!=='undefined'&&answers&&typeof answers==='object')return JSON.parse(JSON.stringify(answers));}catch(e){}
    return null;
  }
  function capture(){
    var a=document.getElementById('testAudio')||document.querySelector('audio');
    var state={controls:controls(),answers:currentAnswers(),audioCurrentTime:a?Number(a.currentTime||0):0,scroll:{questions:Number(document.getElementById('questionsPanel')?.scrollTop||0),passage:Number(document.getElementById('passagePane')?.scrollTop||0),reading:Number(document.getElementById('qPane')?.scrollTop||0)}};
    try{if(typeof currentPart!=='undefined')state.currentPart=Number(currentPart);}catch(e){}
    try{if(typeof currentQuestion!=='undefined')state.currentQuestion=Number(currentQuestion);}catch(e){}
    try{if(typeof activePassage!=='undefined')state.activePassage=Number(activePassage);}catch(e){}
    try{if(typeof currentQ!=='undefined')state.currentQ=Number(currentQ);}catch(e){}
    try{if(typeof started!=='undefined')state.started=Boolean(started);}catch(e){}
    return state;
  }
  function send(force){
    var state=capture(),key='';try{key=JSON.stringify(state);}catch(e){}
    if(!force&&key===last)return;last=key;
    window.parent.postMessage({type:'ARK_DRAFT_STATE',state:state},'*');
  }
  function find(item){
    if(item.id){var byId=document.getElementById(item.id);if(byId)return byId;}
    if(item.name){var list=document.getElementsByName(item.name);for(var i=0;i<list.length;i++){if((item.type==='radio'||item.type==='checkbox')&&String(list[i].value||'')!==String(item.value||''))continue;return list[i];}}
    return null;
  }
  function restore(state){
    if(!state||typeof state!=='object')return;
    (state.controls||[]).forEach(function(item){var el=find(item);if(!el)return;if(item.type==='radio'||item.type==='checkbox')el.checked=Boolean(item.checked);else el.value=String(item.value||'');});
    try{if(state.answers&&typeof answers!=='undefined'){Object.keys(answers).forEach(function(k){delete answers[k];});Object.keys(state.answers).forEach(function(k){answers[k]=state.answers[k];});}}catch(e){}
    try{if(state.currentPart&&typeof currentPart!=='undefined')currentPart=Number(state.currentPart);if(state.currentQuestion&&typeof currentQuestion!=='undefined')currentQuestion=Number(state.currentQuestion);if(state.currentPart&&typeof renderPart==='function')renderPart(Number(state.currentPart),true);}catch(e){}
    try{if(state.activePassage&&typeof activePassage!=='undefined')activePassage=Number(state.activePassage);if(state.currentQ&&typeof currentQ!=='undefined')currentQ=Number(state.currentQ);if(state.activePassage&&typeof showPassage==='function')showPassage(Number(state.activePassage),true);if(typeof renderNav==='function')renderNav();}catch(e){}
    var clickable=document.querySelectorAll('[onclick*="pickMCQ"]');for(var i=0;i<clickable.length;i++){var m=String(clickable[i].getAttribute('onclick')||'').match(/pickMCQ\\(\\s*['\"]q(\\d+)['\"]\\s*,\\s*['\"]([^'\"]+)['\"]/i);if(m&&state.answers)clickable[i].classList.toggle('selected',String(state.answers['q'+m[1]]||'')===m[2]);}
    var audio=document.getElementById('testAudio')||document.querySelector('audio');var pos=Number(state.audioCurrentTime||0);if(audio&&pos>0){var apply=function(){try{audio.currentTime=pos;}catch(e){}};if(audio.readyState>=1)apply();else audio.addEventListener('loadedmetadata',apply,{once:true});var start=document.getElementById('startBtn');if(start&&state.started)start.addEventListener('click',function(){setTimeout(apply,150);},{once:true});}
    setTimeout(function(){if(document.getElementById('questionsPanel'))document.getElementById('questionsPanel').scrollTop=Number(state.scroll?.questions||0);if(document.getElementById('passagePane'))document.getElementById('passagePane').scrollTop=Number(state.scroll?.passage||0);if(document.getElementById('qPane'))document.getElementById('qPane').scrollTop=Number(state.scroll?.reading||0);},100);
  }
  window.addEventListener('message',function(e){if(e.source!==window.parent)return;if(e.data?.type==='ARK_DRAFT_RESTORE')restore(e.data.state||{});if(e.data?.type==='ARK_DRAFT_FLUSH')send(true);});
  document.addEventListener('input',function(){setTimeout(function(){send(false);},250);},true);
  document.addEventListener('change',function(){setTimeout(function(){send(false);},250);},true);
  document.addEventListener('click',function(e){if(e.target?.closest?.('[onclick*="pickMCQ"],.mcq-option'))setTimeout(function(){send(false);},250);},true);
  setInterval(function(){send(false);},1800);
})();
</script>`;
}
