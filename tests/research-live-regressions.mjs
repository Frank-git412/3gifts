import test from 'node:test';
import assert from 'node:assert/strict';
import {checkProductRequirements,ageListingConflict,declaredMinimumAge} from '../server/research/product-requirements.mjs';
import {planResearchAnswers,matchResearchProduct,selectResearchIdeas} from '../server/research/research-engine.mjs';
import {primaryProductType} from '../server/research/product-identity.mjs';
const context={connections:['bluetooth','usb_c']};
test('Observed mini projectors share one idea even when one title advertises a speaker',()=>{
 const plan=planResearchAnswers({age:'adult',interests:['techGaming'],subcategories:{techGaming:['tech']},min:30,max:100,recipientContext:context});
 const q=plan.candidateQueries.find(q=>q.family==='cinema');assert.ok(q);
 plan.queries=[q];plan.fallbackQueries=[];
 const titles=['Mini Proiettore Portatile [App Integrata] 1080P 4K WiFi 6 BT5.2 Android 14','[Apps integrate & 2026 Upgraded] Mini Proiettore con WiFi 6 Bluetooth e Speaker','Mini video projector with speaker'];
 const items=titles.map((title,i)=>({asin:'B00000000'+i,title,features:'Mini proiettore per film a casa',price:60,researchQueryIds:[q.id]}));
 for(const p of items)assert.equal(primaryProductType(p.title),'projector');
 const selected=selectResearchIdeas(items,plan);assert.equal(selected.products.length,1);
 assert.ok(selected.finalSelection.filter(p=>p.status==='not_selected').every(p=>p.reason==='equivalent_function'));
 assert.equal(matchResearchProduct({title:'Speaker per mini proiettore',features:'Mini proiettore cinema'},q),0);
 assert.equal(matchResearchProduct({title:'Custodia per mini proiettore',features:'Mini proiettore cinema'},q),0);
});
test('Observed computer desk is excluded from a computer query; genuine laptops remain eligible',()=>{
 const q={keywords:'computer portatile',originalKeyword:'notebook'};
 assert.equal(matchResearchProduct({title:'InnovaGoods Scrivania portatile per computer con cuscino XL Deskion',features:''},q),0);
 assert.equal(matchResearchProduct({title:'Supporto Notebook da DJ e Proiettore, Supporto Laptop Scrivania',features:''},q),0);
 assert.ok(matchResearchProduct({title:'Lenovo Notebook computer portatile 14 pollici',features:''},q)>0);
 // A support is still a legitimate product for a support query.
 assert.ok(matchResearchProduct({title:'Supporto Notebook da DJ e Proiettore',features:''},{keywords:'supporto notebook'})>0);
});
test('Observed SATA storage dock is not a USB-C peripheral hub, including an affirmative connector mention',()=>{
 const q={keywords:'hub usb-c',recipientContext:context};
 assert.equal(checkProductRequirements({title:'FANTEC hard disk docking station 5x SATA SSD HDD USB HUB',features:'Collegamento USB-C'},q).passed,false);
 assert.equal(checkProductRequirements({title:'Lemorele Hub USB-C 9 in 1 HDMI Ethernet PD 100W',features:''},q).passed,true);
});
test('Declared age excludes the observed 14+ puzzle from 0–6; months and conditional overlap remain distinct',()=>{
 const bad={title:'Ravensburger Puzzle 2000 Pezzi Animali Selvatici, Bambini Dai 14 Anni In Su'};
 assert.equal(ageListingConflict(bad,'earlyChild').conflict,true);
 assert.equal(ageListingConflict(bad,'child').conflict,true);
 assert.equal(declaredMinimumAge({title:'Kit esperimenti bambini 8+ Anni, 50 Pezzi'}),8);
 assert.equal(ageListingConflict({title:'Kit esperimenti bambini 8+ Anni'},'child').conflict,false);
 assert.equal(declaredMinimumAge({title:'Gioco dai 18 mesi'}),1.5);
 assert.equal(declaredMinimumAge({title:'Tablet 14GB RAM+256GB ROM'}),null);
 assert.equal(declaredMinimumAge({title:'Puzzle 2000 pezzi'}),null);
 const plan=planResearchAnswers({age:'earlyChild',interests:['earlyLearning'],subcategories:{earlyLearning:['earlyLearning_firstPuzzles']},min:20,max:60});const q=plan.queries[0];
 const result=selectResearchIdeas([{...bad,asin:'B00069L7YS',price:34.15,researchQueryIds:[q.id]}],plan);
 assert.equal(result.products.length,0);assert.equal(result.rejections[0].reason,'declared_age_conflict');
});
test('Computer supports have one concept even when retrieved through different query families',()=>{
 const plan=planResearchAnswers({age:'adult',interests:['techGaming'],subcategories:{techGaming:['tech']},effect:'relax',min:30,max:100,exclude:'cuffie, auricolari',recipientContext:context});const qs=[...plan.queries,...plan.fallbackQueries];const q=qs.find(q=>q.keywords==='supporto notebook');assert.ok(q);
 const candidates=['Pyle Supporto Notebook da DJ','BONTEC Supporto Laptop per Monitor'].map((title,i)=>({title,features:'',asin:'B00000000'+i,price:35,researchQueryIds:[q.id]}));
 assert.equal(selectResearchIdeas(candidates,plan).products.length,1);
});
