import Anthropic from '@anthropic-ai/sdk';
// Shared Claude access for the library review job and engine v3. Claude only judges and explains
// products we pass in; it never invents a product, a price or a link.
const CLAUDE_MODEL='claude-opus-5-5';
// Faster models that a caller may use for a step, only where a test showed quality holds.
export const CLAUDE_FAST_MODELS=['claude-sonnet-5-5','claude-haiku-5-5'];

// A daily ceiling on Claude calls, counted in D1 like the Amazon quota, so a traffic spike or a bug
// cannot run up the bill. Past the ceiling callers fall back to the engines that need no AI.
// Visitors' searches and background work (product review, evaluation) have separate ceilings, so the
// nightly review of new ideas can never use up the searches: 500 site calls are 250 v4 questionnaires.
export async function reserveClaudeCall(env,now=Date.now(),budget='site'){
 if(!env.DB)throw Error('quota_storage_unavailable');
 const background=budget==='background';
 const limit=Number(background?env.CLAUDE_BACKGROUND_DAILY_CALL_LIMIT??150:env.CLAUDE_DAILY_CALL_LIMIT??500);
 const day=new Date(now).toISOString().slice(0,10)+(background?'#bg':'');
 const row=await env.DB.prepare(`INSERT INTO claude_usage (day,calls) VALUES (?,1)
  ON CONFLICT(day) DO UPDATE SET calls=calls+1 WHERE calls<? RETURNING calls`).bind(day,limit).first();
 if(!row)throw Error('claude_quota_exhausted');
}

// Tokens per day, so the monthly cost is measured, not guessed (see claudeCosts and COSTI.md).
async function recordClaudeTokens(env,model,usage={}){
 const day=new Date().toISOString().slice(0,10),n=v=>Number(v)||0;
 try{await env.DB.prepare(`INSERT INTO claude_model_usage (day,model,calls,input_tokens,output_tokens,cache_read_tokens,cache_write_tokens) VALUES (?,?,1,?,?,?,?)
  ON CONFLICT(day,model) DO UPDATE SET calls=calls+1,input_tokens=input_tokens+excluded.input_tokens,output_tokens=output_tokens+excluded.output_tokens,cache_read_tokens=cache_read_tokens+excluded.cache_read_tokens,cache_write_tokens=cache_write_tokens+excluded.cache_write_tokens`)
  .bind(day,model,n(usage.input_tokens),n(usage.output_tokens),n(usage.cache_read_input_tokens),n(usage.cache_creation_input_tokens)).run();}catch{}
}
// List prices in USD per million tokens (cache writes 1.25x input). Haiku 5.5 is priced for prompts up to 100K tokens.
const CLAUDE_PRICES={'claude-opus-5-5':{input:4,output:20,cacheRead:0.2,cacheWrite:5},'claude-sonnet-5-5':{input:2,output:10,cacheRead:0.2,cacheWrite:2.5},'claude-haiku-5-5':{input:0.1,output:0.5,cacheRead:0.01,cacheWrite:0.125}};
export async function claudeCosts(env,now=Date.now()){
 const month=new Date(now).toISOString().slice(0,7);
 // Tokens recorded before per-model tracking sit in claude_usage and were all Claude Opus 5.5.
 const legacy=(await env.DB.prepare("SELECT day,calls,input_tokens,output_tokens,cache_read_tokens,cache_write_tokens,'claude-opus-5-5' AS model FROM claude_usage WHERE day LIKE ?").bind(month+'%').all()).results||[];
 const byModel=(await env.DB.prepare("SELECT day,model,input_tokens,output_tokens,cache_read_tokens,cache_write_tokens FROM claude_model_usage WHERE day LIKE ?").bind(month+'%').all()).results||[];
 const usd=r=>{const p=CLAUDE_PRICES[r.model]||CLAUDE_PRICES['claude-opus-5-5'];return (r.input_tokens*p.input+r.output_tokens*p.output+r.cache_read_tokens*p.cacheRead+r.cache_write_tokens*p.cacheWrite)/1e6;};
 const days=new Map();
 for(const r of legacy){const day=r.day.slice(0,10),d=days.get(day)||{day,calls:0,usd:0,models:{}};d.calls+=r.calls;d.usd+=usd(r);days.set(day,d);}
 for(const r of byModel){const d=days.get(r.day)||{day:r.day,calls:0,usd:0,models:{}};d.usd+=usd(r);d.models[r.model]=Math.round(usd(r)*100)/100;days.set(r.day,d);}
 const list=[...days.values()].sort((a,b)=>a.day.localeCompare(b.day)).map(d=>({day:d.day,calls:d.calls,estimatedUsd:Math.round(d.usd*100)/100,...(Object.keys(d.models).length?{models:d.models}:{})}));
 return {month,calls:list.reduce((s,d)=>s+d.calls,0),estimatedUsd:Math.round([...days.values()].reduce((s,d)=>s+d.usd,0)*100)/100,days:list};
}

function claudeClient(env){
 if(env.ANTHROPIC_CLIENT)return env.ANTHROPIC_CLIENT;
 if(!env.ANTHROPIC_API_KEY)throw Error('claude_not_configured');
 return new Anthropic({apiKey:env.ANTHROPIC_API_KEY,maxRetries:1});
}

// One structured call: the stable instructions are cached, the answer must match the JSON schema.
export async function claudeJson(env,{system,user,schema,effort='low',maxTokens=4000,timeoutMs=30000,model=CLAUDE_MODEL,budget='site'}){
 await reserveClaudeCall(env,Date.now(),budget);
 const response=await claudeClient(env).beta.messages.create({
  model,max_tokens:maxTokens,
  // Haiku has no server-side fallback; Opus and Sonnet re-run a refused request on Anthropic's recommended model.
  ...(model==='claude-haiku-5-5'?{}:{betas:['server-side-fallback-2026-07-01'],fallbacks:'default'}),
  system:[{type:'text',text:system,cache_control:{type:'ephemeral'}}],
  messages:[{role:'user',content:user}],
  output_config:{effort,format:{type:'json_schema',schema}},
 },{timeout:timeoutMs});
 if(response.stop_reason==='refusal')throw Error('claude_refusal');
 if(response.stop_reason==='max_tokens')throw Error('claude_truncated');
 const text=response.content.filter(b=>b.type==='text').map(b=>b.text).join('');
 await recordClaudeTokens(env,model,response.usage);
 return JSON.parse(text);
}
