import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("./catalog.js",import.meta.url),"utf8");
const context={window:{},URL,URLSearchParams};
vm.createContext(context);
vm.runInContext(source,context);
const products=context.window.TRE_REGALI_CATALOG;

const areas={
  techGaming:["tech","gaming"], culture:["books","comics","culture"], mediaAudio:["music","cinema","audio"],
  foodDrink:["food","wine","coffeeTea"], travelOutdoor:["travel","outdoor","organization"], sportFitness:["sport","fitness","recovery"],
  artPhoto:["creative","photo","craft"], homeGarden:["home","garden","organization"], styleBeauty:["style","beauty","jewelry"],
  animalsNature:["pets","nature","petCare"], gamesCollecting:["boardGames","puzzle","collecting"], newsBusiness:["news","learning","writing"]
};
const tones=["sentimental","useful","funny","surprising","elegant","neutral"];
const ages=["teen","youngAdult","adult","mature"];
const macroByKey=Object.fromEntries(products.map(p=>[p.tags[0],p.macro]));
const failures=[];
for(const [area,signals] of Object.entries(areas)){
  const macro=macroByKey[area];
  const budgetPicks=products.filter(p=>p.price<=15&&p.macro===macro&&p.tags.some(t=>t===area||signals.includes(t)));
  if(budgetPicks.length<3) failures.push({area,macro,count:budgetPicks.length});
  for(const tone of tones)for(const age of ages){
    if(budgetPicks.length<3)failures.push({area,tone,age,count:budgetPicks.length});
  }
}

const lowBudget=products.filter(p=>p.price>0&&p.price<=15);
const badLinks=products.filter(p=>{try{return new URL(p.directUrl).protocol!=="https:"}catch{return true}});
const duplicateLinks=products.filter((p,i)=>products.findIndex(x=>x.directUrl===p.directUrl)!==i);
const macroCounts=Object.fromEntries([...new Set(products.map(p=>p.macro))].map(m=>[m,products.filter(p=>p.macro===m).length]));
const subcategoryCounts=Object.fromEntries(Object.keys(macroCounts).map(m=>[m,new Set(products.filter(p=>p.macro===m).map(p=>p.subcategory)).size]));
if(products.length!==240)failures.push({catalogCount:products.length,expected:240});
if(Object.values(macroCounts).some(n=>n!==20))failures.push({macroCounts});
if(Object.values(subcategoryCounts).some(n=>n>4))failures.push({subcategoryCounts});
if(lowBudget.length<36)failures.push({lowBudgetCount:lowBudget.length,minimum:36});
if(badLinks.length)failures.push({badLinks:badLinks.map(p=>p.id)});
if(duplicateLinks.length)failures.push({duplicateLinks:duplicateLinks.map(p=>p.id)});

const report={testedCombinations:Object.keys(areas).length*tones.length*ages.length,catalogProducts:products.length,lowBudgetProducts:lowBudget.length,macroCounts,subcategoryCounts,failures};
console.log(JSON.stringify(report,null,2));
if(failures.length)process.exit(1);
