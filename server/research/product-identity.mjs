// Shared primary-object evidence for relevance and diversity. Earliest explicit
// object wins: a VR headset "for smartphone, with headphones" remains a headset.
const identityText=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const objectPatterns=[
 ['greeting_card',/\b(?:bigliett\w*|greeting card|birthday card)\b/],
 ['poster',/\b(?:poster|manifesto|stampa decorativa|insegne?|cartell[oi]|targhe?|targa|quadrett[oi]|quadro|arte murale|wall art)\b/],
 ['keyring',/\b(?:portachiavi|keyring|keychain)\b/],
 ['clothing',/\b(?:magliett\w*|t-shirt|felp\w*|guanti|gloves)\b/],
 ['computer_support',/\b(?:base di raffreddamento|supporto|stand|scrivania|tavolino)\b[^,.]{0,45}\b(?:laptop|notebook|computer|monitor|pc)\b/],
 ['phone_support',/\b(?:supporto|stand)\b[^,.]{0,35}\b(?:smartphone|cellulare|telefono)\b/],
 ['powerbank',/\b(?:power\s?bank|batteria esterna|batteria portatile|caricabatterie portatile)\b/],
 ['speaker',/\b(?:cassa (?:bluetooth|portatile|audio)|casse (?:bluetooth|portatili|audio)|altoparlant[ei]|speaker)\b/],
 ['projector',/\b(?:proiettore|videoproiettore|projector)\b/],
 ['device_accessory',/\b(?:custodia|cover|pellicola|caricatore|alimentatore|borsa|zaino)\b/],
 ['vr_headset',/\b(?:visore|visori|occhiali (?:3d|vr)|vr headset)\b/],
 ['cd_player',/\b(?:lettor[ei] (?:di )?cd|cd player)\b/],
 ['turntable',/\b(?:giradischi|turntable)\b/],
 ['keyboard',/\b(?:tastier[ae]|keyboards?)\b/],
 ['usb_hub',/\b(?:hub usb(?:[ -]?c)?|usb(?:[ -]?c)? hubs?|docking station|dock\b[^,.]{0,25}\busb)\b/],
 ['graphics_tablet',/\b(?:tablets? grafic[oi]|tavolett[ae] grafic(?:a|he)|(?:graphics?|drawing|pen) tablets?)\b/],
 ['laptop',/\b(?:laptop|notebook|computer portatile|pc portatile)\b/],
 ['smartphone',/\b(?:smartphone|cellular[ei])\b/],
 ['tablet',/\btablet\b/],
 ['headphones',/\b(?:cuffie|auricolari|headphones|earbuds|headset)\b/],
 ['microphone',/\b(?:microfon[oi]|microphones?)\b/],
 ['ereader',/\b(?:lettore (?:di )?e[ -]?book|lettore di libri elettr(?:ic|onic)o|e[ -]?book (?:reader|lettore)|e[ -]?reader)\b/],
 ['digital_frame',/\b(?:cornice\b[^,.]{0,25}\bdigital[ei]|digital (?:(?:photo|picture) )?frame)\b/],
 ['mug',/\b(?:tazza|tazze|mug|mugs)\b/],
 ['apron',/\b(?:grembiul\w*|apron\w*)\b/],
 ['weights',/\b(?:manubri|manubrio|pesi|kettlebell|dumbbells?)\b/],
 ['rattle',/\b(?:sonagl\w*|rattles?|gioc\w* da afferrare)\b/]
];
export function primaryProductType(title){
 const text=identityText(title),found=objectPatterns.flatMap(([type,re])=>{const m=re.exec(text);return m?[{type,index:m.index}]:[];});
 found.sort((a,b)=>a.index-b.index);return found[0]?.type||null;
}
export function requestedPrimaryType(query){
 const s=identityText(query.originalKeyword||query.keywords||'').trim();
 if(/^(?:base di raffreddamento|supporto|stand|scrivania|tavolino)\b[^,.]{0,45}\b(?:laptop|notebook|computer|monitor|pc)\b/.test(s))return 'computer_support';
 if(/^(?:supporto|stand)\b[^,.]{0,35}\b(?:smartphone|cellulare|telefono)\b/.test(s))return 'phone_support';
 if(/^(?:cuffie|auricolari|headphones|earbuds)\b/.test(s))return 'headphones';
 if(/^(?:microfon[oi]|microphones?)\b/.test(s))return 'microphone';
 if(/^(?:(?:mini|video|portable) )?(?:proiettore|videoproiettore|projector)\b/.test(s))return 'projector';
 if(/^(?:cornice digitale|digital photo frame)\b/.test(s))return 'digital_frame';
 if(/^(?:power\s?bank|batteria esterna|batteria portatile|caricabatterie portatile)\b/.test(s))return 'powerbank';
 if(/^(?:cassa (?:bluetooth|portatile|audio)|casse (?:bluetooth|portatili|audio)|altoparlant[ei]|speaker)\b/.test(s))return 'speaker';
 if(/^(?:smartphone|cellulare)\b/.test(s))return 'smartphone';
 if(/^(?:notebook|laptop|computer portatile|pc portatile)\b/.test(s))return 'laptop';
 if(/^(?:tablets? grafic[oi]|tavolett[ae] grafic(?:a|he)|(?:graphics?|drawing|pen) tablets?)\b/.test(s))return 'graphics_tablet';
 if(/^(?:tastier[ae]|keyboards?)\b/.test(s))return 'keyboard';
 if(/^(?:hub usb(?:[ -]?c)?|usb(?:[ -]?c)? hubs?|docking station|dock)\b/.test(s))return 'usb_hub';
 if(/^tablet\b/.test(s))return 'tablet';
 if(/^lettore (?:di )?cd\b/.test(s))return 'cd_player';
 if(/^giradischi\b/.test(s))return 'turntable';
 if(/^(?:pesi|manubri|kettlebell)\b/.test(s))return 'weights';
 if(/^(?:sonagl\w*|gioc\w* da afferrare)\b/.test(s))return 'rattle';
 return null;
}
