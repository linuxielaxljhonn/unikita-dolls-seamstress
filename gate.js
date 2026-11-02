/* ============================================================
   Pantalla de acceso de Unikita Dolls Seamstress.
   La contraseña nunca se guarda: acceso.json solo contiene una huella
   PBKDF2-SHA256 (sal + 210.000 iteraciones). Si acceso.json no existe,
   la app se abre sin contraseña.
   Nota: es una barrera de acceso a la app, no cifra el código, que es
   público en el repositorio.
   ============================================================ */
(function () {
  const KEY = 'unikita_acceso';
  const html = document.documentElement;
  html.classList.add('lk');
  const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function derive(pw, saltB64, iter) {
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw.normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
    return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(saltB64), iterations: iter }, k, 256));
  }
  async function makeAccess(pw) {
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    const iter = 210000;
    return { v: 1, salt, iter, hash: await derive(pw, salt, iter) };
  }
  window.UGATE = { makeAccess };
  const open = () => { html.classList.remove('lk'); const g = document.getElementById('gate'); if (g) g.remove(); };

  function show(cfg) {
    const g = document.createElement('div');
    g.id = 'gate';
    g.innerHTML = `<form class="gbox" autocomplete="on">
      <img src="logo.png" alt="Unikita Dolls">
      <h1>Unikita Dolls <small>Seamstress</small></h1>
      <p>Introduce la contraseña del taller para entrar.</p>
      <input type="text" name="username" value="unikita" autocomplete="username" hidden>
      <input type="password" id="gpw" autocomplete="current-password" placeholder="Contraseña" required>
      <label class="grem"><input type="checkbox" id="grem" checked> Recordar en este dispositivo</label>
      <button type="submit">Entrar</button>
      <div id="gmsg" role="alert"></div>
    </form>`;
    document.body.appendChild(g);
    const f = g.querySelector('form'), inp = g.querySelector('#gpw'), msg = g.querySelector('#gmsg'), btn = g.querySelector('button');
    setTimeout(() => inp.focus(), 50);
    let fails = 0;
    f.onsubmit = async e => {
      e.preventDefault();
      btn.disabled = true; btn.textContent = 'Comprobando…'; msg.textContent = '';
      try {
        const h = await derive(inp.value, cfg.salt, cfg.iter);
        if (h === cfg.hash) {
          const tok = cfg.hash;
          try { (g.querySelector('#grem').checked ? localStorage : sessionStorage).setItem(KEY, tok); } catch (x) { }
          open(); return;
        }
        fails++;
        msg.textContent = 'Contraseña incorrecta';
        f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
        inp.select();
        if (fails >= 5) await new Promise(r => setTimeout(r, 3000));
      } catch (x) { msg.textContent = 'Este navegador no permite comprobar la contraseña (necesita HTTPS).'; }
      btn.disabled = false; btn.textContent = 'Entrar';
    };
  }

  function start() {
    fetch('acceso.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(cfg => {
      if (!cfg || !cfg.hash || !cfg.salt || !cfg.iter || !window.crypto || !crypto.subtle) return open();
      let tok = null;
      try { tok = localStorage.getItem(KEY) || sessionStorage.getItem(KEY); } catch (x) { }
      if (tok && tok === cfg.hash) return open();
      show(cfg);
    }).catch(open);
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  window.UGATE.lock = () => { try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch (x) { } location.reload(); };
})();
