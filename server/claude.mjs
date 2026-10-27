import Anthropic from '@anthropic-ai/sdk';
// Shared Claude access for the library review job and engine v3. Claude only judges and explains
// products we pass in; it never invents a product, a price or a link.
const CLAUDE_MODEL='claude-opus-5-5';

// A daily ceiling on Claude calls, counted in D1 like the Amazon quota, so a traffic spike or a bug
// cannot run up the bill. Past the ceiling callers fall back to the engines that need no AI.
export async function reserveClaudeCall(env,now=Date.now()){
 if(!env.DB)throw Error('quota_storage_unavailable');
 const limit=Number(env.CLAUDE_DAILY_CALL_LIMIT??400);
 const day=new Date(now).toISOString().slice(0,10);
 const row=await env.DB.prepare(`INSERT INTO claude_usage (day,calls) VALUES (?,1)
  ON CONFLICT(day) DO UPDATE SET calls=calls+1 WHERE calls<? RETURNING calls`).bind(day,limit).first();
 if(!row)throw Error('claude_quota_exhausted');
}

// Tokens per day, so the monthly cost is measured, not guessed (see claudeCosts and COSTI.md).
async function recordClaudeTokens(env,usage={}){
 const day=new Date().toISOString().slice(0,10),n=v=>Number(v)||0;
 try{await env.DB.prepare('UPDATE claude_usage SET input_tokens=input_tokens+?,output_tokens=output_tokens+?,cache_read_tokens=cache_read_tokens+?,cache_write_tokens=cache_write_tokens+? WHERE day=?')
  .bind(n(usage.input_tokens),n(usage.output_tokens),n(usage.cache_read_input_tokens),n(usage.cache_creation_input_tokens),day).run();}catch{}
}
// Claude Opus 5.5 list prices in USD per million tokens; cache writes cost 1.25x input.
const CLAUDE_PRICES={input:4,output:20,cacheRead:0.2,cacheWrite:5};
export async function claudeCosts(env,now=Date.now()){
 const month=new Date(now).toISOString().slice(0,7);
 const rows=(await env.DB.prepare("SELECT day,calls,input_tokens,output_tokens,cache_read_tokens,cache_write_tokens FROM claude_usage WHERE day LIKE ? ORDER BY day").bind(month+'%').all()).results||[];
 const usd=r=>(r.input_tokens*CLAUDE_PRICES.input+r.output_tokens*CLAUDE_PRICES.output+r.cache_read_tokens*CLAUDE_PRICES.cacheRead+r.cache_write_tokens*CLAUDE_PRICES.cacheWrite)/1e6;
 const days=rows.map(r=>({day:r.day,calls:r.calls,estimatedUsd:Math.round(usd(r)*100)/100}));
 return {month,calls:days.reduce((s,d)=>s+d.calls,0),estimatedUsd:Math.round(rows.reduce((s,r)=>s+usd(r),0)*100)/100,days};
}

function claudeClient(env){
 if(env.ANTHROPIC_CLIENT)return env.ANTHROPIC_CLIENT;
 if(!env.ANTHROPIC_API_KEY)throw Error('claude_not_configured');
 return new Anthropic({apiKey:env.ANTHROPIC_API_KEY,maxRetries:1});
}

// One structured call: the stable instructions are cached, the answer must match the JSON schema.
export async function claudeJson(env,{system,user,schema,effort='low',maxTokens=4000,timeoutMs=30000}){
 await reserveClaudeCall(env);
 const response=await claudeClient(env).beta.messages.create({
  model:CLAUDE_MODEL,max_tokens:maxTokens,
  betas:['server-side-fallback-2026-07-01'],fallbacks:'default',
  system:[{type:'text',text:system,cache_control:{type:'ephemeral'}}],
  messages:[{role:'user',content:user}],
  output_config:{effort,format:{type:'json_schema',schema}},
 },{timeout:timeoutMs});
 if(response.stop_reason==='refusal')throw Error('claude_refusal');
 if(response.stop_reason==='max_tokens')throw Error('claude_truncated');
 const text=response.content.filter(b=>b.type==='text').map(b=>b.text).join('');
 await recordClaudeTokens(env,response.usage);
 return JSON.parse(text);
}
