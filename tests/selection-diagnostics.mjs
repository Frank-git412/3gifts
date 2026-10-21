import test from 'node:test';import assert from 'node:assert/strict';
import {publicPlan,publicCandidate} from '../server/research/public-adapter.mjs';
import {selectResearchIdeas} from '../server/research/research-engine.mjs';
test('Every candidate receives a final decision, with concrete duplicates linked to the chosen ASIN',()=>{
 const ctx=publicPlan({profile:{ageRange:'adult',interests:['techGaming'],subinterests:['tech'],budget:100,minBudget:15}}),query=ctx.plan.queries[0];
 const product=(asin,title=query.keywords,price=40,parentAsin=null)=>publicCandidate({asin,title,price,parentAsin,features:title,url:'https://www.amazon.it/dp/'+asin,researchQueryIds:[query.id]},ctx);
 const a=product('B000000001'),b=product('B000000002'),outside={...a,asin:'B000000003',price:200},mismatch={...a,asin:'B000000004',researchQueryIds:[]};
 const result=selectResearchIdeas([a,b,outside,mismatch],ctx.plan);
 assert.equal(result.finalSelection.length,4);assert.equal(result.products.length,1);
 const decisions=new Map(result.finalSelection.map(d=>[d.asin,d]));
 const winner=result.products[0].asin,other=winner===a.asin?b.asin:a.asin;
 assert.equal(decisions.get(winner).status,'selected');assert.equal(decisions.get(other).reason,'equivalent_function');assert.equal(decisions.get(other).duplicateOf,winner);
 assert.equal(decisions.get(outside.asin).reason,'outside_budget');assert.equal(decisions.get(mismatch.asin).reason,'product_type_or_query_mismatch');
});
