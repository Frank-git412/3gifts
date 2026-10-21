// Independent product descriptions, not generated from the implementation's patterns.
export const cases=[
 ['K003','Romanzo Il bosco','Novel The forest','Romanzo sulla natura','Novel about nature','Copertina con paesaggio della natura','Cover showing nature'],
 ['K004','Romanzo In cammino','Novel On the road','Romanzo di viaggio','Travel novel','Guida turistica illustrata','Illustrated travel guide'],
 ['K009','Luce lettura Orion','Orion reading light','Portatile da viaggio','Portable travel reading light','Da scrivania con cavo fisso','Desk model with fixed cord'],
 ['K010','Segnalibro Arco','Arco bookmark','Con elastico','Elastic band','Chiusura magnetica','Magnetic closure'],
 ['K011','Segnalibro Arco','Arco bookmark','Illustrato','Illustrated','Personalizzato con nome','Personalized name'],
 ['K012','Segnalibro Arco','Arco bookmark','Carta plastificata','Laminated paper','Plastica impermeabile','Waterproof plastic'],
 ['K013','Power bank Uno','Uno power bank','Cavo USB-C integrato','Built-in USB-C cable','Porta USB-C. Cavo separato','USB-C port. Separate cable'],
 ['K014','Power bank Uno','Uno power bank','Cavo USB-C retrattile','Retractable USB-C cable','Cavo USB-C integrato fisso','Fixed built-in USB-C cable'],
 ['K015','Power bank Uno','Uno power bank','Uscita singola porta 45W. USB PD','45W single-port output. USB PD','Ingresso 45W. Uscita 30W. USB PD','45W input. Output 30W. USB PD'],
 ['K016','Cuffie Voce','Voice headset','Connessione cablata USB-C. Microfono','Wired USB-C. Microphone','Bluetooth. Microfono. USB-C solo ricarica','Bluetooth. Microphone. USB-C charging only'],
 ['K017','Cuffie Voce','Voice headset','Microfono con riduzione del rumore. Connessione cablata USB-C','Noise-cancelling microphone. Wired USB-C','Cancellazione attiva ANC nei padiglioni. Microfono. Connessione cablata USB-C','ANC headphones. Microphone. Wired USB-C'],
 ['K019','Cornice digitale Casa','Casa digital frame','Invio foto da smartphone. Frameo. App gratuita','Send photos from your phone. Frameo. Free app','Visualizza foto da scheda SD','Displays photos from SD card'],
 ['K020','Cornice digitale Casa','Casa digital frame','Invio foto a distanza. Frameo. App gratuita','Remote photo sharing. Frameo. Free app','Invio foto da smartphone solo locale. Frameo. App gratuita','Phone photo sharing. Local only. Frameo. Free app'],
 ['K022','Hub USB-C Nodo','Node USB-C hub','HDMI 4K a 30Hz','HDMI 4K at 30Hz','HDMI 4K. Frequenza non specificata','HDMI 4K. Refresh rate unspecified'],
 ['K023','Hub USB-C Nodo','Node USB-C hub','Lettore SD e microSD','SD reader. MicroSD reader','Schede SD e microSD incluse','SD and microSD cards included'],
 ['K025','Detergente viso Mousse','Mousse facial cleanser','Crema-schiuma','Cream-to-foam','Set crema e schiuma','Set of cream and foam'],
 ['K027','Detergente viso Mousse','Mousse facial cleanser','Con ceramidi','With ceramides','Un altro prodotto della linea contiene ceramidi','Other product in this range contains ceramides'],
 ['K028','Detergente viso Mousse','Mousse facial cleanser','Struccante','Makeup-removing','Detergente delicato','Gentle cleanser'],
 ['K031','Acqua micellare Fresca','Fresh micellar water','Struccante viso e occhi','Makeup remover for face and eyes','Struccante viso','Makeup remover for face'],
 ['K032','Acqua micellare Fresca','Fresh micellar water','Uso quotidiano','Daily use','Usare secondo necessità','Use as needed'],
 ['K034','Crema mani Care','Care hand cream','Con ceramidi','With ceramides','Crema idratante','Moisturizing cream'],
 ['K035','Crema mani Care','Care hand cream','Rapido assorbimento','Fast-absorbing','Non grassa','Non-greasy']
].map(([id,titleIt,titleEn,featureIt,featureEn,trapIt,trapEn])=>({id,titleIt,titleEn,featureIt,featureEn,trapIt,trapEn}));
export function compatibility(id,lang='it'){
 const keys=['K013','K014'].includes(id)?['usb']:id==='K015'?['usb','pd']:['K016','K017','K023'].includes(id)?['usb','os']:id==='K022'?['usb','os','video']:['K019','K020'].includes(id)?['phone','app','network']:[];
 const declarations={it:{usb:'Il dispositivo supporta USB-C.',pd:'Il dispositivo supporta USB PD 45W.',os:'Il dispositivo usa Windows.',video:'Il dispositivo supporta uscita video USB-C 4K a 30Hz.',phone:'Il telefono usa Android.',app:'Il telefono usa Frameo.',network:'Il telefono ha WiFi e internet.'},en:{usb:'The device supports USB-C.',pd:'The device supports USB PD 45W.',os:'The device uses Windows.',video:'The device supports video output USB-C 4K at 30Hz.',phone:'The phone uses Android.',app:'The phone uses Frameo.',network:'The phone has WiFi and internet.'}};
 const evidence={usb:'USB-C.',pd:'USB PD.',os:'Windows.',video:'',phone:'Android.',app:'',network:'WiFi and internet.'};
 return {note:keys.map(k=>declarations[lang][k]).join(' '),features:keys.map(k=>evidence[k]).join(' ')};
}
