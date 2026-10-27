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
 console.log('claude usage',JSON.stringify({input:response.usage?.input_tokens,cached:response.usage?.cache_read_input_tokens,output:response.usage?.output_tokens}));
 return JSON.parse(text);
}
