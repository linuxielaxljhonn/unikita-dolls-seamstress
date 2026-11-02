/* ============================================================
   ILUSTRADOR DE FIGURINES — dibuja cada prenda sobre un maniquí neutro
   a partir de la prenda base y sus opciones. SVG 200 × 290.
   ============================================================ */
(function (root) {
  const f = v => Math.round(v * 10) / 10;
  const SK = '#efe6df', SKS = '#cdbdb2';
  const PAL = {
    falda: '#d9799b', vestido: '#c95c7f', vestido_pliegues: '#4f6fa8', vestido_recto: '#6aa58a', babydoll: '#e8a3b8', slip: '#c9a27a', victoriano: '#8e5b8f',
    camiseta: '#f2f0ea', top: '#e2786f', peplum: '#5f86b7', campesino: '#f5efe3', camisa: '#dfe9f5', body: '#262230', corse: '#7a2140', sudadera: '#9fb9a4',
    pantalon: '#3e4a61', short: '#e9b44c', vaquero: '#5b7fb5', cargo: '#7d7656', jogger: '#8f8c99', leggings: '#2b2b33',
    enterizo: '#c8643b', peto: '#5b7fb5', pichi: '#a3485a', chaleco: '#6b4f3a', bomber: '#56704f', vaquera: '#6d8fc2', blazer: '#2f3a52', abrigo: '#a87c58', kimono: '#d2604f', capa: '#6b2e43',
    bragas: '#f0c6d4', bikini: '#2fa3b5', banador: '#e05a6a', medias_cortas: '#ffffff', medias_largas: '#3a2f3a', pijama: '#bcd3ea', delantal: '#f3e7c8'
  };
  function shade(hex, a) { const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255; r = Math.max(0, Math.min(255, r + a)); g = Math.max(0, Math.min(255, g + a)); b = Math.max(0, Math.min(255, b + a)); return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1); }
  const M = x => 200 - x;
  const L = pts => pts.map((p, i) => (i ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1])).join(' ');
  const mirrorPts = pts => pts.slice().reverse().map(p => [M(p[0]), p[1]]);

  // ---------- maniquí ----------
  function figure() {
    let s = '';
    s += `<g fill="${SK}" stroke="${SKS}" stroke-width="1">`;
    // piernas
    [[1], [-1]].forEach(([d]) => {
      const X = x => d > 0 ? x : M(x);
      s += `<path d="${L([[X(73), 136], [X(99), 150], [X(94), 205], [X(93), 262], [X(85), 262], [X(80), 205]])} Z"/>`;
      s += `<ellipse cx="${X(89)}" cy="268" rx="6" ry="4"/>`;
      // brazos
      s += `<path d="${L([[X(74), 60], [X(81), 68], [X(64), 141], [X(57), 140]])} Z"/>`;
      s += `<ellipse cx="${X(60)}" cy="147" rx="4" ry="6"/>`;
    });
    s += `<path d="M93 44 L107 44 L108 52 L126 59 L123 77 L121 110 L129 136 L100 152 L71 136 L79 110 L77 77 L74 59 L92 52 Z"/>`;
    s += `<ellipse cx="100" cy="26" rx="14" ry="18"/>`;
    s += `</g>`;
    return s;
  }

  // ---------- piezas de dibujo ----------
  const st = (c) => `fill="${c}" stroke="${shade(c, -70)}" stroke-width="1.1" stroke-linejoin="round"`;
  const line = (pts, c, w, dash) => `<path d="${L(pts)}" fill="none" stroke="${c}" stroke-width="${w || 0.8}" ${dash ? `stroke-dasharray="${dash}"` : ''} stroke-linecap="round"/>`;

  // cuerpo superior: devuelve path. o: neck, bottom, hem (medio ancho bajo), loose, wrap
  function torsoPath(o) {
    const lo = o.loose || 0, by = o.bottom, top = o.neck;
    const sh = 26 + lo * 0.6, ua = 23 + lo, wa = 21 + lo * 1.3;
    const hem = o.hem != null ? o.hem : (by <= 110 ? 23 + lo + (21 - 23) * (by - 77) / 33 : wa + (31 - wa) * Math.min(1, (by - 110) / 28) + lo * 0.3);
    const right = [];
    let s;
    if (top === 'strapless' || top === 'tirantes') {
      const ty = 75;
      s = `M${100 - ua} ${ty + 1} Q100 ${top === 'tirantes' ? ty + 9 : ty - 3} ${100 + ua} ${ty + 1} `;
      right.push([100 + ua, ty + 1]);
    } else if (top === 'halter') {
      s = `M94 46 L106 46 `;
      right.push([100 + ua, 80]);
    } else {
      const ny = top === 'alto' ? 40 : 49;
      s = `M${92 - (top === 'ancho' ? 4 : 0)} ${ny} `;
      if (top === 'pico') s += `L100 82 `; else if (top === 'alto') s += `L100 ${ny + 1} `; else if (top === 'wrap') s += `L100 96 `; else s += `Q100 ${top === 'ancho' ? 62 : 60} ${108 + (top === 'ancho' ? 4 : 0)} ${ny} `;
      right.push([100 + sh, 59], [100 + ua, 77]);
    }
    if (by > 110) { right.push([100 + wa, 110]); if (by > 115) right.push([100 + hem, by]); else right.push([100 + hem, by]); }
    else right.push([100 + hem, by]);
    const left = mirrorPts(right);
    const pts = right.concat(left.slice(0));
    // completar
    let d = s + pts.map(p => 'L' + f(p[0]) + ' ' + f(p[1])).join(' ');
    if (o.point) d = d.replace(`L${f(100 + hem)} ${f(by)} L${f(M(100 + hem))} ${f(by)}`, `L${f(100 + hem)} ${f(by)} L100 ${f(by + o.point)} L${f(M(100 + hem))} ${f(by)}`);
    if (top === 'halter') d += ` L94 46`;
    return d + ' Z';
  }

  // manga a lo largo del brazo izquierdo (y espejo)
  function sleeve(type, c) {
    if (!type || type === 'sin') return '';
    const A = [76, 62], W = [60, 142];
    const ax = W[0] - A[0], ay = W[1] - A[1], len = Math.hypot(ax, ay), ux = ax / len, uy = ay / len, nx = -uy, ny = ux;
    const at = (t, w) => [[A[0] + ax * t + nx * w, A[1] + ay * t + ny * w], [A[0] + ax * t - nx * w, A[1] + ay * t - ny * w]];
    const prof = {
      corta: [[0, 9], [0.28, 8]], tres: [[0, 9], [0.68, 6.8]], larga: [[0, 9], [1, 6]],
      farol: [[0, 10], [0.12, 13], [0.26, 7.5]], obispo: [[0, 9], [0.85, 10.5], [0.93, 6.5], [1, 6]],
      jamon: [[0, 12], [0.18, 14], [0.4, 8], [1, 5.8]], kimono: [[0, 10], [0.35, 15], [0.62, 17]], abullonada: [[0.02, 9], [0.12, 11], [0.25, 8]]
    }[type] || [[0, 9], [1, 6]];
    const a = [], b = [];
    prof.forEach(([t, w]) => { const [p, q] = at(t, w); a.push(p); b.push(q); });
    if (type === 'kimono') { const e = at(0.62, 17); b[b.length - 1] = [e[1][0] + 2, e[1][1] + 14]; }
    const pts = a.concat(b.reverse());
    const mk = P => `<path d="${L(P)} Z" ${st(c)}/>`;
    let s = mk(pts) + mk(pts.map(p => [M(p[0]), p[1]]));
    if (type === 'obispo' || type === 'farol') { const cuff = type === 'obispo' ? [at(0.93, 6.5), at(1, 6)] : [at(0.22, 8), at(0.26, 7.5)]; const C = [cuff[0][0], cuff[1][0], cuff[1][1], cuff[0][1]]; s += `<path d="${L(C)} Z" ${st(shade(c, -18))}/><path d="${L(C.map(p => [M(p[0]), p[1]]))} Z" ${st(shade(c, -18))}/>`; }
    if (type === 'farol' || type === 'jamon') { const g = at(0.03, type === 'jamon' ? 11 : 9); s += line([g[0], at(0.06, 0)[0], g[1]], shade(c, -60), 0.6) + line([g[0], at(0.06, 0)[0], g[1]].map(p => [M(p[0]), p[1]]), shade(c, -60), 0.6); }
    return s;
  }

  // falda desde y0 con medio ancho inicial h0 hasta Y
  function skirtSVG(type, y0, Y, c, h0) {
    h0 = h0 || 21;
    const dk = shade(c, -70);
    const hipY = Math.min(Y, y0 + 26), hipH = Math.max(h0, 30);
    let s = '';
    const trap = (yt, ht, yb, hb, col, wave) => {
      let d = `M${f(100 - ht)} ${f(yt)} L${f(100 + ht)} ${f(yt)} L${f(100 + hb)} ${f(yb)} `;
      if (wave) { const n = wave; for (let i = 1; i <= n; i++) { const x1 = 100 + hb - (2 * hb) * (i - 0.5) / n, x2 = 100 + hb - (2 * hb) * i / n; d += `Q${f(x1)} ${f(yb + (i % 2 ? 6 : -1))} ${f(x2)} ${f(yb)} `; } }
      else d += `Q100 ${f(yb + 4)} ${f(100 - hb)} ${f(yb)} `;
      return `<path d="${d}Z" ${st(col || c)}/>`;
    };
    const fit = (hb) => `<path d="M${f(100 - h0)} ${y0} L${f(100 + h0)} ${y0} Q${f(100 + hipH + 1)} ${f(hipY - 6)} ${f(100 + hipH)} ${f(hipY)} L${f(100 + hb)} ${f(Y)} Q100 ${f(Y + 3)} ${f(100 - hb)} ${f(Y)} L${f(100 - hipH)} ${f(hipY)} Q${f(100 - hipH - 1)} ${f(hipY - 6)} ${f(100 - h0)} ${y0} Z" ${st(c)}/>`;
    const D = Y - y0;
    switch (type) {
      case 'recta': s = fit(hipH); break;
      case 'lapiz': s = fit(hipH - 4); s += line([[100, Y - D * 0.25], [100, Y]], dk, 0.7); break;
      case 'A': s = trap(y0, h0, Y, hipH + D * 0.32); break;
      case 'fruncida': s = trap(y0, h0, Y, hipH + D * 0.42, c, 7); for (let i = -3; i <= 3; i++) s += line([[100 + i * 6, y0 + 2], [100 + i * 9, y0 + 12]], dk, 0.6); break;
      case 'tableada': { const hb = hipH + D * 0.3; s = trap(y0, h0, Y, hb); for (let i = -4; i <= 4; i++) s += line([[100 + i * h0 / 4.5, y0 + 3], [100 + i * hb / 4.5, Y + 1]], dk, 0.6); break; }
      case 'circular': s = trap(y0, h0, Y, hipH + D * 0.62, c, 6); break;
      case 'semicircular': s = trap(y0, h0, Y, hipH + D * 0.42, c, 4); break;
      case 'pisos': { const n = 3, hs = D / n; for (let i = 0; i < n; i++) { const yt = y0 + hs * i, yb = y0 + hs * (i + 1) + (i < n - 1 ? 2 : 0); const ht = i ? hipH + 4 * i + (i - 1) * 6 : h0, hb = hipH + 8 + 9 * i; s += trap(yt, ht, yb, hb, shade(c, i * 10), 5 + i * 2); } break; }
      case 'tutu': { [[1, 0.35], [0.92, 0.45], [0.84, 0.6]].forEach(([k, op]) => { const yb = y0 + D * k; let d = `M${100 - h0} ${y0} L${100 + h0} ${y0} L${f(100 + hipH + D * 0.75)} ${f(yb)} `; const hb = hipH + D * 0.75; for (let i = 1; i <= 12; i++) d += `L${f(100 + hb - 2 * hb * (i - 0.5) / 12)} ${f(yb + (i % 2 ? 4 : -3))} `; d += `L${f(100 - hb)} ${f(yb)} Z`; s += `<path d="${d}" fill="${c}" fill-opacity="${op}" stroke="${dk}" stroke-width="0.6"/>`; }); break; }
      case 'globo': { const mx = hipH + D * 0.45, ym = y0 + D * 0.62; s = `<path d="M${100 - h0} ${y0} L${100 + h0} ${y0} C${f(100 + mx)} ${f(y0 + D * 0.15)} ${f(100 + mx + 4)} ${f(ym)} ${f(100 + hipH)} ${f(Y)} Q100 ${f(Y + 5)} ${f(100 - hipH)} ${f(Y)} C${f(100 - mx - 4)} ${f(ym)} ${f(100 - mx)} ${f(y0 + D * 0.15)} ${100 - h0} ${y0} Z" ${st(c)}/>`; s += line([[100 - hipH + 2, Y - 2], [100 + hipH - 2, Y - 2]], dk, 0.6, '2 1.5'); break; }
      case 'cruzada': { const hb = hipH + D * 0.3; s = trap(y0, h0, Y, hb); s += line([[100 - h0 + 3, y0], [100 + hb * 0.55, Y + 2]], dk, 1.1); s += line([[100 + h0, y0 + 2], [100 + h0 + 9, y0 + 14]], dk, 1.4) + line([[100 + h0, y0 + 2], [100 + h0 + 3, y0 + 16]], dk, 1.4); break; }
      case 'altabaja': { const hb = hipH + D * 0.42; s = trap(y0, h0, Y + D * 0.35, hb + 4, shade(c, -25), 4); s += trap(y0, h0, Y - D * 0.25, hb - 2, c, 4); break; }
      default: s = trap(y0, h0, Y, hipH + D * 0.3);
    }
    s += `<path d="M${100 - h0} ${y0} L${100 + h0} ${y0}" stroke="${dk}" stroke-width="1.1"/>`;
    return s;
  }

  // pantalón
  function pantsSVG(leg, len, c, o) {
    o = o || {};
    const dk = shade(c, -70);
    const Y = { corto: 162, bermuda: 192, capri: 228, largo: 262 }[len] || 262;
    const W = { recto: [12, 9.5, 9.5], pitillo: [11.5, 7, 5.5], acampanado: [12, 8, 15], palazzo: [15, 15, 18], barril: [13.5, 14, 7.5], leggings: [11, 6.5, 5], jogger: [12.5, 10, 6.5] }[leg] || [12, 9.5, 9.5];
    const cx = [88, 89, 89.5];
    const lerp = (a, b, t) => a + (b - a) * t;
    const R = [[121, 108], [129, 136]];
    if (Y > 205) {
      R.push([M(cx[0]) + W[0], 152], [M(cx[1]) + W[1], 205], [M(cx[2]) + W[2], Y], [M(cx[2]) - W[2], Y], [M(cx[1]) - W[1], 205]);
    } else {
      const t = (Y - 152) / 53, x = M(lerp(cx[0], cx[1], t)), w = lerp(W[0], W[1], t) + 1.5;
      if (Y > 160) R.push([M(cx[0]) + W[0], 152]);
      R.push([x + w, Y], [x - w, Y]);
    }
    R.push([100, 154]);
    const all = R.concat(R.slice(0, -1).reverse().map(p => [M(p[0]), p[1]]));
    let s = `<path d="${L(all)} Z" ${st(c)}/>`;
    s += line([[79, 108], [121, 108]], dk, 1.1);
    if (o.elastic) for (let i = -4; i <= 4; i++) s += line([[100 + i * 4.5, 108], [100 + i * 4.6, 112]], dk, 0.5);
    else s += line([[79.5, 113], [120.5, 113]], dk, 0.6);
    if (o.jeans) {
      const ts = '#e3b04b';
      s += line([[100, 113], [100, 140], [104, 145]], ts, 0.7, '1.2 1') + line([[106, 113], [106, 136], [100, 141]], ts, 0.7, '1.2 1');
      s += line([[84, 113], [80, 124]], ts, 0.7, '1.2 1') + line([[116, 113], [120, 124]], ts, 0.7, '1.2 1');
      for (let x of [83, 117, 100]) s += `<rect x="${x - 0.8}" y="108" width="1.6" height="5" fill="${dk}"/>`;
      if (Y > 205) s += line([[M(cx[1]) + W[1] - 1.5, 205], [M(cx[2]) + W[2] - 1.5, Y]], ts, 0.5, '1.2 1') + line([[cx[1] - W[1] + 1.5, 205], [cx[2] - W[2] + 1.5, Y]], ts, 0.5, '1.2 1');
    }
    if (o.cargo) [[77, 168], [M(77) - 14, 168]].forEach(([x, y]) => { s += `<rect x="${x}" y="${y}" width="14" height="16" rx="1" ${st(shade(c, 8))}/><rect x="${x}" y="${y}" width="14" height="5" ${st(shade(c, -8))}/>`; });
    if (o.cuff && Y > 205) [[cx[2], 1], [M(cx[2]), 1]].forEach(([x]) => { s += `<rect x="${f(x - W[2] - 0.5)}" y="${Y - 7}" width="${f(2 * W[2] + 1)}" height="7" ${st(shade(c, -15))}/>`; });
    if (o.drawstring) s += line([[98, 112], [96, 124]], '#fff', 0.8) + line([[102, 112], [104, 124]], '#fff', 0.8);
    return s;
  }

  const buttons = (x, y0, y1, n, c) => { let s = ''; for (let i = 0; i < n; i++) s += `<circle cx="${x}" cy="${f(y0 + (y1 - y0) * i / Math.max(1, n - 1))}" r="1.3" fill="${c}" stroke="${shade(c, -60)}" stroke-width="0.4"/>`; return s; };
  const collar = (c) => `<path d="M92 49 L86 51 L95 60 L100 56 Z" ${st(c)}/><path d="M108 49 L114 51 L105 60 L100 56 Z" ${st(c)}/>`;
  const lace = (x0, x1, y, c) => { let s = ''; for (let x = x0; x < x1; x += 3) s += `<circle cx="${f(x + 1.5)}" cy="${y}" r="1.5" fill="#fff" stroke="${c}" stroke-width="0.4"/>`; return s; };
  const hoodBack = (c) => `<path d="M80 50 Q76 18 100 6 Q124 18 120 50 Z" ${st(shade(c, -15))}/>`;
  const hoodFront = (c) => `<path d="M80 50 Q78 20 100 9 Q122 20 120 50 L113 52 Q117 24 100 15 Q83 24 87 52 Z" ${st(c)}/>`;
  const straps = (c) => line([[86, 77], [89, 58]], shade(c, -50), 1.4) + line([[114, 77], [111, 58]], shade(c, -50), 1.4);
  const bow = (x, y, c) => `<path d="M${x} ${y} l-6 -4 v8 Z M${x} ${y} l6 -4 v8 Z" ${st(c)}/>`;
  const dots = (id, c) => `<pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="${c}"/><circle cx="3" cy="3" r="1" fill="#fff" fill-opacity=".8"/></pattern>`;

  const LEN = { mini: 165, rodilla: 200, midi: 232, largo: 266 };

  function draw(g, o) {
    o = o || {};
    const c = PAL[g] || '#c95c7f', dk = shade(c, -70);
    let back = '', body = '', over = '', defs = '';
    const T = (opt, col) => `<path d="${torsoPath(opt)}" ${st(col || c)}/>`;
    const Y = LEN[o.largo || 'rodilla'];
    switch (g) {
      case 'falda': body = skirtSVG(o.tipoFalda || 'A', 110, Y, c); break;
      case 'vestido': case 'vestido_pliegues': {
        const et = o.escoteTipo || 'normal';
        const neck = et === 'normal' ? (o.cuello === 'pico' ? 'pico' : 'redondo') : et === 'strapless' ? 'strapless' : et === 'tirantes' ? 'tirantes' : et === 'halter' ? 'halter' : 'wrap';
        body = skirtSVG(g === 'vestido_pliegues' ? 'tableada' : (o.tipoFalda || 'A'), 110, Y, c) + T({ neck, bottom: 110 });
        if (et === 'normal' || et === 'wrap') over += sleeve(o.manga, c);
        if (et === 'tirantes') over += straps(c);
        if (et === 'halter') over += bow(100, 44, c);
        if (et === 'wrap') over += line([[92, 49], [116, 110]], dk, 1) + line([[121, 108], [130, 118]], dk, 1.3) + line([[121, 108], [127, 121]], dk, 1.3);
        if (g === 'vestido_pliegues') over += collar('#fff');
        break;
      }
      case 'vestido_recto': {
        const front = o.abertura === 'delante';
        body = T({ neck: 'redondo', bottom: Y, hem: 31 + (Y - 110) * 0.12 });
        over = sleeve(o.manga === 'larga' ? 'obispo' : o.manga, c);
        if (front) over += collar(shade(c, 20)) + line([[100, 57], [100, Y]], dk, 0.6) + buttons(100, 62, Math.min(Y - 10, 160), 6, '#fff') + `<rect x="78" y="107" width="44" height="5" ${st(shade(c, -20))}/>`;
        break;
      }
      case 'babydoll': body = skirtSVG('fruncida', 92, Y, c, 23) + T({ neck: 'redondo', bottom: 92 }) + `<rect x="77" y="90" width="46" height="3" fill="${shade(c, -25)}"/>`; over = sleeve(o.manga, c); break;
      case 'slip': body = T({ neck: 'tirantes', bottom: LEN[o.largo || 'midi'], hem: 32 + (LEN[o.largo || 'midi'] - 110) * 0.2 }); over = straps(c) + line([[100, 84], [100, 92]], dk, 0.5); break;
      case 'victoriano': {
        const Yl = LEN[o.largo || 'largo'];
        body = skirtSVG('fruncida', 112, Yl, c) + T({ neck: 'alto', bottom: 110, point: 7 });
        const nv = +(o.volantes || 0);
        for (let i = 1; i <= nv; i++) { const yy = Yl - (Yl - 112) * 0.2 * i + 4, hw = 30 + (yy - 112) * 0.42; body += `<path d="M${f(100 - hw)} ${f(yy - 9)} L${f(100 + hw)} ${f(yy - 9)} L${f(100 + hw + 3)} ${f(yy)} Q100 ${f(yy + 4)} ${f(100 - hw - 3)} ${f(yy)} Z" ${st(shade(c, 18))}/>` + lace(100 - hw - 2, 100 + hw + 2, yy + 1, dk); }
        over = sleeve(o.manga || 'jamon', c) + lace(92, 108, 41, dk) + `<rect x="93" y="40" width="14" height="10" ${st(shade(c, 10))}/>`;
        break;
      }
      case 'camiseta': {
        const crop = o.largoTop === 'crop';
        body = T({ neck: o.cuello === 'pico' ? 'pico' : 'redondo', bottom: crop ? 96 : 138, loose: 2 });
        over = sleeve(o.manga, c) + line([[93, 50], [100, 59], [107, 50]], shade(c, -40), 0.6);
        break;
      }
      case 'top': {
        const tt = o.topTipo || 'tirantes';
        const neck = { tirantes: 'tirantes', bandeau: 'strapless', halter: 'halter', cruzado: 'wrap' }[tt];
        body = T({ neck, bottom: tt === 'cruzado' ? 110 : 100 });
        if (tt === 'tirantes') over = straps(c);
        if (tt === 'halter') over = bow(100, 44, c);
        if (tt === 'cruzado') over = sleeve('larga', c) + line([[92, 49], [116, 110]], dk, 1) + line([[121, 108], [130, 118]], dk, 1.3) + line([[121, 108], [127, 121]], dk, 1.3);
        if (tt === 'bandeau') over = line([[77, 78], [123, 78]], dk, 0.5, '1 1');
        break;
      }
      case 'peplum': body = `<path d="M79 110 L121 110 L136 132 Q100 138 64 132 Z" ${st(shade(c, 8))}/>` + T({ neck: o.cuello === 'pico' ? 'pico' : 'redondo', bottom: 110 }); over = sleeve(o.manga, c); for (let i = -2; i <= 2; i++) over += line([[100 + i * 8, 112], [100 + i * 13, 133]], dk, 0.5); break;
      case 'campesino': {
        body = `<path d="M68 70 L132 70 L130 138 Q100 142 70 138 Z" ${st(c)}/>`;
        for (let x = 70; x <= 130; x += 4) body += line([[x, 70], [x + 1, 75]], dk, 0.5);
        over = sleeve('abullonada', c) + `<rect x="66" y="68" width="68" height="3" fill="${shade(c, -25)}"/>`;
        break;
      }
      case 'camisa': body = T({ neck: 'redondo', bottom: 140, loose: 1.5 }); over = sleeve(o.manga === 'larga' ? 'obispo' : o.manga, c) + collar(shade(c, 10)) + line([[100, 58], [100, 140]], dk, 0.6) + buttons(100, 64, 134, 6, '#fff'); break;
      case 'body': case 'banador': {
        const ban = g === 'banador';
        body = `<path d="${torsoPath({ neck: ban ? 'ancho' : (o.cuello === 'pico' ? 'pico' : 'redondo'), bottom: 110 }).replace(/ Z$/, '')}" ${st(c)} display="none"/>`;
        const top = torsoPath({ neck: ban ? 'ancho' : (o.cuello === 'pico' ? 'pico' : 'redondo'), bottom: 110 });
        body = `<path d="${top}" ${st(c)}/><path d="M79 109 L121 109 L128 132 L106 152 L94 152 L72 132 Z" ${st(c)}/>`;
        if (!ban) over = sleeve(o.manga, c);
        if (ban) over = line([[78, 78], [76, 70]], dk, 0.1);
        break;
      }
      case 'corse': body = `<path d="M77 77 Q88 71 100 76 Q112 71 123 77 L120 110 L126 128 L100 135 L74 128 L80 110 Z" ${st(c)}/>`; [86, 93, 107, 114].forEach(x => body += line([[x, 76], [x + (x < 100 ? -2 : 2), 130]], shade(c, 40), 0.6)); body += line([[100, 76], [100, 135]], shade(c, 60), 1); break;
      case 'sudadera': {
        const hood = o.capucha !== 'no';
        if (hood) back = hoodBack(c);
        body = T({ neck: 'redondo', bottom: 136, loose: 4 }) + `<rect x="${100 - 31}" y="134" width="62" height="7" ${st(shade(c, -15))}/>` + `<path d="M84 112 L116 112 L120 130 L80 130 Z" ${st(shade(c, 6))}/>`;
        over = sleeve('larga', c) + line([[100, 52], [100, 141]], dk, 0.8);
        if (hood) over = hoodFront(c) + over + line([[96, 56], [95, 70]], '#fff', 0.8) + line([[104, 56], [105, 70]], '#fff', 0.8);
        break;
      }
      case 'pantalon': body = pantsSVG(o.pierna || 'recto', o.largoP || 'largo', c, { elastic: o.cintura !== 'pretina' }); break;
      case 'short': body = pantsSVG('recto', o.largoP || 'corto', c, { elastic: o.cintura !== 'pretina' }); break;
      case 'vaquero': body = pantsSVG(o.pierna || 'pitillo', o.largoP || 'largo', c, { jeans: true }); break;
      case 'cargo': body = pantsSVG(o.pierna || 'recto', o.largoP || 'largo', c, { elastic: true, cargo: true, drawstring: true }); break;
      case 'jogger': body = pantsSVG('jogger', 'largo', c, { elastic: true, cuff: true, drawstring: true }); break;
      case 'leggings': body = pantsSVG('leggings', o.largoP || 'largo', c, { elastic: true }); break;
      case 'enterizo': body = pantsSVG(o.pierna || 'recto', o.largoP || 'largo', c, {}) + T({ neck: o.cuello === 'pico' ? 'pico' : 'redondo', bottom: 112 }); over = sleeve(o.manga, c) + `<rect x="78" y="107" width="44" height="5" ${st(shade(c, -20))}/>`; break;
      case 'peto': case 'pichi': {
        body = (g === 'peto' ? pantsSVG(o.pierna || 'recto', o.largoP || 'largo', c, { jeans: true }) : skirtSVG('A', 110, Y, c));
        body += `<path d="M86 84 L114 84 L115 110 L85 110 Z" ${st(c)}/>` + `<rect x="92" y="89" width="16" height="11" ${st(shade(c, 10))}/>`;
        over = line([[87, 85], [82, 60]], shade(c, -30), 2.4) + line([[113, 85], [118, 60]], shade(c, -30), 2.4) + buttons(87, 86, 86, 1, '#e3b04b') + buttons(113, 86, 86, 1, '#e3b04b');
        break;
      }
      case 'chaleco': body = `<path d="M92 49 L100 84 L108 49 L122 58 L116 80 L121 110 L124 118 L100 116 L76 118 L79 110 L84 80 L78 58 Z" ${st(c)}/>`; over = buttons(100, 90, 112, 4, '#d8c49a') + line([[100, 84], [100, 116]], dk, 0.6); break;
      case 'bomber': body = T({ neck: 'redondo', bottom: 128, loose: 5 }) + `<rect x="68" y="126" width="64" height="8" ${st(shade(c, -20))}/>`; over = sleeve('larga', c) + `<path d="M90 47 L110 47 L111 53 Q100 58 89 53 Z" ${st(shade(c, -20))}/>` + line([[100, 55], [100, 134]], '#ccc', 1); break;
      case 'vaquera': body = T({ neck: 'redondo', bottom: 124, loose: 2 }) + `<rect x="74" y="122" width="52" height="6" ${st(shade(c, -15))}/>`; over = sleeve('larga', c) + collar(shade(c, 8)) + line([[100, 58], [100, 128]], dk, 0.6) + buttons(100, 64, 122, 5, '#c9a24a') + line([[77, 72], [123, 72]], '#e3b04b', 0.6, '1.2 1') + `<rect x="83" y="76" width="10" height="8" ${st(shade(c, 8))}/><rect x="107" y="76" width="10" height="8" ${st(shade(c, 8))}/>`; break;
      case 'blazer': case 'abrigo': {
        const by = g === 'abrigo' ? LEN[o.largo || 'rodilla'] : 140;
        body = T({ neck: 'pico', bottom: by, loose: g === 'abrigo' ? 4 : 1.5, hem: g === 'abrigo' ? 33 + (by - 110) * 0.1 : 31 });
        over = sleeve('larga', c) + `<path d="M92 49 L86 56 L94 64 L100 92 Z" ${st(shade(c, -15))}/><path d="M108 49 L114 56 L106 64 L100 92 Z" ${st(shade(c, -15))}/>` + buttons(100, 100, g === 'abrigo' ? 140 : 100, g === 'abrigo' ? 3 : 1, '#222') + line([[80, 126], [92, 126]], dk, 1) + line([[108, 126], [120, 126]], dk, 1);
        break;
      }
      case 'kimono': body = T({ neck: 'wrap', bottom: 172, loose: 4, hem: 30 }) + `<rect x="77" y="104" width="46" height="10" ${st('#e9c46a')}/>`; over = sleeve('kimono', c) + line([[92, 49], [114, 110]], shade(c, 50), 2.5); break;
      case 'capa': { const hood = o.capucha !== 'no'; if (hood) back = hoodBack(c); body = `<path d="M90 47 L110 47 L162 178 Q100 190 38 178 Z" ${st(c)}/>`; over = (hood ? hoodFront(c) : '') + line([[100, 50], [100, 185]], dk, 0.8) + bow(100, 52, '#f0e6d2'); break; }
      case 'bragas': body = `<path d="M76 122 L124 122 L126 132 L106 152 L94 152 L74 132 Z" ${st(c)}/>`; break;
      case 'bikini': body = `<path d="M78 124 L122 124 L124 132 L106 150 L94 150 L76 132 Z" ${st(c)}/><path d="M80 90 L98 90 L90 72 Z" ${st(c)}/><path d="M102 90 L120 90 L110 72 Z" ${st(c)}/>`; over = line([[78, 91], [122, 91]], dk, 1) + line([[90, 72], [96, 48]], dk, 0.8) + line([[110, 72], [104, 48]], dk, 0.8) + line([[76, 124], [72, 130]], dk, 0.8) + line([[124, 124], [128, 130]], dk, 0.8); break;
      case 'medias_cortas': case 'medias_largas': {
        const top = g === 'medias_largas' ? 162 : 238;
        [[1], [-1]].forEach(([d]) => { const X = x => d > 0 ? x : M(x); const w0 = top < 200 ? 11 : 6.5; body += `<path d="M${X(89 - w0)} ${top} L${X(89 + w0)} ${top} L${X(94)} ${top < 205 ? 205 : top + 5} L${X(93)} 262 L${X(95.5)} 268 Q${X(89)} 275 ${X(82.5)} 268 L${X(85)} 262 L${X(84)} ${top < 205 ? 205 : top + 5} Z" ${st(c)}/>`; body += `<rect x="${X(d > 0 ? 89 - w0 : 89 + w0)}" y="${top}" width="${2 * w0}" height="4" ${st(shade(c, -20))}/>`; });
        break;
      }
      case 'pijama': {
        defs = dots('pj', c);
        const pc = 'url(#pj)';
        body = pantsSVG('recto', o.largoP || 'largo', c, { elastic: true }).replace(new RegExp(`fill="${c}"`, 'g'), `fill="${pc}"`) + `<path d="${torsoPath({ neck: 'redondo', bottom: 138, loose: 2 })}" fill="${pc}" stroke="${dk}" stroke-width="1.1"/>`;
        over = sleeve(o.manga || 'corta', c) + collar('#fff') + buttons(100, 64, 130, 5, '#fff');
        break;
      }
      case 'delantal': body = `<path d="M86 80 L114 80 L114 108 L86 108 Z" ${st(c)}/><path d="M80 110 L120 110 L126 196 Q100 200 74 196 Z" ${st(c)}/>` + lace(74, 126, 197, shade(c, -60)); over = `<rect x="74" y="106" width="52" height="5" ${st(shade(c, -25))}/>` + line([[87, 80], [94, 48]], shade(c, -30), 1.5) + line([[113, 80], [106, 48]], shade(c, -30), 1.5) + `<rect x="92" y="140" width="16" height="13" ${st(shade(c, 10))}/>`; break;
      default: body = T({ neck: 'redondo', bottom: 140 });
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 290" role="img"><defs>${defs}</defs>${back}${figure()}${body}${over}</svg>`;
  }

  root.ILLUS = { draw, PAL };
})(typeof window !== 'undefined' ? window : globalThis);
