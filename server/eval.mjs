import {claudeJson} from './claude.mjs';
// Evaluation channel, reserved to whoever holds EVAL_TOKEN: Claude judges two sets of gift
// proposals for the same person. Used to calibrate the judge on Francesco's blind votes and,
// once calibrated, to compare engine versions. Never reachable without the token.
const EVAL_PAIRS_PER_REQUEST=6;

const JUDGE_SYSTEM_V1=`Sei il giudice di qualità di 3Gifts, un sito italiano che propone tre idee regalo per una persona descritta in un questionario.
Ricevi la descrizione della persona e due proposte, A e B, ciascuna con fino a tre prodotti Amazon (titolo e prezzo). Decidi quale delle due regaleresti davvero a quella persona, oppure "pari" se sono equivalenti o entrambe inadatte allo stesso modo.

Criteri, in ordine di importanza:
1. Adatto alla persona: età, genere, rapporto, occasione, budget, cose da evitare. Un prodotto per bambini a un adulto, da uomo per una donna, o fuori tema rispetto agli interessi è un errore grave.
2. Specifico e non generico: un regalo pensato per i suoi interessi e per quello che dice la nota vale più di uno che andrebbe bene per chiunque. Al livello giusto: niente kit da principiante a un esperto, niente attrezzatura base a chi ha già tutto.
3. Varietà: tre idee diverse tra loro valgono più di due varianti della stessa cosa.
4. Si userà davvero (per gli oggetti) e sembra un regalo, non un acquisto di servizio: niente set con aggiunte economiche, niente gadget da poche volte.
5. Usa bene il budget: un regalo molto al di sotto del budget sembra poco curato.
Una proposta con meno di tre prodotti o vuota è peggiore, salvo che l'altra contenga errori gravi.

Rispondi con il verdetto e un motivo breve in italiano (al massimo 25 parole).`;
// Version 2: Francesco's own criteria, learned only from the notes on half of his blind votes
// (the other half is kept to measure agreement honestly).
const JUDGE_SYSTEM_V2=`Sei il giudice di qualità di 3Gifts, un sito italiano che propone tre idee regalo per una persona descritta in un questionario.
Ricevi la descrizione della persona e due proposte, A e B, ciascuna con fino a tre prodotti Amazon (titolo e prezzo). Giudica come il fondatore del sito, che ha criteri precisi:

1. Errori gravi, che quasi squalificano una proposta: un prodotto per un'età o un genere diversi (per bambini a un adulto, da uomo per una donna); un prodotto fuori dai gusti indicati (un gioco per cani a chi ha un gatto, un vaso da terrario a chi non ha mai parlato di piante).
2. Centrare l'interesse specifico, non l'area generica. Per un runner servono cose da corsa, non una panca da palestra; per chi ama il trucco servono prodotti da trucco, non manicure o una collana; per l'orto servono cose per l'orto. Un prodotto solo vagamente collegato vale poco.
3. Le ripetizioni pesano molto: due prodotti simili nella stessa proposta (due pistole massaggianti, due giochi di carte simili) sono un difetto serio, anche se i singoli prodotti sono buoni.
4. L'occasione conta: un matrimonio chiede qualcosa di elegante o classico; per una nascita servono cose utili per il neonato e una per i genitori.
5. La quantità conta meno della pertinenza: due prodotti molto adatti possono battere tre prodotti mediocri, ma una proposta con meno di tre prodotti perde contro una proposta ugualmente adatta e completa.

"Pari" è una risposta frequente e legittima: usala quando entrambe hanno errori di peso simile, quando entrambe sono inadatte o quando sono equivalenti. Scegli A o B solo se la differenza è chiara.

Rispondi con il verdetto e un motivo breve in italiano (al massimo 25 parole).`;
const JUDGES={v1:JUDGE_SYSTEM_V1,v2:JUDGE_SYSTEM_V2};
const JUDGE_SCHEMA={type:'object',additionalProperties:false,required:['verdetto','motivo'],properties:{verdetto:{type:'string',enum:['A','B','pari']},motivo:{type:'string'}}};

function evalJson(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
const sideText=(name,items)=>`<proposta_${name}>\n${(items||[]).length?items.map((p,i)=>`${i+1}. ${String(p.title||'').slice(0,160)} — ${Number(p.price).toFixed(2)} €`).join('\n'):'(nessuna proposta)'}\n</proposta_${name}>`;

export async function judgePair(env,pair,version='v2'){
 const user=`<persona>${String(pair.label||'').slice(0,400)}</persona>\n${sideText('A',pair.A)}\n${sideText('B',pair.B)}`;
 return claudeJson(env,{system:JUDGES[version]||JUDGES.v2,user,schema:JUDGE_SCHEMA,effort:'medium',maxTokens:6000});
}

// Each pair is judged twice with A and B swapped: the judge must not favour the first proposal it reads.
export async function evalJudge(request,env){
 if(!env.EVAL_TOKEN||request.headers.get('X-Eval-Token')!==env.EVAL_TOKEN)return evalJson({code:'NotFound'},404);
 if(request.method!=='POST')return evalJson({code:'MethodNotAllowed'},405);
 let body;try{body=await request.json();}catch{return evalJson({code:'InvalidBody'},400);}
 const pairs=(Array.isArray(body?.pairs)?body.pairs:[]).slice(0,EVAL_PAIRS_PER_REQUEST);
 const results=await Promise.all(pairs.map(async pair=>{
  try{
   const version=body.judge==='v1'?'v1':'v2';
   const [first,second]=await Promise.all([judgePair(env,pair,version),judgePair(env,{...pair,A:pair.B,B:pair.A},version)]);
   const swapBack={A:'B',B:'A',pari:'pari'}[second.verdetto];
   return {id:pair.id,verdict:first.verdetto===swapBack?first.verdetto:'pari',consistent:first.verdetto===swapBack,first,second:{...second,verdettoRiportato:swapBack}};
  }catch(e){return {id:pair.id,error:e.message};}
 }));
 return evalJson({results});
}
