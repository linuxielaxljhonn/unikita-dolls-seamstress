/* ============================================================
   Acceso a Unikita Dolls Seamstress: contraseña de propietaria y
   códigos de invitación.
   acceso.json (v2) = { v:2, salt, iter, users:[{hash, rol, nombre, caduca, creada}] }
   Solo se guardan huellas PBKDF2-SHA256, nunca contraseñas ni códigos.
   Si acceso.json no existe, la app se abre sin contraseña (modo propietaria).
   Es una barrera de acceso a la app: el código es público en el repositorio.
   ============================================================ */
(function () {
  const KEY = 'unikita_acceso';
  const html = document.documentElement;
  html.classList.add('lk');
  const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function derive(pw, saltB64, iter) {
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pw).trim().normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
    return b64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(saltB64), iterations: iter }, k, 256));
  }
  function normalize(cfg) {
    if (!cfg || !cfg.salt || !cfg.iter) return null;
    if (Array.isArray(cfg.users)) return { v: 2, salt: cfg.salt, iter: cfg.iter, users: cfg.users.filter(u => u && u.hash) };
    if (cfg.hash) return { v: 2, salt: cfg.salt, iter: cfg.iter, users: [{ hash: cfg.hash, rol: 'propietaria', nombre: 'Propietaria' }] };
    return null;
  }
  const today = () => new Date().toISOString().slice(0, 10);
  const expired = u => u.caduca && today() > u.caduca;
  async function newConfig(ownerPw) {
    const salt = b64(crypto.getRandomValues(new Uint8Array(16))), iter = 210000;
    return { v: 2, salt, iter, users: [{ hash: await derive(ownerPw, salt, iter), rol: 'propietaria', nombre: 'Propietaria', creada: today() }] };
  }
  function genCode() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = crypto.getRandomValues(new Uint8Array(12));
    let s = ''; r.forEach((x, i) => { s += A[x % A.length]; if (i === 3 || i === 7) s += '-'; });
    return s;
  }
  const G = window.UGATE = { derive, normalize, newConfig, genCode, role: 'propietaria', user: null, cfg: null, today };

  function apply(u) {
    G.user = u || null;
    G.role = !u || u.rol === 'propietaria' ? 'propietaria' : 'invitada';
    html.classList.toggle('guest', G.role !== 'propietaria');
    html.classList.remove('lk');
    const g = document.getElementById('gate'); if (g) g.remove();
    document.dispatchEvent(new CustomEvent('unikita-acceso', { detail: { role: G.role, user: G.user } }));
  }

  function show(cfg, why) {
    const g = document.createElement('div');
    g.id = 'gate';
    g.innerHTML = `<form class="gbox" autocomplete="on">
      <img src="logo.png" alt="Unikita Dolls">
      <h1>Unikita Dolls <small>Seamstress</small></h1>
      <p>Escribe tu contraseña o tu <b>código de invitación</b>.</p>
      <input type="text" name="username" value="unikita" autocomplete="username" hidden>
      <input type="password" id="gpw" autocomplete="current-password" placeholder="Contraseña o código" required>
      <label class="grem"><input type="checkbox" id="grem" checked> Recordar en este dispositivo</label>
      <button type="submit">Entrar</button>
      <div id="gmsg" role="alert">${why || ''}</div>
    </form>`;
    document.body.appendChild(g);
    const f = g.querySelector('form'), inp = g.querySelector('#gpw'), msg = g.querySelector('#gmsg'), btn = g.querySelector('button');
    setTimeout(() => inp.focus(), 50);
    let fails = 0;
    f.onsubmit = async e => {
      e.preventDefault();
      btn.disabled = true; btn.textContent = 'Comprobando…'; msg.textContent = '';
      try {
        let v = inp.value.trim();
        if (/^[a-z0-9]{4}-?[a-z0-9]{4}-?[a-z0-9]{4}$/i.test(v)) v = v.toUpperCase().replace(/-/g, '').replace(/(.{4})(.{4})(.{4})/, '$1-$2-$3');
        const h = await derive(v, cfg.salt, cfg.iter);
        const u = cfg.users.find(x => x.hash === h);
        if (u && expired(u)) { msg.textContent = 'Esta invitación caducó el ' + u.caduca.split('-').reverse().join('/') + '.'; }
        else if (u) {
          try { (g.querySelector('#grem').checked ? localStorage : sessionStorage).setItem(KEY, h); } catch (x) { }
          apply(u); return;
        } else {
          fails++;
          msg.textContent = 'Contraseña o código incorrecto';
          f.classList.remove('shake'); void f.offsetWidth; f.classList.add('shake');
          inp.select();
          if (fails >= 5) await new Promise(r => setTimeout(r, 3000));
        }
      } catch (x) { msg.textContent = 'Este navegador no permite comprobar el acceso (necesita HTTPS).'; }
      btn.disabled = false; btn.textContent = 'Entrar';
    };
  }

  function start() {
    fetch('acceso.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(raw => {
      const cfg = normalize(raw); G.cfg = cfg;
      if (!cfg || !cfg.users.length || !window.crypto || !crypto.subtle) return apply(null);
      let tok = null;
      try { tok = localStorage.getItem(KEY) || sessionStorage.getItem(KEY); } catch (x) { }
      const u = tok && cfg.users.find(x => x.hash === tok);
      if (u && !expired(u)) return apply(u);
      show(cfg, u && expired(u) ? 'Tu invitación ha caducado. Pide un código nuevo.' : (tok ? 'Tu acceso ha cambiado: vuelve a escribir la contraseña o el código.' : ''));
    }).catch(() => apply(null));
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  G.lock = () => { try { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); } catch (x) { } location.reload(); };
})();
