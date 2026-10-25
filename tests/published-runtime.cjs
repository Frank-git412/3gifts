// Executes the shipped JavaScript with a DOM/network double, never a browser.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../dist');
function createRuntime(language='it'){
  const pageRoot=language==='en'?path.join(ROOT,'en'):ROOT;
  const html=fs.readFileSync(path.join(pageRoot,'index.html'),'utf8'),nodes=new Map(),inputs=[],events=[],windowEvents=new Map(),documentEvents=new Map(),clock={now:1000};
  function make(key,props={}){const n={key,hidden:false,disabled:false,required:false,value:'',textContent:'',innerHTML:'',dataset:{},style:{},listeners:{},classList:{toggle(){},add(){},remove(){}},...props};
    n.setAttribute=(k,v)=>{n[k]=v};n.addEventListener=(t,fn)=>(n.listeners[t]??=[]).push(fn);n.dispatchEvent=e=>{e.target??=n;e.currentTarget=n;e.preventDefault??=()=>{};for(const fn of n.listeners[e.type]||[])fn(e);if(n.form&&e.type==='change')n.form.dispatchEvent({...e,target:n})};n.click=()=>{if(!n.disabled)n.dispatchEvent({type:'click'})};n.focus=()=>{clock.focus=n.key};n.scrollIntoView=()=>{clock.scroll=n.key};n.showModal=()=>{n.open=true};n.close=()=>{n.open=false};n.reset=()=>{for(const x of inputs.filter(x=>x.form===n)){x.value=x.initialValue;x.checked=x.initialChecked}};n.querySelectorAll=q=>selectAll(q).filter(x=>!n.controls||n.controls.includes(x));n.querySelector=q=>n.querySelectorAll(q)[0]||null;n.closest=q=>q==='.interest-group'?n.group:null;n.checkValidity=()=>{if(n.required&&n.type==='radio')return inputs.some(x=>x.name===n.name&&x.checked);if(n.required&&!n.value)return false;if(n.type==='number'&&n.value){const v=Number(n.value);return Number.isFinite(v)&&v>=Number(n.min)&&v<=Number(n.max)&&(v-Number(n.min))%Number(n.step||1)===0}return true};n.reportValidity=n.checkValidity;nodes.set(key,n);return n;
  }
  const attrs=s=>Object.fromEntries([...s.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(m=>[m[1],m[2]??true]));
  // Like querySelector, a :checked query with no match returns null instead of a cached placeholder.
  function el(q){if(/:checked$/.test(q)&&!nodes.has(q))return selectAll(q)[0]||null;if(nodes.has(q))return nodes.get(q);const found=selectAll(q)[0];return found||make(q)}
  const primary=make('#giftForm'),refine=make('#refinementForm',{hidden:true});
  const stepMatches=[...html.matchAll(/<fieldset class="step(?: active)?" data-step="(\d+)" data-step-key="([^"]+)">([\s\S]*?)<\/fieldset>/g)];
  const steps=stepMatches.map(m=>make('step-'+m[1],{dataset:{step:m[1],stepKey:m[2]},controls:[],source:m[3]}));
  for(const s of steps){const query=s.querySelector,legend=make('legend-'+s.dataset.stepKey);s.querySelector=q=>q==='legend'?legend:query(q)}
  for(const [form,source]of [[primary,html.match(/<form id="giftForm">([\s\S]*?)<\/form>/)[1]],[refine,html.match(/<form class="refinement-form"[^>]*>([\s\S]*?)<\/form>/)[1]]]){
    for(const m of source.matchAll(/<(input|textarea|select)\b([^>]*)>/g)){
      const a=attrs(m[2]),key=a.id?'#'+a.id:`input-${inputs.length}`;
      const n=make(key,{name:a.name,type:a.type||m[1],form,value:a.value||'',initialValue:a.value||'',required:!!a.required,disabled:!!a.disabled,dataset:{stages:a['data-stages']},min:a.min,max:a.max,step:a.step});
      n.initialChecked=!!a.checked;n._checked=!!a.checked;
      Object.defineProperty(n,'checked',{get(){return n._checked},set(v){n._checked=v;if(v&&n.type==='radio')for(const x of inputs)if(x!==n&&x.name===n.name)x._checked=false}});
      inputs.push(n);const step=steps.find(s=>s.source.includes(m[0]));if(step)step.controls.push(n);
    }
  }
  const subpanels=[];
  for(const match of html.matchAll(/<div class="interest-group"([^>]*)>([\s\S]*?)<\/div><\/div>/g)){
    const a=attrs(match[1]),key=match[2].match(/name="interest" value="([^"]+)"/)[1],x=inputs.find(n=>n.name==='interest'&&n.value===key);
    const panel=make('sub-'+key,{hidden:true,controls:[]}),group=make('group-'+key,{hidden:!!a.hidden,dataset:{audience:a['data-audience'],stages:a['data-stages']}}),labels=[];
    const span=make('span-'+key,{textContent:match[2].match(/<span>(.*?)<\/span>/)[1]});
    for(const label of match[2].matchAll(/<label[^>]*>(<input[^>]*name="subinterest"[^>]*>)(.*?)<\/label>/g)){
      const subAttrs=attrs(label[1]),sub=inputs.find(n=>n.name==='subinterest'&&n.value===subAttrs.value&&!n.group),node=make('label-'+key+'-'+sub.value,{textContent:label[2]});
      sub.group=group;sub.closest=q=>q==='label'?node:q==='.interest-group'?group:null;panel.controls.push(sub);labels.push(node);
    }
    group.querySelector=q=>q==='.subinterests'?panel:q==='span'?span:null;
    group.querySelectorAll=q=>q==='.subinterests label'?labels:q==='input'?[x,...panel.controls]:[];
    x.group=group;subpanels.push(panel);
  }
  function selectAll(q){
    if(q==='.step')return steps;if(q==='[required]')return inputs.filter(x=>x.required);if(q==='.subinterests')return subpanels;
    const sm=q.match(/^\.step\[data-step-key="([^"]+)"\]$/);if(sm)return steps.filter(s=>s.dataset.stepKey===sm[1]);
    const im=q.match(/^input\[name="([^"]+)"\](?:\[value="([^"]+)"\])?(:checked)?$/);if(im)return inputs.filter(x=>x.name===im[1]&&(im[2]===undefined||x.value===im[2])&&(!im[3]||x.checked));
    if(q==='input')return inputs;return nodes.has(q)?[nodes.get(q)]:[];
  }
  for(const match of html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)){const n=el('#'+match[1]);if(/\bhidden\b/.test(match[0]))n.hidden=true}
  el('.finder').hidden=true;el('.hero-concept').hidden=false;
  const context={window:{GiftsPrivacy:{hasAnalyticsConsent:()=>true},umami:{track:(name,data)=>events.push({name,data})},addEventListener:(k,fn)=>windowEvents.set(k,fn),matchMedia:()=>({matches:false})},document:{documentElement:{lang:language},visibilityState:'visible',querySelector:el,querySelectorAll:selectAll,addEventListener:(k,fn)=>documentEvents.set(k,fn)},
    URL,URLSearchParams,Date,console,performance:{now:()=>clock.now},AbortController,setTimeout,clearTimeout,scrollTo(){},fetch:async()=>{throw new Error('network disabled')},Event:class{constructor(type){this.type=type}},
    FormData:class{constructor(form){this.form=form}getAll(name){return inputs.filter(x=>x.form===this.form&&x.name===name&&!x.disabled&&(!['radio','checkbox'].includes(x.type)||x.checked)).map(x=>x.value)}get(name){return this.getAll(name)[0]??null}}};
  vm.createContext(context);for(const file of ['config.js','catalog.js','catalog-health.js','recommendation-rules.js',...(language==='en'?['en/catalog-labels.js','en/app.js']:['app.js'])])vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),context,{filename:file});
  const api=vm.runInContext('({formData,rankProducts,normalizeProduct,analyseNote,showResults,valid,track,renderStep,showZeroRecovery,storeUrl,renderProductCards,fetchCatalogHealth,fetchMarketplaceProducts,applyCatalogHealth,fetchJSON,trackStepTiming,suggestedBudget})',context);
  const set=(name,value)=>{const group=inputs.filter(x=>x.name===name);if(!group.length)throw Error('Unknown input '+name);if(['radio','checkbox'].includes(group[0].type)){for(const x of group)x.checked=Array.isArray(value)?value.includes(x.value):x.value===value;}else group[0].value=String(value);return group.find(x=>x.checked)||group[0]};
  const seed=()=>{for(const [k,v]of Object.entries({relation:'friend',perspective:'recipient',occasion:'birthday',ageRange:'adult',interest:['techGaming','culture'],tone:'neutral',budgetChoice:'50',timing:'week',note:''}))set(k,v)};
  return{c:context,a:api,R:context.window.TRE_REGALI_RULES,H:context.window.TRE_REGALI_HEALTH,el,inputs,steps,set,seed,events,clock,windowEvents,documentEvents,eval:code=>vm.runInContext(code,context),products:context.window.TRE_REGALI_CATALOG.map(api.normalizeProduct)};
}
module.exports={createRuntime,ROOT};
