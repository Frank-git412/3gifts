(() => {
  const english = document.documentElement.lang.startsWith('en');
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (new URLSearchParams(location.search).get('app') === '1' || standalone) {
    document.querySelector('#startQuestionnaire')?.click();
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', {updateViaCache: 'none'}).catch(() => {});
  if (standalone) return;
  let installEvent;
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = english ? 'Install 3Regali' : 'Installa 3Regali';
  const message = document.createElement('p');
  message.id = 'appInstallHelp';
  message.hidden = true;
  message.setAttribute('role', 'status');
  message.style.cssText = 'max-width:48rem;margin:1rem auto;padding:0 1rem;font-size:1rem;line-height:1.6';
  button.setAttribute('aria-controls', message.id);
  button.setAttribute('aria-expanded', 'false');
  document.querySelector('footer')?.append(button);
  document.querySelector('footer')?.after(message);
  addEventListener('beforeinstallprompt', event => {event.preventDefault(); installEvent = event;});
  addEventListener('appinstalled', () => {button.hidden = true;message.hidden = true;installEvent = null;});
  button.addEventListener('click', async () => {
    if (installEvent) {
      const prompt = installEvent; installEvent = null;
      try {await prompt.prompt(); const result = await prompt.userChoice; if(result.outcome === 'accepted') return;} catch {}
    }
    message.textContent = english
      ? 'No account or email needed. On iPhone/iPad, open this site in Safari, then Share → Add to Home Screen. On Android, use your browser menu → Install app / Add to Home screen, if available. An internet connection is required for gift suggestions.'
      : 'Nessun account e nessuna email. Su iPhone/iPad apri il sito in Safari, poi Condividi → Aggiungi alla schermata Home. Su Android usa il menu del browser → Installa app / Aggiungi a schermata Home, se disponibile. Per cercare i regali serve una connessione internet.';
    message.hidden = false;button.setAttribute('aria-expanded', 'true');
    message.scrollIntoView({block:'nearest'});
  });
})();
