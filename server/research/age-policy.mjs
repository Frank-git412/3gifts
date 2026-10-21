// Editorial pilot vocabulary, not measured demographic preferences.
export const SUBCATEGORIES={
 reading:{fiction:{label:'Narrativa e avventura',terms:['avventura','novel'],match:/\b(romanzo|romanzi|narrativa|avventura)\b/i},romance:{label:'Romanzi romantici',terms:['romantico'],match:/\b(romantic\w*|romance|amore|love story|romanzo rosa)\b/i},accessories:{label:'Accessori per leggere',terms:['accessori'],match:/\b(lampad\w*|supporto|segnalibr\w*|leggii|leggio)\b/i}},
 skincare:{serums:{label:'Sieri',terms:['siero'],match:/\b(sier\w*|serum)\b/i},creams:{label:'Creme',terms:['crema'],match:/\b(crem\w*|cream)\b/i},masks:{label:'Maschere viso',terms:['maschera'],match:/\b(mascher\w*|mask\w*)\b/i}},
 technology:{audio:{label:'Cuffie e audio',terms:['audio'],match:/\b(cuffi\w*|auricolar\w*|headphone\w*|speaker)\b/i},ereaders:{label:'Lettori ebook',terms:['lettore'],match:/\b(ebook|e-reader|kindle|kobo)\b/i},charging:{label:'Ricarica e accessori da viaggio',terms:['viaggio'],match:/\b(power bank|batteria portatile|ricaric\w*|caricator\w*)\b/i}}
};
export const AGE_BANDS={youngAdult:'18–24 anni',adult25:'25–32 anni',adult:'33–54 anni',senior:'55 anni e oltre',teen:'13–17 anni',child:'7–12 anni',earlyChild:'0–6 anni'};
export function ageBand(value){if(!Object.hasOwn(AGE_BANDS,value))throw Error('Seleziona una fascia d’età valida.');return value;}
export function isAdultBand(age){return ['youngAdult','adult25','adult','senior'].includes(age);}
export const MINOR_AGE_NOTICE='Verifica l’età consigliata e le avvertenze del produttore prima dell’acquisto.';
const minorAudience=/\b(young[ -]adult|teen(?:ager)?s?|adolescent\w*|per ragazzi|per ragazzine|per bambini|high school)\b/i;
const youngerAdultAudience=/\b(new[ -]adult|college romance|diciottesimo|ventesimo|18\s*(?:[-–]|a)\s*24(?:\s*anni)?|per ventenni)\b/i;
export function keywordAllowed(text,age){
 if(!isAdultBand(age))return true;
 if(age==='youngAdult')return !/\b(per bambini|per ragazzine|high school)\b/i.test(text);
 if(minorAudience.test(text))return false;
 return !['adult','senior'].includes(age)||!youngerAdultAudience.test(text);
}
export const AGE_EXPANSIONS=[
 {area:'reading',subcategories:['fiction'],query:'romanzo young adult',ages:['youngAdult'],reason:'Associazione editoriale per giovani adulti'},
 {area:'reading',subcategories:['romance'],query:'romanzo new adult',ages:['youngAdult','adult25'],reason:'Associazione editoriale per giovani adulti'}
];
export function normalizeSubcategories(raw,interests){
 const selected={};for(const area of interests){const values=raw?.[area];if(values!==undefined&&!Array.isArray(values))throw Error('Sottocategorie non valide.');const ids=[...new Set(values||[])];if(ids.some(id=>!Object.hasOwn(SUBCATEGORIES[area],id)))throw Error('Sottocategoria non riconosciuta.');selected[area]=ids;}return selected;
}
export function matchesSubcategories(text,area,selected){const ids=selected?.[area]||[];return !ids.length||ids.some(id=>SUBCATEGORIES[area][id].match.test(text));}
