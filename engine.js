/* ============================================================
   MOTOR DE PATRONAJE PARAMÉTRICO PARA MUÑECAS
   Unidades internas: milímetros. Coordenadas: x → derecha, y ↓ abajo.
   Cada pieza = lista ordenada de aristas (edges) que cierran un contorno.
   arista: {pts:[[x,y]...], kind:'seam'|'hem'|'fold', sa:mm}
   El contorno de corte se obtiene desplazando cada arista su margen.
   ============================================================ */
(function (root) {
  const EASE = {
    plano: { ajustado: 0.06, normal: 0.12, holgado: 0.22 },
    punto: { ajustado: -0.05, normal: 0.02, holgado: 0.10 }
  };
  const lerp = (a, b, t) => a + (b - a) * t;
  const r1 = v => Math.round(v * 10) / 10;

  // ---------- geometría ----------
  function bez(a, b, c, d, n = 14) {
    const o = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      o.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
              u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]);
    }
    return o;
  }
  function catmull(P, n = 10) {
    const o = [P[0]];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || P[i + 1];
      for (let j = 1; j <= n; j++) {
        const t = j / n, t2 = t * t, t3 = t2 * t;
        o.push([0, 1].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
      }
    }
    return o;
  }
  const rev = a => a.slice().reverse();
  function plen(p) { let s = 0; for (let i = 1; i < p.length; i++) s += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return s; }
  function join(...parts) { const o = []; parts.forEach(p => p.forEach((q, i) => { if (o.length && i === 0) { const l = o[o.length - 1]; if (Math.hypot(l[0] - q[0], l[1] - q[1]) < 1e-6) return; } o.push(q); })); return o; }
  function cutY(poly, y) { // conserva el tramo con py <= y
    const o = [poly[0]];
    for (let i = 1; i < poly.length; i++) {
      const a = poly[i - 1], b = poly[i];
      if (b[1] <= y) { o.push(b); continue; }
      const t = (y - a[1]) / (b[1] - a[1]); o.push([lerp(a[0], b[0], t), y]); return o;
    }
    return o;
  }
  function arc(cx, cy, r, a0, a1, n = 24) { const o = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return o; }

  function loopFrom(edges) {
    const P = [], D = [];
    edges.forEach(e => { for (let i = 0; i < e.pts.length - 1; i++) { P.push(e.pts[i]); D.push(e.sa); } });
    // limpiar duplicados
    const p2 = [], d2 = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-4) continue;
      p2.push(a); d2.push(D[i]);
    }
    return { P: p2, D: d2 };
  }
  function area(P) { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
  function offsetLoop(P, D) {
    const n = P.length, sg = area(P) > 0 ? 1 : -1, out = [];
    const N = [], V = [];
    for (let i = 0; i < n; i++) {
      const a = P[i], b = P[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
      V.push([dx / L, dy / L]); N.push([sg * dy / L, -sg * dx / L]);
    }
    const maxD = Math.max(...D, 0.001);
    for (let j = 0; j < n; j++) {
      const i = (j - 1 + n) % n;
      const qa = [P[i][0] + N[i][0] * D[i], P[i][1] + N[i][1] * D[i]]; // línea i desplazada
      const qb = [P[j][0] + N[j][0] * D[j], P[j][1] + N[j][1] * D[j]]; // línea j desplazada
      const endA = [P[j][0] + N[i][0] * D[i], P[j][1] + N[i][1] * D[i]];
      const cr = V[i][0] * V[j][1] - V[i][1] * V[j][0];
      if (Math.abs(cr) < 1e-6) { out.push(endA); if (Math.abs(D[i] - D[j]) > 1e-6) out.push(qb); continue; }
      const t = ((qb[0] - qa[0]) * V[j][1] - (qb[1] - qa[1]) * V[j][0]) / cr;
      const X = [qa[0] + V[i][0] * t, qa[1] + V[i][1] * t];
      if (Math.hypot(X[0] - P[j][0], X[1] - P[j][1]) > 3 * maxD + 0.5) { out.push(endA); out.push(qb); }
      else out.push(X);
    }
    return out;
  }

  // ---------- pieza ----------
  function E(pts, kind, sa) { return { pts, kind, sa }; }
  function piece(name, cut, edges, extra) {
    const p = Object.assign({ name, cut, edges, marks: [], notes: [] }, extra || {});
    return p;
  }
  function finalize(p) {
    const L = loopFrom(p.edges);
    p._st = L.P; p._cut = offsetLoop(L.P, L.D);
    const all = p._cut.concat(p._st);
    const xs = all.map(q => q[0]), ys = all.map(q => q[1]);
    p.bb = { x: Math.min(...xs), y: Math.min(...ys), X: Math.max(...xs), Y: Math.max(...ys) };
    p.w = p.bb.X - p.bb.x; p.h = p.bb.Y - p.bb.y;
    if (!p.grain) { const cx = (p.bb.x + p.bb.X) / 2; p.grain = [[cx, p.bb.y + p.h * 0.2], [cx, p.bb.y + p.h * 0.8]]; }
    return p;
  }
  function mapPiece(p, f) {
    p.edges.forEach(e => e.pts = e.pts.map(f));
    p.marks.forEach(m => { if (m.pts) m.pts = m.pts.map(f); if (m.at) m.at = f(m.at); });
    if (p.grain) p.grain = p.grain.map(f);
    if (p.labelAt) p.labelAt = f(p.labelAt);
    return finalize(p);
  }
  function rotate90(p) { p.rot = !p.rot; return mapPiece(p, q => [-q[1], q[0]]); }

  function rect(name, cut, w, h, k, extra) { // k: {top,right,bottom,left} kinds
    k = k || {}; const S = extra && extra.S;
    const sa = kind => kind === 'fold' || kind === 'raw' ? 0 : kind === 'hem' ? S.hem : kind === 'open' ? S.sa + S.ext : S.sa;
    const kk = x => x === 'open' || x === 'raw' ? 'seam' : x;
    const kt = k.top || 'seam', kr = k.right || 'seam', kb = k.bottom || 'seam', kl = k.left || 'seam';
    const p = piece(name, cut, [
      E([[0, 0], [w, 0]], kk(kt), sa(kt)),
      E([[w, 0], [w, h]], kk(kr), sa(kr)),
      E([[w, h], [0, h]], kk(kb), sa(kb)),
      E([[0, h], [0, 0]], kk(kl), sa(kl))
    ], extra && extra.p);
    p.rectInfo = [w, h];
    return p;
  }

  // ---------- preparación de medidas ----------
  function prep(m, S) {
    const k = {};
    for (const key in m) k[key] = m[key] * 10;
    k.knit = S.fabric === 'punto';
    k.e = EASE[S.fabric][S.fit];
    k.bulk = k.knit ? 0 : 2;
    return k;
  }

  // ---------- BLOQUE BASE: CUERPO (corpiño) ----------
  // modos: waist (a cintura), hip (a cadera), crop (corto), body (con braga), dress (vestido de una pieza)
  // top: normal | strapless (palabra de honor / tirantes) | halter | wrap (cruzado)
  function bodice(k, S, o) {
    o = Object.assign({ opening: 'back', mode: 'waist', darts: true, straight: false, neck: 'redondo', lowerArm: 0, neckDrop: 0, sleeveless: false, pointFront: false, bottomKind: 'seam', vDepth: 0, top: 'normal', length: null, neckDepth: null, flare: 0, vTop: 0 }, o);
    const e = k.e, bulk = k.bulk;
    const qB = (k.B * (1 + e) + bulk) / 4, qW = (k.W * (1 + e * 0.8) + bulk) / 4, qH = (k.Hp * (1 + e * 0.8) + bulk) / 4;
    const nw = k.N / 6 + 1 + (o.wideNeck || 0);
    const ndF = o.neckDepth != null ? o.neckDepth : k.N / 6 + 2 + o.neckDrop, ndB = k.N / 16 + 1;
    const hs = Math.max(k.Sh / 2, nw + 4);
    const drop = 0.12 * hs;
    const sp = o.sleeveless ? hs - 1.5 : hs;
    const AD = 0.5 * k.BL + (k.knit ? 1 : 2) + o.lowerArm;
    const yUA = drop + AD;
    const qBx = Math.max(qB, sp + 1.5);
    const wB = k.BL, wF = k.BL + 0.05 * (k.B - k.W);
    const res = { qB: qBx, qW, qH, yUA, wB, wF, AD, info: {} };

    function build(front) {
      const nd = front ? ndF : ndB, wy = front ? wF : wB;
      const HPS = [nw, 0], SP = [sp, drop], UA = [qBx, yUA];
      const strapless = o.top === 'strapless' || (o.top === 'halter' && !front);
      const halter = o.top === 'halter' && front, wrap = o.top === 'wrap' && front;
      const yTop = yUA - 0.12 * AD + (o.top === 'halter' ? 1 : 0);
      const UAp = strapless ? [qBx, yTop] : UA;
      const marks = [];
      let lower = [], bottomY;
      const dartOK = o.darts && !k.knit && (k.B - k.W) > 25;
      const excess = qBx - qW;
      if (o.mode === 'waist') {
        const dw = dartOK ? Math.min(excess * 0.5, front ? 6 : 4) : 0;
        const sx = o.straight ? qBx : qW + dw;
        const pd = (front && o.pointFront) ? 0.14 * k.BL : 0;
        bottomY = wy + pd;
        lower.push(E([[0, bottomY], [sx, wy]], o.bottomKind, o.bottomKind === 'hem' ? S.hem : S.sa));
        lower.push(E([[sx, wy], UAp], 'seam', S.sa));
        if (dw > 0.5) {
          const dx = 0.5 * qBx, yAt = x => lerp(bottomY, wy, x / sx);
          const apex = [dx, Math.max(UAp[1] + 2, yUA + (front ? 2 : -1))];
          marks.push({ t: 'dart', pts: [[dx - dw / 2, yAt(dx - dw / 2)], apex, [dx + dw / 2, yAt(dx + dw / 2)]] });
        }
      } else if (o.mode === 'hip' || o.mode === 'crop') {
        const ey = o.length != null ? o.length : (o.mode === 'crop' ? yUA + 0.55 * (wy - yUA) : wy + k.WH);
        bottomY = ey;
        if (o.straight || o.mode === 'crop' || ey <= wy) {
          const sX = (o.mode === 'crop' || ey <= wy) ? qBx : Math.max(qBx, qH) + (o.extraHem || 0);
          lower.push(E([[0, ey], [sX, ey]], o.bottomKind === 'seam' ? 'seam' : 'hem', o.bottomKind === 'seam' ? S.sa : S.hem));
          lower.push(E([[sX, ey], UAp], 'seam', S.sa));
        } else {
          const sxw = qBx - 0.4 * (qBx - qW), sxh = Math.max(qH, sxw);
          lower.push(E([[0, ey], [sxh, ey]], 'hem', S.hem));
          lower.push(E(rev(catmull([UAp, [sxw, wy], [sxh, ey]])), 'seam', S.sa));
        }
      } else if (o.mode === 'dress') {
        const ey = o.length != null ? o.length : wy + k.Out * 0.55;
        bottomY = ey;
        const sxw = qBx - 0.45 * (qBx - qW), hemX = Math.max(qH * 1.03, qBx) + o.flare;
        lower.push(E([[0, ey], [hemX, ey - o.flare * 0.12]], 'hem', S.hem));
        lower.push(E(rev(catmull(o.straight ? [UAp, [Math.max(qBx, qH * 1.02), wy + k.WH], [hemX, ey - o.flare * 0.12]] : [UAp, [sxw, wy], [Math.max(qH * 1.02, sxw), wy + k.WH], [hemX, ey - o.flare * 0.12]])), 'seam', S.sa));
      } else if (o.mode === 'body') {
        const tq = lerp(qW, qH, 0.45), cw = Math.max(4, 0.045 * k.Hp);
        const yt = wy + 0.45 * k.WH, by = wy + k.R * (front ? 1.05 : 1.2);
        bottomY = by;
        const leg = front ? bez([cw, by], [cw + (tq - cw) * 0.1, by - (by - yt) * 0.55], [tq - (tq - cw) * 0.35, yt + 1], [tq, yt])
                          : bez([cw, by], [cw + (tq - cw) * 0.45, by - 1], [tq, yt + (by - yt) * 0.45], [tq, yt]);
        lower.push(E([[0, by], [cw, by]], 'seam', S.sa));
        lower.push(E(leg, 'hem', S.hem));
        lower.push(E([[tq, yt], [qW, wy], UAp], 'seam', S.sa));
      }
      // borde superior
      let top, topCFy, x0 = 0;
      if (strapless) {
        const tp = (front && o.vTop) ? [[qBx, yTop], [qBx * 0.45, yTop - 1.5], [0, yTop + o.vTop]] : [[qBx, yTop], [0, yTop - (front ? 1 : 0)]];
        top = [E(tp, 'seam', S.sa)]; topCFy = tp[tp.length - 1][1];
      } else if (halter) {
        const tip = [nw + 2, 1];
        const a = bez(UA, [qBx * 0.8, yUA * 0.7], [tip[0] + (qBx - tip[0]) * 0.15, yUA * 0.3], tip);
        const nk = [tip, [0, Math.max(2, nd * 0.35)]];
        top = [E(a, 'seam', S.sa), E(nk, 'seam', S.sa)]; topCFy = nk[1][1];
      } else {
        let neck;
        if (wrap) { const ow = o.wrapOver != null ? o.wrapOver : 0.55 * qBx; x0 = -ow; neck = [HPS, [x0, wy - 1]]; }
        else if (front && o.neck === 'pico') neck = [HPS, [0, nd + (o.vDepth || 0.45 * (yUA - nd))]];
        else neck = front ? bez(HPS, [nw, nd * 0.55], [nw * 0.55, nd], [0, nd]) : bez(HPS, [nw * 0.95, nd * 0.6], [nw * 0.5, nd], [0, nd]);
        const arm = front ? bez(SP, [sp - 0.04 * AD, drop + 0.45 * (yUA - drop)], [sp + (qBx - sp) * 0.3, yUA], UA)
                          : bez(SP, [sp, drop + 0.5 * (yUA - drop)], [sp + (qBx - sp) * 0.15, yUA], UA);
        res[front ? 'armF' : 'armB'] = plen(arm); res[front ? 'neckF' : 'neckB'] = plen(neck);
        top = [E(rev(arm), 'seam', S.sa), E([SP, HPS], 'seam', S.sa), E(neck, wrap ? 'hem' : 'seam', wrap ? S.hem : S.sa)];
        topCFy = neck[neck.length - 1][1];
      }
      if (wrap) lower[0].pts[0] = [x0, lower[0].pts[0][1]];
      const opening = (front && o.opening === 'front') || (!front && o.opening === 'back');
      const cfKind = wrap ? 'hem' : opening ? 'seam' : 'fold';
      const cfSA = wrap ? S.hem : opening ? S.sa + S.ext : 0;
      const edges = [E([[x0, topCFy], [x0, bottomY]], cfKind, cfSA)].concat(lower, top);
      if (opening && !wrap) marks.push({ t: 'text', at: [-S.ext * 0.5 - S.sa * 0.3, (topCFy + bottomY) / 2], s: 'CRUCE', rot: -90, size: 1.6 });
      return { edges, marks, opening: opening || wrap, topY: topCFy };
    }
    res.F = build(true); res.B = build(false);
    res.armLen = (res.armF || 0) + (res.armB || 0);
    res.neckHalf = (res.neckF || 0) + (res.neckB || 0);
    res.F.armLen = res.armF; res.F.neckLen = res.neckF;
    res.bottomF = res.F.edges[0].pts[1][1];
    return res;
  }
  function bodicePieces(bd, S, names) {
    names = names || {};
    const f = bd.F, b = bd.B;
    const pf = piece(names.f || 'Delantero', f.opening ? 'Cortar 2 (en espejo)' : 'Cortar 1 al doblez', f.edges, { marks: f.marks });
    const pb = piece(names.b || 'Espalda', b.opening ? 'Cortar 2 (en espejo)' : 'Cortar 1 al doblez', b.edges, { marks: b.marks });
    return [pf, pb];
  }

  // ---------- BLOQUE BASE: MANGA ----------
  function sleeve(k, S, armLen, type, ov) {
    ov = ov || {};
    const e = k.e;
    let SW = Math.max(k.UA * (1 + Math.max(e, 0) + 0.18), k.Hand * 1.1 + 2);
    const target = armLen * (k.knit ? 1.0 : 1.04);
    const cap = (sw, ch) => { const a = bez([0, ch], [sw * 0.16, ch * 0.92], [sw * 0.32, 0], [sw / 2, 0]); const b = bez([sw / 2, 0], [sw * 0.68, 0], [sw * 0.84, ch * 0.92], [sw, ch]); return a.concat(b.slice(1)); };
    let guard = 0;
    while (plen(cap(SW, SW * 0.9)) < target && guard++ < 60) SW *= 1.04;
    let lo = 1, hi = SW * 0.9, CH = lo;
    if (plen(cap(SW, lo)) < target) { for (let i = 0; i < 40; i++) { CH = (lo + hi) / 2; if (plen(cap(SW, CH)) < target) lo = CH; else hi = CH; } }
    const wrist = k.knit ? k.Hand * 0.98 : k.Hand * 1.08 + 2;
    const mult = type === 'farol' ? 1.55 : type === 'jamon' ? 1.9 : 1;
    const TW = SW * mult, TCH = CH * (type === 'farol' ? 1.25 : type === 'jamon' ? 1.45 : 1);
    const cuffH = Math.max(4, k.H * 0.02);
    let L, hemW, hemKind = 'hem';
    switch (type) {
      case 'corta': L = Math.max(0.28 * k.Arm, TCH + 6); hemW = SW * 0.96; break;
      case 'tres': L = 0.62 * k.Arm; hemW = lerp(SW, wrist, 0.55); break;
      case 'farol': L = Math.max(0.25 * k.Arm, TCH + 5); hemW = TW; hemKind = 'seam'; break;
      case 'obispo': L = k.Arm - cuffH + 1; hemW = SW * 1.35; hemKind = 'seam'; break;
      case 'jamon': L = k.Arm + 1.5; hemW = wrist; break;
      default: L = k.Arm + 1.5; hemW = wrist;
    }
    if (ov.L != null) L = Math.max(ov.L, TCH + 4);
    if (ov.hemW != null) hemW = Math.max(ov.hemW, type === 'corta' || type === 'farol' ? 0 : k.Hand * (k.knit ? 0.95 : 1.05));
    const capPts = cap(TW, TCH);
    const hl = [(TW - hemW) / 2, L], hr = [(TW + hemW) / 2, L];
    let right = [[TW, TCH], hr], left = [hl, [0, TCH]];
    if (type === 'jamon') {
      const yE = TCH + (L - TCH) * 0.45;
      right = bez([TW, TCH], [TW, TCH + (yE - TCH) * 0.6], [hr[0] + (TW - hr[0]) * 0.25, yE], hr);
      left = rev(bez([0, TCH], [0, TCH + (yE - TCH) * 0.6], [hl[0] - hl[0] * 0.25, yE], hl));
    }
    const p = piece('Manga', 'Cortar 2 (en espejo)', [
      E(capPts, 'seam', S.sa), E(right, 'seam', S.sa), E([hr, hl], hemKind, hemKind === 'hem' ? S.hem : S.sa), E(left, 'seam', S.sa)
    ]);
    p.grain = [[TW / 2, TCH * 0.6], [TW / 2, L * 0.85]];
    p.meta = { L, hemW };
    if (type === 'farol' || type === 'jamon') {
      p.marks.push({ t: 'text', at: [TW / 2, TCH * 0.55 + 2.5], s: 'fruncir copa ● ●', size: 1.7 });
      p.marks.push({ t: 'dot', at: capPts[Math.round(capPts.length * 0.22)] }, { t: 'dot', at: capPts[Math.round(capPts.length * 0.78)] });
    }
    if (type === 'farol' || type === 'obispo') p.marks.push({ t: 'text', at: [TW / 2, L - 2], s: 'fruncir bajo', size: 1.7 });
    p.marks.push({ t: 'dot', at: [TW / 2, 0] });
    const extra = [];
    if (type === 'farol') { const bl = Math.max(k.UA * 1.25, k.Hand * 1.1) + 2; extra.push(rect('Tira de manga farol', 'Cortar 2', bl, 2 * cuffH, {}, { S, p: { marks: [{ t: 'line', pts: [[0, cuffH], [bl, cuffH]], dash: true, label: 'doblar' }] } })); }
    if (type === 'obispo') extra.push(rect('Puño', 'Cortar 2', wrist + S.ext, 2 * cuffH, {}, { S, p: { marks: [{ t: 'line', pts: [[0, cuffH], [wrist + S.ext, cuffH]], dash: true, label: 'doblar' }] } }));
    return [p].concat(extra);
  }

  // ---------- BLOQUE BASE: FALDA ----------
  function skirt(k, S, o) {
    o = Object.assign({ type: 'A', L: k.Out * 0.55, band: true, fullness: 1.8, joined: false }, o);
    if (o.type === 'cruzada') { o.type = 'A'; o.wrap = true; }
    if (o.type === 'altabaja') { o.type = 'circular'; o.hilo = true; }
    const Wp = k.W * (1 + k.e * 0.8) + k.bulk, Hpp = k.Hp * (1 + k.e * 0.8) + k.bulk;
    const wq = Wp / 4, hq = Hpp / 4, L = o.L, WH = k.WH;
    const out = [];
    const bandH = Math.max(4, k.H * 0.015);
    if (['recta', 'A', 'lapiz'].includes(o.type)) {
      const mk = (front) => {
        const wrapF = o.wrap && front, ov = wrapF ? wq * 0.8 : 0;
        const exc = hq - wq;
        const dw = (!k.knit && exc > 5) ? Math.min(exc * 0.4, 5) : 0;
        const sx = wq + dw;
        const flare = o.type === 'A' ? 0.22 * (L - WH) : o.type === 'lapiz' ? -0.05 * (L - WH) : 0;
        const hemX = hq + flare, hemSide = L - (o.type === 'A' ? flare * 0.15 : 0);
        const hip = bez([sx, 0], [sx + (hq - sx) * 0.3, WH * 0.25], [hq, WH * 0.6], [hq, WH]);
        const side = L > WH ? hip.concat([[hemX, hemSide]]) : cutY(hip, L);
        const last = side[side.length - 1];
        const edges = wrapF ? [
          E([[-ov, 0], [-ov, L]], 'hem', S.hem),
          E([[-ov, L], last], 'hem', S.hem),
          E(rev(side), 'seam', S.sa),
          E([[sx, 0], [-ov, 0]], 'seam', S.sa)
        ] : [
          E([[0, 0], [0, L]], front ? 'fold' : 'seam', front ? 0 : S.sa + S.ext),
          E([[0, L], last], 'hem', S.hem),
          E(rev(side), 'seam', S.sa),
          E([[sx, 0], [0, 0]], 'seam', S.sa)
        ];
        const marks = [];
        if (dw > 0.5) { const dx = sx * 0.45; marks.push({ t: 'dart', pts: [[dx - dw / 2, 0], [dx, WH * 0.6], [dx + dw / 2, 0]] }); }
        if (!front) marks.push({ t: 'text', at: [-S.ext * 0.5 - S.sa * 0.3, L / 2], s: 'CRUCE / abertura', rot: -90, size: 1.6 });
        if (wrapF) marks.push({ t: 'line', pts: [[0, 0], [0, L]], dash: true, label: 'centro' });
        return piece(wrapF ? 'Falda delantera cruzada' : front ? 'Falda delantera' : 'Falda espalda', wrapF ? 'Cortar 2 (en espejo)' : front ? 'Cortar 1 al doblez' : 'Cortar 2 (en espejo)', edges, { marks });
      };
      out.push(mk(true), mk(false));
    } else if (o.type === 'fruncida' || o.type === 'tableada') {
      let half;
      if (o.type === 'fruncida') {
        half = Math.max(Hpp * 1.05, Wp) * o.fullness / 2;
        const pc = rect(o.name || 'Falda fruncida', 'Cortar 1 al doblez', half, L, { left: 'fold', right: 'open', bottom: 'hem' }, { S, p: { marks: [{ t: 'text', at: [half / 2, 3], s: 'fruncir hasta ' + r1((o.gatherTo || Wp) / 20) + ' cm (medio contorno)', size: 1.7 }] } });
        out.push(pc);
      } else {
        const n = Math.max(6, Math.round(Wp / 9));
        const pw = Wp / n; half = 1.5 * Wp;
        const pc = rect('Falda tableada', 'Cortar 1 al doblez', half, L, { left: 'fold', right: 'open', bottom: 'hem' }, { S });
        for (let x = pw / 2, i = 0; x < half - 0.5; x += pw, i++) {
          pc.marks.push({ t: 'line', pts: [[x, 0], [x, Math.min(L, 12)]], dash: i % 3 !== 0, label: i % 3 === 0 ? 'doblar' : '' });
        }
        pc.marks.push({ t: 'text', at: [half / 2, Math.min(L, 12) + 3], s: 'tablas: doblar en línea continua, llevar sobre la 2ª discontinua', size: 1.6 });
        out.push(pc);
      }
    } else if (o.type === 'pisos') {
      const n = 3, base = Math.max(Hpp * 1.05, Wp) * 1.15, h = L / n;
      for (let i = 0; i < n; i++) {
        const half = base * Math.pow(o.fullness, i) / 2;
        out.push(rect('Piso ' + (i + 1) + (i ? ' (fruncir sobre el piso ' + i + ')' : ''), 'Cortar 1 al doblez', half, h + (i < n - 1 ? S.sa : 0), { left: 'fold', right: i ? 'seam' : 'open', bottom: i === n - 1 ? 'hem' : 'seam' }, { S }));
      }
    } else if (o.type === 'tutu') {
      [1, 0.92, 0.84].forEach((f, i) => out.push(rect('Capa de tul ' + (i + 1), 'Cortar 1 al doblez (tul)', Hpp * o.fullness / 2, L * f, { left: 'fold', right: 'seam', bottom: 'raw' }, { S, p: { notes: ['El tul no se deshilacha: el bajo queda sin dobladillo.'] } })));
    } else if (o.type === 'globo') {
      const half = Math.max(Hpp * 1.05, Wp) * 1.6 / 2;
      out.push(rect('Falda globo exterior', 'Cortar 1 al doblez', half, L * 1.28, { left: 'fold', right: 'open', bottom: 'seam' }, { S, p: { marks: [{ t: 'text', at: [half / 2, 3], s: 'fruncir arriba y abajo', size: 1.7 }] } }));
      const lin = skirt(k, S, { type: 'recta', L: L * 0.94, band: false });
      lin.forEach(p => { p.name = p.name.replace('Falda', 'Forro globo'); });
      out.push(...lin);
    } else if (o.type === 'circular' || o.type === 'semicircular') {
      const full = o.type === 'circular';
      const r = full ? Wp / (2 * Math.PI) : Wp / Math.PI;
      const ang = full ? Math.PI / 2 : Math.PI / 4;
      const mk = (front) => {
        const R0 = r + (o.hilo ? (front ? L * 0.5 : L) : L), R1 = r + (o.hilo ? L * 0.78 : L), R = (R0 + R1) / 2;
        const hemArc = []; for (let i = 0; i <= 24; i++) { const t = i / 24, a = ang * t, rr = lerp(R0, R1, t * t * (3 - 2 * t)); hemArc.push([rr * Math.cos(a), rr * Math.sin(a)]); }
        const edges = [
          E([[r, 0], [R0, 0]], front ? 'fold' : 'seam', front ? 0 : S.sa + S.ext),
          E(hemArc, 'hem', S.hem),
          E([[R1 * Math.cos(ang), R1 * Math.sin(ang)], [r * Math.cos(ang), r * Math.sin(ang)]], 'seam', S.sa),
          E(arc(0, 0, r, ang, 0), 'seam', S.sa)
        ];
        return piece(front ? 'Falda ' + (full ? 'circular' : 'semicircular') + ' delantera' : 'Falda ' + (full ? 'circular' : 'semicircular') + ' espalda', front ? 'Cortar 1 al doblez' : 'Cortar 2 (en espejo)', edges, { grain: null, labelAt: [(r + R) / 2 * Math.cos(ang / 2), (r + R) / 2 * Math.sin(ang / 2)] });
      };
      out.push(mk(true), mk(false));
      out.forEach(p => p.notes.push('Al bies el bajo cae irregular: deja la falda colgada 24 h y recorta el bajo antes de rematar.'));
    }
    if (o.band) {
      const bl = Wp + S.ext;
      out.push(rect('Pretina', 'Cortar 1', bl, 2 * bandH, {}, { S, p: { marks: [{ t: 'line', pts: [[0, bandH], [bl, bandH]], dash: true, label: 'doblar' }] } }));
    }
    return out;
  }

  // ---------- BLOQUE BASE: PANTALÓN ----------
  function pants(k, S, o) {
    o = Object.assign({ len: 'largo', leg: 'recto', waist: 'elastico', jeans: false, opening: false }, o);
    const e = k.e, bulk = k.bulk;
    const Wp = k.W * (1 + e * 0.8) + bulk, Hpp = k.Hp * (1 + e * 0.8) + bulk;
    const wq = Wp / 4, hq = Hpp / 4;
    const R = k.R + (k.knit ? 0 : 1.5), L = Math.max(k.Out, o.hemYv || 0);
    let eF = 0.22 * hq, eB = 0.42 * hq;
    const thighNeed = k.Th * (1 + (k.knit ? -0.02 : 0.10));
    const cw = 2 * hq + eF + eB;
    if (cw < thighNeed * 2 * 0.98) { /* nunca debería, pero por seguridad */ }
    const legAtCrotchF = hq + eF, legAtCrotchB = hq + eB; // cada pierna: delantero+trasero ≈ media cadera + extensiones
    const legC = (hq + eF) + (hq + eB) - hq * 1.0; // aprox. contorno disponible para el muslo
    if (legC < thighNeed) { const add = thighNeed - legC; eF += add * 0.35; eB += add * 0.65; }
    const footPass = k.Ft * 1.25;
    let hemC;
    if (o.leg === 'palazzo') hemC = Math.max(k.Th * 1.75, footPass * 1.6);
    else if (o.leg === 'barril') hemC = Math.max(k.An * 2.3, footPass * 1.15);
    else if (o.leg === 'pitillo') hemC = Math.max(k.An * (k.knit ? 1.0 : 1.3), footPass * (k.knit ? 0.9 : 1.05));
    else if (o.leg === 'acampanado') hemC = Math.max(k.Th * 1.3, footPass * 1.3);
    else hemC = Math.max(k.Th * 0.92, k.An * 2.2, footPass * 1.1);
    if (o.hemCv != null) hemC = Math.max(o.hemCv, footPass);
    const kneeC = o.leg === 'barril' ? k.Th * 1.4 : o.leg === 'palazzo' ? lerp(k.Th * 1.35, hemC, 0.5) : o.leg === 'acampanado' ? Math.max(k.Th * 0.82, footPass * 1.05) : lerp(thighNeed, hemC, 0.5);
    const yK = R + (L - R) * 0.45;
    let hemY = o.len === 'corto' ? R + (L - R) * 0.18 : o.len === 'bermuda' ? R + (L - R) * 0.5 : o.len === 'capri' ? R + (L - R) * 0.72 : L;
    if (o.hemYv != null) hemY = Math.min(L + 15, Math.max(R + 4, o.hemYv));
    const casing = o.waist === 'elastico' ? 8 : 0;
    const exc = Math.max(0, hq - wq);
    const mk = (front) => {
      const ext = front ? eF : eB, hqs = front ? hq - 1 : hq + 1;
      const xc = (hqs - ext) / 2, share = front ? 0.47 : 0.53;
      const kW = kneeC * share, hW = hemC * share;
      let cfTop, sideTop, sideUpper;
      const hip = [hqs, k.WH];
      if (o.waist === 'elastico') {
        cfTop = [0, -casing]; sideTop = [hqs, -casing]; sideUpper = [sideTop, hip];
      } else if (front) {
        const cfX = 0.15 * exc; cfTop = [cfX, 0]; sideTop = [cfX + wq, 0];
        sideUpper = bez(sideTop, [sideTop[0] + (hqs - sideTop[0]) * 0.35, k.WH * 0.2], [hqs, k.WH * 0.55], hip);
      } else {
        const cbR = 0.10 * R + 1.5, cbX = 0.30 * exc; cfTop = [cbX, -cbR]; sideTop = [cbX + wq, 0];
        sideUpper = bez(sideTop, [sideTop[0] + (hqs - sideTop[0]) * 0.35, k.WH * 0.2], [hqs, k.WH * 0.55], hip);
      }
      const cy = R + (front ? 0 : 1.5), crotch = [-ext, cy];
      const mid = [0, R * (front ? 0.55 : 0.5)];
      const cf = join([cfTop, mid], bez(mid, [0, R * 0.85], [-ext * 0.55, cy], crotch));
      const inseam = join(bez(crotch, [-ext * 0.6, R + (yK - R) * 0.3], [xc - kW / 2, yK - (yK - R) * 0.35], [xc - kW / 2, yK]), [[xc - hW / 2, L]]);
      const outLow = join(bez(hip, [hqs, R], [xc + kW / 2 + (hqs - (xc + kW / 2)) * 0.4, yK - (yK - R) * 0.4], [xc + kW / 2, yK]), [[xc + hW / 2, L]]);
      const ins = cutY(inseam, hemY), outl = cutY(outLow, hemY);
      const a = ins[ins.length - 1], b = outl[outl.length - 1];
      const outside = join(sideUpper, outl);
      const cbSA = (!front && o.opening) ? S.sa + S.ext : S.sa;
      const edges = [
        E(cf, 'seam', cbSA), E(ins, 'seam', S.sa), E([a, b], 'hem', S.hem), E(rev(outside), 'seam', S.sa),
        E([sideTop, cfTop], o.waist === 'elastico' ? 'hem' : 'seam', o.waist === 'elastico' ? 0.1 : S.sa)
      ];
      const marks = [];
      if (o.waist === 'elastico') marks.push({ t: 'line', pts: [[0, -casing / 2], [hqs, -casing / 2]], dash: true, label: 'doblar jareta (elástico 3 mm)' });
      if (o.jeans) {
        if (front) {
          marks.push({ t: 'line', pts: bez([cfTop[0] + wq * 0.62, 0], [cfTop[0] + wq * 0.62, k.WH * 0.5], [hqs - 1, k.WH * 0.55], [hqs - 0.5, k.WH * 0.8]), dash: true, label: '' });
          marks.push({ t: 'line', pts: bez([cfTop[0] + 1.5, 0], [cfTop[0] + 4, 0], [4, R * 0.45], [0.3, R * 0.62]), dash: true, label: 'pespunte bragueta' });
        } else {
          marks.push({ t: 'line', pts: [[cfTop[0] - 0.2, cfTop[1] + R * 0.35], [sideTop[0] + 0.5, R * 0.2]], dash: true, label: 'línea canesú' });
          const px = xc - 1, py = R * 0.42, pw = hq * 0.36, ph = pw * 1.1;
          marks.push({ t: 'line', pts: [[px - pw / 2, py], [px + pw / 2, py], [px + pw / 2, py + ph * 0.8], [px, py + ph], [px - pw / 2, py + ph * 0.8], [px - pw / 2, py]], dash: true, label: '' });
        }
      }
      if (!front && o.opening) marks.push({ t: 'text', at: [-S.sa, R * 0.25], s: 'abertura', rot: -90, size: 1.6 });
      const pc = piece(front ? 'Pantalón delantero' : 'Pantalón trasero', 'Cortar 2 (en espejo)', edges, { marks });
      pc.grain = [[xc, R + 2], [xc, Math.min(hemY - 2, R + (hemY - R) * 0.8)]];
      pc.labelAt = [xc, (Math.max(0, R * 0.6) + hemY) / 2.3 + 4];
      return pc;
    };
    const out = [mk(true), mk(false)];
    out.meta = { hemY, hemC };
    if (o.waist === 'pretina') { const bh = Math.max(4, k.H * 0.015), bl = Wp + S.ext; out.push(rect('Pretina', 'Cortar 1', bl, 2 * bh, {}, { S, p: { marks: [{ t: 'line', pts: [[0, bh], [bl, bh]], dash: true, label: 'doblar' }] } })); }
    if (o.jeans) {
      const pw = hq * 0.36;
      out.push(rect('Bolsillo trasero', 'Cortar 2', pw, pw * 1.05, { top: 'hem' }, { S }));
      out.push(rect('Trabillas (tira)', 'Cortar 1', Math.max(30, Wp * 0.4), 6, {}, { S, p: { notes: ['Doblar en 3 a lo largo, pespuntear y cortar 5 trozos.'] } }));
    }
    return out;
  }

  // ---------- BRAGAS ----------
  function panties(k, S) {
    const e = k.knit ? -0.05 : 0.04;
    const y0 = k.WH * 0.4;
    const circTop = lerp(k.W, k.Hp, 0.45) * (1 + e);
    const tqF = circTop / 4 - 0.5, tqB = circTop / 4 + 0.5;
    const cw = Math.max(4, 0.045 * k.Hp);
    const total = 2.2 * k.R - 2 * y0;
    const Lf = total * 0.45, Lb = total * 0.55;
    const sideL = Math.max(3, k.WH * 0.7);
    const mk = (front) => {
      const tq = front ? tqF : tqB, Ls = front ? Lf : Lb;
      const leg = front ? bez([cw, Ls], [cw + 1, Ls - (Ls - sideL) * 0.55], [tq * 0.7, sideL + 1], [tq, sideL])
                        : bez([cw, Ls], [cw + (tq - cw) * 0.5, Ls - 1], [tq, sideL + (Ls - sideL) * 0.45], [tq, sideL]);
      return piece(front ? 'Braga delantera' : 'Braga trasera', 'Cortar 1 al doblez', [
        E([[0, 0], [0, Ls]], 'fold', 0), E([[0, Ls], [cw, Ls]], 'seam', S.sa), E(leg, 'hem', S.hem), E([[tq, sideL], [tq, 0]], 'seam', S.sa), E([[tq, 0], [0, 0]], 'hem', S.hem)
      ]);
    };
    return [mk(true), mk(false)];
  }

  // ---------- CORSÉ ----------
  function corset(k, S) {
    const top = k.B * 1.02 / 2, wst = k.W * 1.02 / 2, bot = lerp(k.W, k.Hp, 0.55) * 1.02 / 2;
    const yW = Math.max(8, 0.5 * k.BL - 2), yB = yW + 0.55 * k.WH;
    const W = [0.24, 0.27, 0.27, 0.22], names = ['Corsé centro delantero', 'Corsé costado delantero', 'Corsé costado trasero', 'Corsé centro espalda'];
    const lace = 2.5;
    return W.map((w, i) => {
      const cut = i === 3 ? lace : 0;
      const tw = top * w - cut, ww = wst * w - cut, bw = bot * w - cut;
      const topY = i === 0 ? -1.5 : i === 1 ? -0.5 : i === 2 ? 0.5 : 0;
      const Ls = catmull([[-tw / 2, topY], [-ww / 2, yW], [-bw / 2, yB + (i === 0 ? 1.5 : 0)]]);
      const Rs = catmull([[tw / 2, topY], [ww / 2, yW], [bw / 2, yB + (i === 0 ? 1.5 : 0)]]);
      const edges = [
        E([Ls[0], Rs[0]], 'hem', S.sa), E(Rs, i === 3 ? 'hem' : 'seam', S.sa), E([Rs[Rs.length - 1], Ls[Ls.length - 1]], 'hem', S.sa), E(rev(Ls), 'seam', S.sa)
      ];
      const p = piece(names[i], 'Cortar 2 tela + 2 forro', edges);
      p.marks.push({ t: 'line', pts: [[0, topY + 1.5], [0, yB - 1.5]], dash: true, label: 'canal ballena' });
      p.grain = [[-Math.min(tw, ww) * 0.2, yW * 0.4], [-Math.min(tw, ww) * 0.2, yB * 0.9]];
      p.labelAt = [0, yW];
      if (i === 3) p.notes.push('Borde derecho = borde de ojales (acabado, sin coser a otra pieza).');
      return p;
    });
  }

  // ---------- CAPUCHA ----------
  function hood(k, S, neckHalf) {
    const D = Math.max(k.Hd * 0.36 + 3, neckHalf * 1.05);
    const Hh = k.HdH * 1.2 + k.BL * 0.1 + 3;
    const nH = neckHalf * 0.98;
    const neck = bez([0, Hh], [nH * 0.4, Hh + 2], [nH * 0.8, Hh - 0.03 * Hh], [nH, Hh - 0.1 * Hh]);
    const back = join(bez([nH, Hh - 0.1 * Hh], [D * 1.02, Hh * 0.75], [D * 1.02, Hh * 0.12], [D * 0.6, 0]), [[0, 0]]);
    return piece('Capucha', 'Cortar 2 (en espejo)', [E([[0, 0], [0, Hh]], 'hem', S.hem), E(neck, 'seam', S.sa), E(back, 'seam', S.sa)]);
  }

  // ---------- MEDIAS ----------
  function stockings(k, S, long) {
    const neg = 0.92;
    const footPass = Math.max(k.An, k.Ft * 1.1);
    const topC = long ? k.Th * neg : lerp(k.An, k.Th, 0.25) * neg * 1.05;
    const legLen = long ? k.Ins * 0.88 : Math.max(k.Ins * 0.22, 8);
    const ankC = Math.max(k.An * neg, footPass * 0.88);
    const wT = topC / 2, wA = ankC / 2, wK = (wT + wA) / 2 * 0.98;
    const yF = legLen + k.Ft * 0.85, r = wA * 0.92;
    const side = long ? catmull([[wT, 0], [wK, legLen * 0.5], [wA, legLen], [wA * 0.97, yF - r * 0.3]]) : [[wT, 0], [wA, legLen], [wA * 0.97, yF - r * 0.3]];
    const toe = arc(0, yF - r * 0.3, wA * 0.97, 0, Math.PI / 2, 12);
    const s = join(side, toe);
    return [piece(long ? 'Media larga' : 'Calcetín', 'Cortar 2 al doblez (punto elástico)', [
      E([[0, s[s.length - 1][1]], [0, 0]], 'fold', 0), E([[0, 0], [wT, 0]], 'hem', S.hem), E(s, 'seam', S.sa)
    ], { notes: ['Corta con la mayor elasticidad en horizontal. Medias de nylon recicladas funcionan muy bien.'] })];
  }

  // ---------- CATÁLOGO DE PRENDAS ----------
  const LARGO = { mini: 0.32, rodilla: 0.55, midi: 0.75, largo: 0.98 };
  const MKEYS = ['H', 'B', 'W', 'Hp', 'N', 'Sh', 'BL', 'WH', 'R', 'Ins', 'Out', 'Th', 'An', 'Arm', 'UA', 'Hand', 'Hd', 'HdH', 'Ft'];
  const CATS = ['Diseños propios', 'Faldas', 'Vestidos', 'Tops y camisas', 'Pantalones', 'Monos y petos', 'Chaquetas y abrigos', 'Ropa interior y baño', 'Casa y otros'];
  const G = {
    libre: { n: 'Diseño libre (solo piezas a medida)', cat: 'Diseños propios', fab: 'plano', fit: 'normal', opts: {} },
    // faldas
    falda: { n: 'Falda', cat: 'Faldas', fab: 'plano', fit: 'normal', opts: { tipoFalda: 'A', largo: 'rodilla' } },
    // vestidos
    vestido: { n: 'Vestido (cuerpo + falda)', cat: 'Vestidos', fab: 'plano', fit: 'ajustado', opts: { tipoFalda: 'A', largo: 'rodilla', manga: 'sin', cuello: 'redondo', escoteTipo: 'normal' } },
    vestido_pliegues: { n: 'Vestido con pliegues', cat: 'Vestidos', fab: 'plano', fit: 'ajustado', opts: { largo: 'rodilla', manga: 'corta', cuello: 'redondo' } },
    vestido_recto: { n: 'Vestido recto / camisero', cat: 'Vestidos', fab: 'plano', fit: 'normal', opts: { largo: 'rodilla', manga: 'corta', abertura: 'espalda' } },
    babydoll: { n: 'Vestido babydoll / imperio', cat: 'Vestidos', fab: 'plano', fit: 'normal', opts: { largo: 'mini', manga: 'farol' } },
    slip: { n: 'Slip dress (tirantes)', cat: 'Vestidos', fab: 'plano', fit: 'normal', opts: { largo: 'midi' } },
    victoriano: { n: 'Vestido victoriano', cat: 'Vestidos', fab: 'plano', fit: 'ajustado', opts: { largo: 'largo', manga: 'jamon', volantes: '2' } },
    // tops
    camiseta: { n: 'Camiseta', cat: 'Tops y camisas', fab: 'punto', fit: 'normal', opts: { manga: 'corta', cuello: 'redondo' } },
    top: { n: 'Top (tirantes, bandeau, halter, cruzado)', cat: 'Tops y camisas', fab: 'plano', fit: 'ajustado', opts: { topTipo: 'tirantes' } },
    peplum: { n: 'Top peplum', cat: 'Tops y camisas', fab: 'plano', fit: 'ajustado', opts: { manga: 'sin', cuello: 'redondo' } },
    campesino: { n: 'Top hombros descubiertos', cat: 'Tops y camisas', fab: 'plano', fit: 'normal', opts: {} },
    camisa: { n: 'Camisa / blusa', cat: 'Tops y camisas', fab: 'plano', fit: 'normal', opts: { manga: 'larga' } },
    body: { n: 'Body', cat: 'Tops y camisas', fab: 'punto', fit: 'ajustado', opts: { manga: 'larga', cuello: 'redondo' } },
    corse: { n: 'Corsé', cat: 'Tops y camisas', fab: 'plano', fit: 'ajustado', opts: {} },
    sudadera: { n: 'Sudadera', cat: 'Tops y camisas', fab: 'punto', fit: 'holgado', opts: { capucha: 'si' } },
    // pantalones
    pantalon: { n: 'Pantalón', cat: 'Pantalones', fab: 'plano', fit: 'normal', opts: { cintura: 'elastico', pierna: 'recto', largoP: 'largo' } },
    short: { n: 'Pantalón corto', cat: 'Pantalones', fab: 'plano', fit: 'normal', opts: { cintura: 'elastico', largoP: 'corto' } },
    vaquero: { n: 'Vaquero', cat: 'Pantalones', fab: 'plano', fit: 'ajustado', opts: { pierna: 'pitillo', largoP: 'largo' } },
    cargo: { n: 'Pantalón cargo', cat: 'Pantalones', fab: 'plano', fit: 'holgado', opts: { pierna: 'recto', largoP: 'largo' } },
    jogger: { n: 'Jogger / chándal', cat: 'Pantalones', fab: 'punto', fit: 'holgado', opts: {} },
    leggings: { n: 'Leggings / yoga', cat: 'Pantalones', fab: 'punto', fit: 'ajustado', opts: { largoP: 'largo' } },
    // monos
    enterizo: { n: 'Mono / enterizo', cat: 'Monos y petos', fab: 'plano', fit: 'normal', opts: { manga: 'sin', largoP: 'largo', pierna: 'recto', cuello: 'redondo' } },
    peto: { n: 'Peto (overall)', cat: 'Monos y petos', fab: 'plano', fit: 'normal', opts: { largoP: 'largo', pierna: 'recto' } },
    pichi: { n: 'Pichi (falda con peto)', cat: 'Monos y petos', fab: 'plano', fit: 'normal', opts: { largo: 'rodilla' } },
    // chaquetas
    chaleco: { n: 'Chaleco', cat: 'Chaquetas y abrigos', fab: 'plano', fit: 'normal', opts: { cuello: 'pico' } },
    bomber: { n: 'Chaqueta bomber', cat: 'Chaquetas y abrigos', fab: 'plano', fit: 'holgado', opts: {} },
    vaquera: { n: 'Chaqueta vaquera', cat: 'Chaquetas y abrigos', fab: 'plano', fit: 'normal', opts: {} },
    blazer: { n: 'Blazer', cat: 'Chaquetas y abrigos', fab: 'plano', fit: 'normal', opts: {} },
    abrigo: { n: 'Abrigo', cat: 'Chaquetas y abrigos', fab: 'plano', fit: 'holgado', opts: { largo: 'rodilla' } },
    kimono: { n: 'Kimono', cat: 'Chaquetas y abrigos', fab: 'plano', fit: 'holgado', opts: {} },
    capa: { n: 'Capa', cat: 'Chaquetas y abrigos', fab: 'plano', fit: 'normal', opts: { capucha: 'si' } },
    // interior y baño
    bragas: { n: 'Bragas', cat: 'Ropa interior y baño', fab: 'punto', fit: 'ajustado', opts: {} },
    bikini: { n: 'Bikini / sujetador triángulo', cat: 'Ropa interior y baño', fab: 'punto', fit: 'ajustado', opts: {} },
    banador: { n: 'Bañador', cat: 'Ropa interior y baño', fab: 'punto', fit: 'ajustado', opts: { cuello: 'redondo' } },
    medias_cortas: { n: 'Calcetines', cat: 'Ropa interior y baño', fab: 'punto', fit: 'ajustado', opts: {} },
    medias_largas: { n: 'Medias largas', cat: 'Ropa interior y baño', fab: 'punto', fit: 'ajustado', opts: {} },
    // casa
    pijama: { n: 'Pijama', cat: 'Casa y otros', fab: 'plano', fit: 'holgado', opts: { manga: 'corta', largoP: 'largo' } },
    delantal: { n: 'Delantal', cat: 'Casa y otros', fab: 'plano', fit: 'normal', opts: {} }
  };

  // Estilos con nombre: atajos a una prenda base + opciones (inspirados en Chellywood, patrones comerciales y tendencias 2025-26)
  const STYLES = [
    ['Faldas', 'Falda lápiz', 'falda', { tipoFalda: 'lapiz', largo: 'rodilla' }],
    ['Faldas', 'Minifalda evasé', 'falda', { tipoFalda: 'A', largo: 'mini' }],
    ['Faldas', 'Minifalda de tenis plisada', 'falda', { tipoFalda: 'tableada', largo: 'mini' }],
    ['Faldas', 'Falda de patinadora (circular)', 'falda', { tipoFalda: 'circular', largo: 'mini' }],
    ['Faldas', 'Falda midi satinada al bies', 'falda', { tipoFalda: 'semicircular', largo: 'midi' }],
    ['Faldas', 'Falda fruncida midi', 'falda', { tipoFalda: 'fruncida', largo: 'midi' }],
    ['Faldas', 'Maxifalda boho de 3 pisos', 'falda', { tipoFalda: 'pisos', largo: 'largo' }],
    ['Faldas', 'Falda de 3 volantes corta', 'falda', { tipoFalda: 'pisos', largo: 'mini' }],
    ['Faldas', 'Falda tutú de tul', 'falda', { tipoFalda: 'tutu', largo: 'rodilla' }, 'plano', 'normal'],
    ['Faldas', 'Falda globo (bubble)', 'falda', { tipoFalda: 'globo', largo: 'mini' }],
    ['Faldas', 'Falda cruzada / pareo', 'falda', { tipoFalda: 'cruzada', largo: 'rodilla' }],
    ['Faldas', 'Falda asimétrica alta-baja', 'falda', { tipoFalda: 'altabaja', largo: 'midi' }],
    ['Vestidos', 'Vestido evasé básico', 'vestido', { tipoFalda: 'A', largo: 'rodilla', manga: 'sin' }],
    ['Vestidos', 'Vestido de fiesta con falda de vuelo', 'vestido', { tipoFalda: 'circular', largo: 'rodilla', manga: 'sin' }],
    ['Vestidos', 'Vestido palabra de honor', 'vestido', { escoteTipo: 'strapless', tipoFalda: 'A', largo: 'rodilla' }],
    ['Vestidos', 'Vestido de noche lápiz palabra de honor', 'vestido', { escoteTipo: 'strapless', tipoFalda: 'lapiz', largo: 'largo' }],
    ['Vestidos', 'Vestido halter', 'vestido', { escoteTipo: 'halter', tipoFalda: 'A', largo: 'rodilla' }],
    ['Vestidos', 'Vestido cruzado (wrap)', 'vestido', { escoteTipo: 'wrap', tipoFalda: 'cruzada', largo: 'midi', manga: 'corta' }],
    ['Vestidos', 'Vestido de tirantes con falda fruncida', 'vestido', { escoteTipo: 'tirantes', tipoFalda: 'fruncida', largo: 'rodilla' }],
    ['Vestidos', 'Vestido boho de pisos', 'vestido', { tipoFalda: 'pisos', largo: 'largo', manga: 'farol' }],
    ['Vestidos', 'Vestido globo', 'vestido', { tipoFalda: 'globo', largo: 'mini', manga: 'sin' }],
    ['Vestidos', 'Vestido colegial de pliegues', 'vestido_pliegues', { largo: 'rodilla', manga: 'corta' }],
    ['Vestidos', 'Vestido recto (shift)', 'vestido_recto', { largo: 'rodilla', manga: 'sin', abertura: 'espalda' }],
    ['Vestidos', 'Vestido camisero', 'vestido_recto', { largo: 'midi', manga: 'larga', abertura: 'delante' }],
    ['Vestidos', 'Babydoll / corte imperio', 'babydoll', { largo: 'mini', manga: 'farol' }],
    ['Vestidos', 'Slip dress midi', 'slip', { largo: 'midi' }],
    ['Vestidos', 'Camisón / negligé', 'slip', { largo: 'largo' }, 'plano', 'holgado'],
    ['Vestidos', 'Vestido victoriano', 'victoriano', { largo: 'largo', manga: 'jamon', volantes: '2' }],
    ['Vestidos', 'Vestido de novia', 'victoriano', { largo: 'largo', manga: 'obispo', volantes: '3' }],
    ['Vestidos', 'Vestido de quinceañera / princesa', 'vestido', { escoteTipo: 'strapless', tipoFalda: 'pisos', largo: 'largo' }],
    ['Tops y camisas', 'Camiseta básica', 'camiseta', { manga: 'corta' }],
    ['Tops y camisas', 'Camiseta manga larga', 'camiseta', { manga: 'larga' }],
    ['Tops y camisas', 'Crop top', 'camiseta', { manga: 'corta', largoTop: 'crop' }],
    ['Tops y camisas', 'Top de tirantes / camisola', 'top', { topTipo: 'tirantes' }],
    ['Tops y camisas', 'Top palabra de honor (bandeau)', 'top', { topTipo: 'bandeau' }],
    ['Tops y camisas', 'Top halter', 'top', { topTipo: 'halter' }],
    ['Tops y camisas', 'Top cruzado tipo ballet', 'top', { topTipo: 'cruzado' }, 'punto', 'ajustado'],
    ['Tops y camisas', 'Top peplum', 'peplum', { manga: 'sin' }],
    ['Tops y camisas', 'Top hombros descubiertos', 'campesino', {}],
    ['Tops y camisas', 'Camisa clásica', 'camisa', { manga: 'larga' }],
    ['Tops y camisas', 'Blusa manga farol', 'camisa', { manga: 'farol' }],
    ['Tops y camisas', 'Body manga larga', 'body', { manga: 'larga' }],
    ['Tops y camisas', 'Corsé', 'corse', {}],
    ['Tops y camisas', 'Sudadera con capucha', 'sudadera', { capucha: 'si' }],
    ['Tops y camisas', 'Sudadera sin capucha', 'sudadera', { capucha: 'no' }],
    ['Pantalones', 'Pantalón recto', 'pantalon', { pierna: 'recto' }],
    ['Pantalones', 'Pantalón campana', 'pantalon', { pierna: 'acampanado' }],
    ['Pantalones', 'Palazzo / pierna ancha', 'pantalon', { pierna: 'palazzo' }],
    ['Pantalones', 'Capri', 'pantalon', { pierna: 'pitillo', largoP: 'capri' }],
    ['Pantalones', 'Short', 'short', { largoP: 'corto' }],
    ['Pantalones', 'Bermuda', 'short', { largoP: 'bermuda' }],
    ['Pantalones', 'Vaquero pitillo', 'vaquero', { pierna: 'pitillo' }],
    ['Pantalones', 'Vaquero barril (barrel)', 'vaquero', { pierna: 'barril' }],
    ['Pantalones', 'Vaquero campana', 'vaquero', { pierna: 'acampanado' }],
    ['Pantalones', 'Vaquero pierna ancha', 'vaquero', { pierna: 'palazzo' }],
    ['Pantalones', 'Short vaquero (jort)', 'vaquero', { pierna: 'recto', largoP: 'corto' }],
    ['Pantalones', 'Pantalón cargo', 'cargo', { pierna: 'recto' }],
    ['Pantalones', 'Jogger', 'jogger', {}],
    ['Pantalones', 'Leggings / yoga', 'leggings', {}],
    ['Monos y petos', 'Mono largo', 'enterizo', { largoP: 'largo', manga: 'sin' }],
    ['Monos y petos', 'Mono corto', 'enterizo', { largoP: 'corto', manga: 'corta' }],
    ['Monos y petos', 'Peto vaquero', 'peto', { largoP: 'largo' }],
    ['Monos y petos', 'Peto corto', 'peto', { largoP: 'corto' }],
    ['Monos y petos', 'Pichi', 'pichi', { largo: 'rodilla' }],
    ['Chaquetas y abrigos', 'Chaleco', 'chaleco', {}],
    ['Chaquetas y abrigos', 'Chaqueta bomber', 'bomber', {}],
    ['Chaquetas y abrigos', 'Chaqueta vaquera', 'vaquera', {}],
    ['Chaquetas y abrigos', 'Blazer', 'blazer', {}],
    ['Chaquetas y abrigos', 'Abrigo', 'abrigo', { largo: 'rodilla' }],
    ['Chaquetas y abrigos', 'Kimono', 'kimono', {}],
    ['Chaquetas y abrigos', 'Capa con capucha', 'capa', { capucha: 'si' }],
    ['Ropa interior y baño', 'Bragas', 'bragas', {}],
    ['Ropa interior y baño', 'Bikini', 'bikini', {}],
    ['Ropa interior y baño', 'Bañador', 'banador', {}],
    ['Ropa interior y baño', 'Calcetines', 'medias_cortas', {}],
    ['Ropa interior y baño', 'Medias largas', 'medias_largas', {}],
    ['Casa y otros', 'Pijama', 'pijama', { manga: 'corta' }],
    ['Casa y otros', 'Delantal', 'delantal', {}]
  ];

  const STEPS = {
    falda: ['Remata los bordes con antideshilachante o zigzag.', 'Cose pinzas, frunces o tablas según el modelo.', 'Une las piezas por los costados (en faldas de pisos: une cada piso en anillo y frúncelo sobre el anterior).', 'Cose el centro espalda desde el bajo hasta la mitad; deja abierto el resto.', 'Monta la pretina, dóblala y remátala.', 'Dobladillo y velcro o corchete en la abertura (cruce ≈5 mm).'],
    vestido: ['Cose pinzas de delantero y espalda.', 'Une hombros del cuerpo y del forro por separado (sin hombros en palabra de honor).', 'Forra el cuerpo: cose escote, sisas y centro espalda, recorta, piquetea y da la vuelta.', 'Cierra costados de cuerpo y forro de una pasada.', 'Monta mangas en plano si las lleva; tirantes o lazo halter entre tela y forro.', 'Prepara la falda (pinzas, frunce, pisos, pliegues) y únela al talle.', 'Cierra el centro espalda de la falda hasta media altura, dobladillo y velcro.'],
    vestido_recto: ['Cose pinzas si las hay.', 'Une hombros; acaba el escote con vista o bies (o monta el cuello si es camisero).', 'Monta mangas en plano.', 'Cierra costados y mangas de una pasada.', 'Dobladillo; velcro en la espalda o broches de 3 mm en el delantero.', 'Camisero: cinturón de tela del mismo tejido.'],
    babydoll: ['Forra el cuerpo corto (escote, sisas, espalda).', 'Monta las mangas farol frunciendo la copa.', 'Frunce la falda y únela bajo el pecho.', 'Cierra la espalda y velcro; dobladillo.'],
    slip: ['Corta la tela al bies si es satén: cae mucho mejor.', 'Cose el escote en pico con vista o bies muy fino.', 'Haz los tirantes (tubo de 2–3 mm o cinta de raso) y cóselos.', 'Cierra costados y dobladillo estrecho; velcro o abertura en la espalda.'],
    victoriano: ['Cose las pinzas del cuerpo; la punta delantera queda en el centro.', 'Forra el cuerpo completo (escote y espalda).', 'Frunce la copa de la manga jamón entre puntos y móntala.', 'Prepara la falda muy fruncida (2 hilos de frunce).', 'Volantes: dobladillo, frunce a la mitad y aplícalos sobre las líneas marcadas.', 'Aplica puntilla estrecha (5–15 mm) en cuello alto, puños y bajos.', 'Une falda y cuerpo; cierra la espalda con broches o velcro fino.', 'Opcional: enagua de tul con el patrón de falda tutú.'],
    camiseta: ['Une hombros.', 'Cose la tira de escote estirándola ligeramente.', 'Monta mangas en plano.', 'Cierra costados y bajos de manga de una pasada.', 'Dobladillos con zigzag; velcro en la espalda.'],
    top: ['Forra el top con la misma pieza (tela fina) o remata con bies.', 'Tirantes / lazo halter / lazos del cruzado: tubo de tela o cinta de raso, entre tela y forro.', 'Une costados; en bandeau pon elástico de 2 mm en el borde superior.', 'Cierre: velcro en espalda o lazos.'],
    peplum: ['Forra el cuerpo.', 'Une las piezas del peplum por los costados y haz dobladillo estrecho en el borde exterior.', 'Cose el peplum a la cintura del cuerpo.', 'Velcro en la espalda.'],
    campesino: ['Cose las dos piezas por los costados formando un tubo.', 'Haz la jareta superior y pasa elástico de 3 mm a la medida del contorno sobre los brazos.', 'Dobladillo.', 'Mangas: tubos con elástico arriba y abajo que se ponen sobre los brazos.'],
    camisa: ['Remata bordes con antideshilachante.', 'Une hombros; prepara el cuello (2 capas, da la vuelta y plancha).', 'Monta el cuello en el escote.', 'Monta mangas en plano, cierra costados y mangas de una pasada.', 'Dobla vistas delanteras (cruce), dobladillo y botones/broches de 3 mm.'],
    body: ['Une hombros, tira de escote, mangas en plano.', 'Cierra costados.', 'Cose la entrepierna (o pon un broche diminuto).', 'Remata piernas con zigzag; velcro en espalda.'],
    corse: ['Corta cada panel en tela exterior y en forro firme.', 'Une los paneles exteriores entre sí y los del forro entre sí.', 'Cose canales a cada lado de las costuras.', 'Ballenas: plástico fino, cerdas de escoba o hilo de pesca grueso.', 'Une exterior y forro arriba y abajo con bies.', 'Borde de espalda: ojales diminutos y cordón de raso de 1–2 mm.'],
    sudadera: ['Usa punto fino que no se deshilache.', 'Cose el bolsillo canguro.', 'Une hombros y monta la capucha al escote.', 'Monta mangas en plano y cierra costados de una pasada.', 'Dobladillos o puños; cierre delantero con velcro.'],
    pantalon: ['Dobladillos en plano (mucho más fácil a esta escala).', 'Une cada delantero con su trasero por el costado.', 'Cose el tiro completo.', 'Cose la entrepierna de un bajo a otro en una pasada.', 'Jareta con elástico o pretina con abertura trasera y velcro.'],
    vaquero: ['Denim ligero (4–6 oz) o chambray y aguja 70/10.', 'Pespuntea con hilo mostaza a 1,5 mm: canesú, bolsillos, bragueta falsa.', 'Cose bolsillos traseros antes de montar.', 'Laterales, dobladillos en plano, tiro dejando 2/3 abierto atrás.', 'Pretina y trabillas; velcro fino en la abertura.'],
    cargo: ['Cose los bolsillos de fuelle con su tapeta sobre las perneras (línea marcada).', 'Monta como un pantalón: costados, dobladillos, tiro, entrepierna.', 'Jareta con elástico o cordón.'],
    jogger: ['Punto de sudadera fino.', 'Une costados, tiro y entrepierna.', 'Puños de canalé en los tobillos (estirados al coser).', 'Jareta con elástico de 3 mm.'],
    leggings: ['Licra o punto con elasticidad en 4 direcciones (las medias de nylon sirven).', 'Cose con zigzag o puntada elástica.', 'Costados, tiro y entrepierna.', 'Dobla la cintura con elástico de 2–3 mm.'],
    enterizo: ['Monta el cuerpo (con forro).', 'Monta el pantalón dejando el tiro trasero abierto arriba.', 'Une cuerpo y pantalón por la cintura.', 'Velcro fino desde el cuello hasta 2/3 del tiro trasero.'],
    peto: ['Monta el pantalón o la falda con abertura lateral o trasera.', 'Forra el peto y cóselo a la pretina delantera.', 'Haz los tirantes, crúzalos en la espalda y fíjalos con broches.', 'Botones decorativos de 3 mm en el peto.'],
    chaleco: ['Corta tela y forro.', 'Une hombros de tela y de forro.', 'Cose forro sobre tela por todo el borde dejando costados abiertos.', 'Da la vuelta por los hombros, plancha y cierra costados.', 'Botones decorativos y broche oculto.'],
    bomber: ['Une hombros y monta mangas en plano.', 'Cierra costados y mangas.', 'Monta el cuello, los puños y la cinta de cintura de punto canalé estirándolos.', 'Cierre delantero con velcro; cremallera decorativa opcional.'],
    vaquera: ['Pespunte de canesú y bolsillos en el delantero y espalda.', 'Une hombros, monta el cuello de camisa.', 'Mangas en plano, cierra costados.', 'Monta la cinta de cintura y los puños.', 'Botones o broches de 3 mm.'],
    blazer: ['Entretela fina en delanteros y solapas.', 'Une hombros de tela y de forro (el forro puede ser la misma pieza en tela fina).', 'Cose el cuello a la tela, forra todo el borde delantero y solapas, da la vuelta.', 'Dobla la solapa por la línea marcada y plancha.', 'Mangas en plano, cierra costados; un botón y broche oculto.'],
    kimono: ['Une espalda y delanteros por los hombros.', 'Monta las mangas rectangulares.', 'Cierra costados y bajos de manga.', 'Cose la tira de cuello por todo el borde delantero.', 'Cinturón (obi) de tela.'],
    capa: ['Une los dos centros delanteros a la capucha si la lleva.', 'Forra la capa (misma pieza) o remata el borde con bies.', 'Cierre con cinta de raso o un broche en el cuello.'],
    bragas: ['Cose costados y entrepierna.', 'Dobla 2–3 mm en cintura y piernas y cose con zigzag estrecho (o elástico de 2 mm).'],
    bikini: ['Corta cada triángulo en tela y forro; cóselos por los bordes y da la vuelta.', 'Pasa la cinta inferior por el canal y ata a la espalda.', 'Ata los tirantes al cuello.', 'La braguita se monta como las bragas.'],
    banador: ['Licra fina.', 'Une hombros, cierra costados y entrepierna.', 'Remata escote, sisas y piernas con zigzag o elástico de 2 mm.', 'Velcro o broche en la espalda.'],
    medias_cortas: ['Dobla al centro y cose con zigzag estrecho o puntada elástica.', 'Recorta a 1,5 mm y da la vuelta con un palillo.'],
    medias_largas: ['Igual que los calcetines; prueba en la muñeca antes de recortar el margen.'],
    pijama: ['Camisa: como la camisa (puedes sustituir el cuello por bies).', 'Pantalón con jareta de elástico de 3 mm.', 'Telas: algodón estampado fino o franela muy ligera.'],
    delantal: ['Dobladillo en peto y falda.', 'Frunce la falda y únela a la cinta.', 'Cose el peto a la cinta; tirantes al cuello o cruzados.', 'Bolsillo opcional.']
  };
  STEPS.vestido_pliegues = STEPS.vestido.slice(0, 5).concat(['Marca y plancha las tablas; hilvana la cintura.', 'Une la falda al talle, cierra la espalda y velcro.']);
  STEPS.short = STEPS.pantalon; STEPS.abrigo = STEPS.blazer; STEPS.pichi = STEPS.peto;

  // ---------- PIEZAS A MEDIDA (diseños propios) ----------
  // medidas en cm tal como las escribe la diseñadora; sx/sy permiten adaptarlas a otra muñeca
  function customPiece(c, S) {
    const sx = (c._sx || 1) * 10, sy = (c._sy || 1) * 10, num = v => Math.max(0, parseFloat(String(v).replace(',', '.')) || 0);
    const name = (c.nombre || 'Pieza').slice(0, 40), cut = c.cortar || 'Cortar 2', fold = !!c.doblez;
    const bk = c.bajo ? 'hem' : 'seam', bsa = c.bajo ? S.hem : S.sa;
    const extra = { notes: c.nota ? [String(c.nota).slice(0, 200)] : [] };
    if (c.tipo === 'rect') {
      const w = num(c.ancho) * sx || 10, h = num(c.alto) * sy || 10;
      return rect(name, cut, fold ? w / 2 : w, h, { left: fold ? 'fold' : 'seam', bottom: c.bajo ? 'hem' : 'seam' }, { S, p: extra });
    }
    if (c.tipo === 'trap') {
      const a = num(c.ancho_sup) * sx || 10, b = num(c.ancho_inf) * sx || 10, h = num(c.alto) * sy || 10;
      if (fold) return piece(name, cut, [E([[0, h], [0, 0]], 'fold', 0), E([[0, 0], [a / 2, 0]], 'seam', S.sa), E([[a / 2, 0], [b / 2, h]], 'seam', S.sa), E([[b / 2, h], [0, h]], bk, bsa)], extra);
      const m = Math.max(a, b) / 2;
      return piece(name, cut, [E([[m - a / 2, 0], [m + a / 2, 0]], 'seam', S.sa), E([[m + a / 2, 0], [m + b / 2, h]], 'seam', S.sa), E([[m + b / 2, h], [m - b / 2, h]], bk, bsa), E([[m - b / 2, h], [m - a / 2, 0]], 'seam', S.sa)], extra);
    }
    if (c.tipo === 'sector') {
      const th = Math.min(359, Math.max(5, num(c.angulo) || 90)) * Math.PI / 180;
      const r = Math.max(2, num(c.contorno) * sx / th), L = num(c.largo) * sy || 20, R = r + L;
      return piece(name, cut, [E([[r, 0], [R, 0]], fold ? 'fold' : 'seam', fold ? 0 : S.sa), E(arc(0, 0, R, 0, th), bk, bsa), E([[R * Math.cos(th), R * Math.sin(th)], [r * Math.cos(th), r * Math.sin(th)]], 'seam', S.sa), E(arc(0, 0, r, th, 0), 'seam', S.sa)],
        Object.assign(extra, { labelAt: [(r + R) / 2 * Math.cos(th / 2), (r + R) / 2 * Math.sin(th / 2)] }));
    }
    if (c.tipo === 'puntos') {
      const pts = String(c.puntos || '').split(/[;\n]+/).map(t => t.trim().split(/[\s,]+/).map(v => parseFloat(v))).filter(q => q.length >= 2 && isFinite(q[0]) && isFinite(q[1])).map(q => [q[0] * sx, q[1] * sy]);
      if (pts.length < 3) return null;
      const edges = pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; return (i === 0 && fold) ? E([p, q], 'fold', 0) : E([p, q], 'seam', S.sa); });
      return piece(name, cut, edges, extra);
    }
    return null;
  }

  // Si la sisa es más corta que el ancho mínimo de manga (manos rígidas), bajar la sisa.
  function bodiceFor(k, S, o, hasSleeve) {
    let bd = bodice(k, S, o);
    if (!hasSleeve) return bd;
    const SW = Math.max(k.UA * (1 + Math.max(k.e, 0) + 0.18), k.Hand * 1.1 + 2);
    const need = SW * 1.2 / (k.knit ? 1 : 1.04);
    let la = o.lowerArm || 0;
    while (bd.armLen < need && la < 30) { la += 1; bd = bodice(k, S, Object.assign({}, o, { lowerArm: la })); }
    return bd;
  }

  function build(gKey, m, S) {
    const g = G[gKey] || G.falda, o = Object.assign({}, g.opts, S.opts || {});
    S = Object.assign({ sa: 5, hem: 7, ext: 5, p: {} }, S);
    const k0 = prep(m, S);
    S.ext = Math.max(4, k0.H * 0.017);
    const needs = new Set();
    const k = new Proxy(k0, { get(t, p) { if (typeof p === 'string' && MKEYS.includes(p)) needs.add(p); return t[p]; } });
    const used = [], seen = {};
    const par = (key, label, def, unit) => {
      const raw = S.p[key], ov = (raw != null && raw !== '' && !isNaN(+raw)) ? +raw : null;
      const v = ov != null ? (unit === 'x' ? ov : ov * 10) : def;
      if (!seen[key]) { seen[key] = 1; used.push({ key, label, unit: unit || 'cm', def: unit === 'x' ? Math.round(def * 100) / 100 : r1(def / 10), val: unit === 'x' ? Math.round(v * 100) / 100 : r1(v / 10), over: ov != null }); }
      return v;
    };
    let P = [], notes = [];
    const Lsk = (key) => par(key || 'largoFalda', 'Largo de falda (cintura → bajo)', LARGO[o.largo || 'rodilla'] * k.Out);
    const vuelo = (def) => par('vuelo', 'Vuelo (veces el contorno)', def, 'x');
    const sk = (opt) => {
      const t = opt.type;
      if (['fruncida', 'pisos', 'tutu'].includes(t)) opt.fullness = vuelo(t === 'tutu' ? 3 : t === 'pisos' ? 1.5 : (opt.fullness || 1.8));
      return skirt(k, S, opt);
    };
    const mkSleeve = (bd, type) => {
      if (!type || type === 'sin') return [];
      const d = sleeve(k, S, bd.armLen, type), L0 = d[0].meta.L, H0 = d[0].meta.hemW;
      const L = par('largoManga', 'Largo de manga (hombro → bajo)', L0), hw = par('anchoManga', 'Ancho del bajo de manga (en plano)', H0);
      return (L !== L0 || hw !== H0) ? sleeve(k, S, bd.armLen, type, { L, hemW: hw }) : d;
    };
    const mkBod = (opt, hasSleeve, lenLabel) => {
      opt = Object.assign({}, opt);
      if ((opt.top || 'normal') === 'normal' && opt.neck !== 'pico') {
        const nd0 = k.N / 6 + 2 + (opt.neckDrop || 0);
        const nd = par('escote', 'Profundidad del escote delantero', nd0);
        if (nd !== nd0) opt.neckDepth = nd;
      }
      let bd = bodiceFor(k, S, opt, hasSleeve);
      if (['hip', 'crop', 'dress'].includes(opt.mode)) {
        const L0 = bd.bottomF, L = par('largoCuerpo', lenLabel || 'Largo de la prenda (hombro → bajo)', L0);
        if (Math.abs(L - L0) > 0.05) { opt.length = Math.max(bd.yUA + 3, L); bd = bodiceFor(k, S, opt, hasSleeve); }
      }
      return bd;
    };
    const mkPants = (opt) => {
      const d = pants(k, S, opt), y0 = d.meta.hemY, c0 = d.meta.hemC;
      const y = par('largoPantalon', 'Largo del pantalón (cintura → bajo)', y0), c = par('anchoBajo', 'Contorno del bajo de pierna', c0);
      return (y !== y0 || c !== c0) ? pants(k, S, Object.assign({}, opt, { hemYv: y, hemCv: c })) : d;
    };
    const band = (name, len, h, cut) => rect(name, cut || 'Cortar 1', len, 2 * h, {}, { S, p: { marks: [{ t: 'line', pts: [[0, h], [len, h]], dash: true, label: 'doblar' }] } });
    const bandH = Math.max(4, k.H * 0.015);
    const Wp = k.W * (1 + k.e * 0.8) + k.bulk, Hpp = k.Hp * (1 + k.e * 0.8) + k.bulk;
    const topMap = { tirantes: 'strapless', bandeau: 'strapless', halter: 'halter', cruzado: 'wrap', normal: 'normal' };

    switch (gKey) {
      case 'libre': P = []; break;
      case 'falda': P = sk({ type: o.tipoFalda, L: Lsk() }); break;
      case 'vestido': case 'vestido_pliegues': {
        const et = o.escoteTipo || 'normal', tp = topMap[et] || 'normal';
        const hasS = tp === 'normal' || tp === 'wrap' ? (o.manga && o.manga !== 'sin') : false;
        const bd = mkBod({ mode: 'waist', opening: 'back', darts: true, neck: o.cuello, top: tp, sleeveless: !hasS, lowerArm: hasS ? 0 : 1, bottomKind: 'seam' }, hasS);
        P = bodicePieces(bd, S, { f: 'Cuerpo delantero', b: 'Cuerpo espalda' });
        if (hasS) P = P.concat(mkSleeve(bd, o.manga)); else notes.push('Forra el cuerpo (mismas piezas en tela fina) para acabar sisas y escote limpios.');
        if (et === 'tirantes') P.push(rect('Tirantes', 'Cortar 2', bd.yUA * 2.2, 8, {}, { S, p: { notes: ['Dobla en 4 a lo largo y pespuntea: tirante de ≈2 mm. O usa cinta de raso.'] } }));
        if (et === 'halter') P.push(rect('Lazo halter', 'Cortar 2', k.N * 0.9 + 20, 8, {}, { S }));
        if (et === 'wrap') { P.push(rect('Lazos', 'Cortar 2', Wp * 0.8, 8, {}, { S })); notes.push('Cruzado: el delantero se corta 2 veces; un lazo se pasa por un ojal en el costado.'); }
        const t = gKey === 'vestido_pliegues' ? 'tableada' : o.tipoFalda;
        P = P.concat(sk({ type: t, L: Lsk(), band: false }));
        break;
      }
      case 'vestido_recto': {
        const front = o.abertura === 'delante', hasS = o.manga && o.manga !== 'sin';
        const bd = mkBod({ mode: 'dress', opening: front ? 'front' : 'back', darts: true, neck: 'redondo', sleeveless: !hasS, length: k.BL + LARGO[o.largo || 'rodilla'] * k.Out, flare: 0.08 * k.Out }, hasS, 'Largo del vestido (hombro → bajo)');
        P = bodicePieces(bd, S, { f: 'Vestido delantero', b: 'Vestido espalda' });
        P = P.concat(mkSleeve(bd, o.manga === 'larga' ? 'obispo' : o.manga));
        if (front) {
          const ch = Math.max(5, k.H * 0.022), Lc = bd.neckHalf;
          P.push(piece('Cuello camisero', 'Cortar 2 al doblez', [E([[0, 0], [0, ch]], 'fold', 0), E([[0, ch], [Lc, ch]], 'seam', S.sa), E([[Lc, ch], [Lc + 2, -1]], 'seam', S.sa), E([[Lc + 2, -1], [0, 0]], 'seam', S.sa)]));
          P.push(rect('Cinturón', 'Cortar 1', Wp * 1.3, 2 * bandH, {}, { S }));
        }
        break;
      }
      case 'babydoll': {
        const hasS = o.manga && o.manga !== 'sin';
        const bd0 = bodice(k, S, { mode: 'crop' });
        const cropY = bd0.yUA + 0.4 * (bd0.wF - bd0.yUA);
        const bd = mkBod({ mode: 'crop', opening: 'back', darts: false, neck: 'redondo', sleeveless: !hasS, length: cropY, bottomKind: 'seam' }, hasS, 'Largo del cuerpo (hombro → bajo pecho)');
        P = bodicePieces(bd, S, { f: 'Cuerpo delantero', b: 'Cuerpo espalda' });
        P = P.concat(mkSleeve(bd, o.manga));
        const L = Lsk() + (bd0.wF - cropY);
        P = P.concat(sk({ type: 'fruncida', L, band: false, fullness: 1.7, gatherTo: bd.qB * 4 }));
        break;
      }
      case 'slip': {
        const L = par('largoFalda', 'Largo desde la cintura', LARGO[o.largo || 'midi'] * k.Out);
        const bd = mkBod({ mode: 'dress', opening: 'back', top: 'strapless', vTop: 4, darts: false, length: k.BL + L, flare: par('vueloBajo', 'Vuelo extra en el bajo (por costado)', 0.12 * k.Out) });
        P = bodicePieces(bd, S, { f: 'Slip delantero', b: 'Slip espalda' });
        P.push(rect('Tirantes', 'Cortar 2', bd.yUA * 2.2, 8, {}, { S }));
        notes.push('Corta al bies (flecha de hilo a 45°) si usas satén: cae como un slip de verdad.');
        break;
      }
      case 'victoriano': {
        const bd = mkBod({ mode: 'waist', opening: 'back', darts: true, pointFront: true, bottomKind: 'seam' }, true);
        P = bodicePieces(bd, S, { f: 'Cuerpo delantero (punta)', b: 'Cuerpo espalda' });
        P = P.concat(mkSleeve(bd, o.manga || 'jamon'));
        const ch = Math.max(5, k.H * 0.022);
        P.push(rect('Cuello alto', 'Cortar 2 (tela+entretela)', bd.neckHalf * 2 + S.ext, ch, {}, { S }));
        const L = Lsk();
        const skp = sk({ type: 'fruncida', L, band: false, fullness: 2.4 });
        const nv = +(o.volantes || 0);
        skp[0].marks.push(...[1, 2, 3].slice(0, Math.max(nv, 1)).map(i => ({ t: 'line', pts: [[0, L * (1 - i * 0.2)], [skp[0].rectInfo[0], L * (1 - i * 0.2)]], dash: true, label: 'línea volante/encaje ' + i })));
        P = P.concat(skp);
        if (nv > 0) {
          const hemW = skp[0].rectInfo[0] * 2, vh = L * 0.18, vl = hemW * 1.8, parts = Math.ceil(vl / 175);
          P.push(rect('Volante', 'Cortar ' + nv * parts + ' tiras', vl / parts, vh, { bottom: 'hem' }, { S, p: { notes: ['Une ' + parts + ' tiras por volante, frunce al 50% y aplica sobre la línea marcada.'] } }));
        }
        notes.push('Encaje recomendado: puntilla de algodón de 5–15 mm; el encaje ancho se ve desproporcionado.');
        break;
      }
      case 'camiseta': {
        const crop = o.largoTop === 'crop', hasS = o.manga && o.manga !== 'sin';
        const bd = mkBod({ mode: crop ? 'crop' : 'hip', opening: 'back', darts: false, straight: true, neck: o.cuello, neckDrop: 1 }, hasS);
        P = bodicePieces(bd, S, { f: 'Camiseta delantero', b: 'Camiseta espalda' });
        P = P.concat(mkSleeve(bd, o.manga));
        P.push(rect('Tira de escote', 'Cortar 1', bd.neckHalf * 2 * 0.92 + S.ext * 2, 10, {}, { S }));
        break;
      }
      case 'top': {
        const tt = o.topTipo || 'tirantes', tp = topMap[tt];
        const bd = mkBod({ mode: tt === 'cruzado' ? 'waist' : 'crop', opening: tt === 'cruzado' ? 'none' : 'back', top: tp, darts: tt !== 'cruzado', sleeveless: true, bottomKind: 'hem', vTop: tt === 'tirantes' ? 3 : 0 }, false, 'Largo del top (arriba → bajo)');
        P = bodicePieces(bd, S, { f: 'Top delantero', b: 'Top espalda' });
        if (tt === 'cruzado') P[0].cut = 'Cortar 2 (en espejo)';
        P.forEach(p => p.cut += ' + forro');
        if (tt === 'tirantes') P.push(rect('Tirantes', 'Cortar 2', bd.yUA * 2.2, 8, {}, { S }));
        if (tt === 'halter') P.push(rect('Lazo halter', 'Cortar 2', k.N * 0.9 + 20, 8, {}, { S }));
        if (tt === 'cruzado') P.push(rect('Lazos', 'Cortar 2', Wp * 0.9, 8, {}, { S }));
        if (tt === 'bandeau') notes.push('Bandeau: elástico de 2 mm en el borde superior para que no se caiga.');
        break;
      }
      case 'peplum': {
        const hasS = o.manga && o.manga !== 'sin';
        const bd = mkBod({ mode: 'waist', opening: 'back', darts: true, neck: o.cuello, sleeveless: !hasS, bottomKind: 'seam' }, hasS);
        P = bodicePieces(bd, S, { f: 'Cuerpo delantero', b: 'Cuerpo espalda' });
        P = P.concat(mkSleeve(bd, o.manga));
        const pl = sk({ type: 'circular', L: par('largoPeplum', 'Largo del peplum', k.WH * 1.3), band: false });
        pl.forEach(p => p.name = p.name.replace('Falda circular', 'Peplum'));
        P = P.concat(pl);
        break;
      }
      case 'campesino': {
        const top = Math.max(k.B, k.Sh * 2) + 2 * k.UA * 0.6;
        const h = par('largoCuerpo', 'Largo (axila → bajo)', k.BL * 0.55 + k.WH * 0.6);
        const half = Math.max(top * 1.5, Hpp * 1.05) / 4;
        P.push(rect('Cuerpo (delantero y espalda)', 'Cortar 2 al doblez', half, h + 8, { left: 'fold', top: 'hem', bottom: 'hem' }, { S, p: { marks: [{ t: 'line', pts: [[0, 4], [half, 4]], dash: true, label: 'jareta elástico ' + r1(top * 0.92 / 10) + ' cm' }] } }));
        P.push(rect('Manga abullonada (tubo)', 'Cortar 2', Math.max(k.UA * 1.7, k.Hand * 1.3), k.Arm * 0.28 + 8, { top: 'hem', bottom: 'hem' }, { S }));
        break;
      }
      case 'camisa': {
        const bd = mkBod({ mode: 'hip', opening: 'front', darts: false, neck: 'redondo' }, o.manga !== 'sin');
        P = bodicePieces(bd, S, { f: 'Camisa delantero', b: 'Camisa espalda' });
        const ch = Math.max(5, k.H * 0.022), Lc = bd.neckHalf;
        P.push(piece('Cuello camisa', 'Cortar 2 al doblez', [E([[0, 0], [0, ch]], 'fold', 0), E([[0, ch], [Lc, ch]], 'seam', S.sa), E([[Lc, ch], [Lc + 2, -1]], 'seam', S.sa), E([[Lc + 2, -1], [0, 0]], 'seam', S.sa)]));
        P = P.concat(mkSleeve(bd, o.manga === 'larga' ? 'obispo' : o.manga));
        const e0 = bd.F.edges[0].pts;
        P[0].marks.push(...[0.25, 0.5, 0.75].map(t => ({ t: 'dot', at: [-S.ext * 0.5, e0[0][1] + t * (e0[1][1] - e0[0][1])] })));
        break;
      }
      case 'body': case 'banador': {
        const ban = gKey === 'banador', hasS = !ban && o.manga && o.manga !== 'sin';
        const bd = mkBod({ mode: 'body', opening: 'back', darts: false, neck: o.cuello, sleeveless: !hasS, neckDrop: ban ? 3 : 0, lowerArm: ban ? 2 : 0 }, hasS);
        P = bodicePieces(bd, S, { f: ban ? 'Bañador delantero' : 'Body delantero', b: ban ? 'Bañador espalda' : 'Body espalda' });
        P = P.concat(mkSleeve(bd, hasS ? o.manga : 'sin'));
        break;
      }
      case 'corse': P = corset(k, S); notes.push('Corsé sin holgura: el plástico no comprime. Si no cierra, deja hueco de cordonera.'); break;
      case 'sudadera': {
        const bd = mkBod({ mode: 'hip', opening: 'front', darts: false, straight: true, neck: 'redondo', neckDrop: 1, lowerArm: 1 }, true);
        P = bodicePieces(bd, S, { f: 'Sudadera delantero', b: 'Sudadera espalda' });
        P = P.concat(mkSleeve(bd, 'larga'));
        if (o.capucha !== 'no') P.push(hood(k, S, bd.neckHalf));
        const pw = bd.qB * 1.3, ph = k.WH * 0.9 + k.BL * 0.25;
        P.push(rect('Bolsillo canguro', 'Cortar 1 al doblez', pw / 2, ph, { left: 'fold', right: 'hem' }, { S }));
        break;
      }
      case 'pantalon': P = mkPants({ len: o.largoP || 'largo', leg: o.pierna, waist: o.cintura, opening: o.cintura !== 'elastico' }); break;
      case 'short': P = mkPants({ len: o.largoP || 'corto', leg: 'recto', waist: o.cintura, opening: o.cintura !== 'elastico' }); break;
      case 'vaquero': P = mkPants({ len: o.largoP || 'largo', leg: o.pierna, waist: 'pretina', jeans: true, opening: true }); break;
      case 'cargo': {
        P = mkPants({ len: o.largoP || 'largo', leg: o.pierna || 'recto', waist: 'elastico' });
        const pw = Hpp / 4 * 0.45;
        P[0].marks.push({ t: 'text', at: [Hpp / 4 * 0.5, k.R + (k.Out - k.R) * 0.3], s: '◻ bolsillo cargo aquí', size: 1.5 });
        P.push(rect('Bolsillo cargo', 'Cortar 2', pw * 1.4, pw * 1.3, { top: 'hem' }, { S, p: { notes: ['Haz una tabla central de ' + r1(pw * 0.2 / 10) + ' cm para el fuelle.'] } }));
        P.push(rect('Tapeta bolsillo', 'Cortar 4', pw, pw * 0.45, {}, { S }));
        break;
      }
      case 'jogger': {
        P = mkPants({ len: 'largo', leg: 'pitillo', waist: 'elastico' });
        P.push(rect('Puño tobillo (canalé)', 'Cortar 2', Math.max(k.An * 1.05, k.Ft * 1.15) + 2 * 0, 2 * bandH, {}, { S }));
        break;
      }
      case 'leggings': P = mkPants({ len: o.largoP || 'largo', leg: 'pitillo', waist: 'elastico' }); break;
      case 'enterizo': {
        const hasS = o.manga && o.manga !== 'sin';
        const bd = mkBod({ mode: 'waist', opening: 'back', darts: false, neck: o.cuello, sleeveless: !hasS, bottomKind: 'seam' }, hasS);
        P = bodicePieces(bd, S, { f: 'Cuerpo delantero', b: 'Cuerpo espalda' });
        P = P.concat(mkSleeve(bd, o.manga));
        P = P.concat(mkPants({ len: o.largoP || 'largo', leg: o.pierna, waist: 'unido', opening: true }));
        notes.push('El pantalón del mono va sin pretina: se cose directamente a la cintura del cuerpo.');
        break;
      }
      case 'peto': case 'pichi': {
        if (gKey === 'peto') P = mkPants({ len: o.largoP || 'largo', leg: o.pierna || 'recto', waist: 'pretina', opening: true });
        else P = sk({ type: 'A', L: Lsk() });
        const bw = par('anchoPeto', 'Ancho del peto', (k.B * (1 + k.e) + k.bulk) / 4 * 1.25), bh = par('altoPeto', 'Alto del peto', k.BL * 0.55);
        P.push(rect('Peto delantero', 'Cortar 2 (tela + forro)', bw, bh, { top: 'seam', bottom: 'seam' }, { S }));
        P.push(rect('Tirantes', 'Cortar 2', k.BL * 1.9, 2 * bandH, {}, { S }));
        break;
      }
      case 'chaleco': {
        const bd = mkBod({ mode: 'waist', opening: 'front', darts: false, neck: o.cuello, sleeveless: true, lowerArm: 2, wideNeck: 0.5, pointFront: true, bottomKind: 'hem' }, false);
        P = bodicePieces(bd, S, { f: 'Chaleco delantero', b: 'Chaleco espalda' });
        P.forEach(p => p.cut = p.cut.replace('Cortar', 'Tela y forro:'));
        break;
      }
      case 'bomber': {
        const bd = mkBod({ mode: 'hip', opening: 'front', darts: false, straight: true, neck: 'redondo', length: k.BL + k.WH * 0.5 }, true, 'Largo hasta la cinta (hombro → bajo)');
        P = bodicePieces(bd, S, { f: 'Bomber delantero', b: 'Bomber espalda' });
        P = P.concat(mkSleeve(bd, 'larga'));
        P.push(band('Cinta de cintura (canalé)', Hpp * 0.95 + S.ext, bandH * 1.2));
        P.push(band('Puños (canalé)', Math.max(k.Hand * 1.08, k.UA) + 2, bandH, 'Cortar 2'));
        P.push(band('Cuello (canalé)', bd.neckHalf * 2 * 0.92 + S.ext, bandH));
        notes.push('Las cintas de canalé se estiran un 8–10% al coserlas para que ajusten.');
        break;
      }
      case 'vaquera': {
        const bd = mkBod({ mode: 'hip', opening: 'front', darts: false, straight: true, neck: 'redondo', length: k.BL + k.WH * 0.35 }, true);
        P = bodicePieces(bd, S, { f: 'Chaqueta delantero', b: 'Chaqueta espalda' });
        P[0].marks.push({ t: 'line', pts: [[0, bd.yUA * 0.6], [bd.qB, bd.yUA * 0.6]], dash: true, label: 'canesú (pespunte)' });
        P[1].marks.push({ t: 'line', pts: [[0, bd.yUA * 0.45], [bd.qB, bd.yUA * 0.55]], dash: true, label: 'canesú' });
        const ch = Math.max(5, k.H * 0.022), Lc = bd.neckHalf;
        P.push(piece('Cuello', 'Cortar 2 al doblez', [E([[0, 0], [0, ch]], 'fold', 0), E([[0, ch], [Lc, ch]], 'seam', S.sa), E([[Lc, ch], [Lc + 2.5, -1]], 'seam', S.sa), E([[Lc + 2.5, -1], [0, 0]], 'seam', S.sa)]));
        P = P.concat(mkSleeve(bd, 'larga'));
        P.push(band('Cinta de cintura', Math.max(bd.qB, bd.qH) * 4 + S.ext, bandH));
        P.push(rect('Tapeta bolsillo pecho', 'Cortar 4', bd.qB * 0.4, bd.qB * 0.18, {}, { S }));
        break;
      }
      case 'blazer': case 'abrigo': {
        const ab = gKey === 'abrigo';
        const yb0 = bodice(k, S, { mode: 'hip' });
        const yb = yb0.yUA + 0.45 * (yb0.wF - yb0.yUA);
        const bd = mkBod({ mode: ab ? 'dress' : 'hip', opening: 'front', darts: !ab, straight: ab, neck: 'pico', vDepth: yb, length: ab ? k.BL + LARGO[o.largo || 'rodilla'] * k.Out : k.BL + k.WH * 1.1, flare: ab ? 0.05 * k.Out : 0 }, true, ab ? 'Largo del abrigo (hombro → bajo)' : 'Largo de la chaqueta (hombro → bajo)');
        P = bodicePieces(bd, S, { f: ab ? 'Abrigo delantero' : 'Blazer delantero', b: ab ? 'Abrigo espalda' : 'Blazer espalda' });
        const F = P[0], neck = F.edges[F.edges.length - 1], HPS = neck.pts[0], B = neck.pts[neck.pts.length - 1];
        const lw = par('solapa', 'Ancho de solapa', bd.qB * 0.24);
        const notch = [HPS[0] * 0.45, B[1] * 0.12], tip = [-S.ext - lw, B[1] * 0.42];
        F.edges[F.edges.length - 1] = E([HPS, notch, tip, B], 'seam', S.sa);
        F.marks.push({ t: 'line', pts: [[HPS[0] * 0.8, 0.5], B], dash: true, label: 'doblar solapa' });
        P = P.concat(mkSleeve(bd, 'larga'));
        P.push(rect('Cuello (bajo cuello)', 'Cortar 2 (tela + entretela)', bd.neckB * 2 + 2 * Math.hypot(notch[0] - HPS[0], notch[1] - HPS[1]), Math.max(6, k.H * 0.024), {}, { S }));
        break;
      }
      case 'kimono': {
        const qB = (k.B * (1 + k.e) + k.bulk) / 4;
        const L = par('largoCuerpo', 'Largo (hombro → bajo)', k.BL + k.WH * 1.6);
        const sh = par('anchoManga', 'Alto de la manga (doblada)', (k.BL * 0.5 + 6));
        P.push(rect('Kimono espalda', 'Cortar 1 al doblez', qB * 1.2, L, { left: 'fold', bottom: 'hem' }, { S }));
        P.push(rect('Kimono delantero', 'Cortar 2 (en espejo)', qB * 1.2 + qB * 0.35, L, { left: 'hem', bottom: 'hem' }, { S }));
        P.push(rect('Manga kimono', 'Cortar 2 al doblez (doblez arriba)', par('largoManga', 'Largo de manga', k.Arm * 0.55), sh, { top: 'fold', right: 'hem' }, { S }));
        P.push(band('Tira de cuello y delanteros', L * 2 + k.N * 0.6, bandH));
        P.push(band('Cinturón (obi)', Wp * 1.6, bandH * 1.5));
        notes.push('Patrón de rectángulos, como el kimono tradicional: el escote se forma con la tira.');
        break;
      }
      case 'capa': {
        const Nc = Math.max(k.N * 1.6, k.N + 10), r = Nc / Math.PI, L = par('largoCuerpo', 'Largo de la capa (cuello → bajo)', k.BL + k.WH + k.R * 0.6), R = r + L;
        const pc = piece('Capa', 'Cortar 1 al doblez (centro espalda)', [
          E([[r, 0], [R, 0]], 'fold', 0), E(arc(0, 0, R, 0, Math.PI / 2), 'hem', S.hem), E([[0, R], [0, r]], 'hem', S.hem), E(arc(0, 0, r, Math.PI / 2, 0), 'seam', S.sa)
        ], { labelAt: [(r + R) / 2 * 0.7, (r + R) / 2 * 0.7], grain: [[(r + R) * 0.35, (r + R) * 0.2], [(r + R) * 0.35, (r + R) * 0.55]] });
        P.push(pc);
        if (o.capucha !== 'no') P.push(hood(k, S, Nc / 2));
        P.push(rect('Lazos del cuello', 'Cortar 2', k.N * 1.2, 6, {}, { S }));
        break;
      }
      case 'bragas': P = panties(k, S); break;
      case 'bikini': {
        const bd = bodice(k, S, { mode: 'crop' });
        const cb = par('anchoCopa', 'Ancho de cada triángulo', bd.qB * 0.95), ch = par('altoCopa', 'Alto de cada triángulo', bd.yUA * 0.62);
        P.push(piece('Triángulo', 'Cortar 2 tela + 2 forro', [E([[0, ch], [cb, ch]], 'seam', S.sa), E([[cb, ch], [cb * 0.4, 0]], 'seam', S.sa), E([[cb * 0.4, 0], [0, ch]], 'seam', S.sa)]));
        P.push(rect('Cinta inferior', 'Cortar 1', k.B * 1.5, 6, {}, { S }));
        P.push(rect('Tirantes al cuello', 'Cortar 2', k.N * 0.9 + 15, 6, {}, { S }));
        P = P.concat(panties(k, S));
        break;
      }
      case 'medias_cortas': P = stockings(k, S, false); break;
      case 'medias_largas': P = stockings(k, S, true); break;
      case 'pijama': {
        const bd = mkBod({ mode: 'hip', opening: 'front', darts: false, neck: 'redondo' }, o.manga !== 'sin');
        P = bodicePieces(bd, S, { f: 'Pijama camisa delantero', b: 'Pijama camisa espalda' });
        P = P.concat(mkSleeve(bd, o.manga));
        P.push(rect('Bies de escote', 'Cortar 1 al bies', bd.neckHalf * 2 + S.ext * 2, 10, {}, { S }));
        P = P.concat(mkPants({ len: o.largoP || 'largo', leg: 'recto', waist: 'elastico' }));
        break;
      }
      case 'delantal': {
        const L = Lsk();
        P.push(rect('Falda del delantal', 'Cortar 1 al doblez', Wp * 0.7, L, { left: 'fold', right: 'hem', bottom: 'hem' }, { S }));
        P.push(rect('Peto', 'Cortar 1 al doblez', (k.B * 0.3), k.BL * 0.6, { left: 'fold', right: 'hem', top: 'hem' }, { S }));
        P.push(band('Cinta y lazos', Wp * 2.4, bandH));
        P.push(rect('Tira al cuello', 'Cortar 1', k.N * 1.3 + k.BL, 8, {}, { S }));
        P.push(rect('Bolsillo', 'Cortar 1', Wp * 0.18, Wp * 0.15, { top: 'hem' }, { S }));
        break;
      }
    }
    if (Array.isArray(S.custom)) S.custom.forEach(c => { try { const pc = customPiece(c, S); if (pc) P.push(pc); } catch (e) { } });
    if (gKey === 'libre' && !P.length) notes.push('Diseño libre: añade piezas en "Piezas a medida" para generar el patrón.');
    P.forEach(finalize);
    const warn = [];
    const fb = { plano: ['bragas', 'body', 'banador', 'bikini', 'medias_cortas', 'medias_largas', 'leggings', 'jogger'], punto: ['vestido', 'victoriano', 'camisa', 'chaleco', 'vaquero', 'corse', 'blazer', 'abrigo', 'vaquera'] };
    if (S.fabric === 'plano' && fb.plano.includes(gKey)) warn.push('Esta prenda necesita punto elástico para poder ponerse.');
    if (S.fabric === 'punto' && fb.punto.includes(gKey)) warn.push('Esta prenda está pensada para tejido plano; en punto quedará más ceñida.');
    return { pieces: P, steps: STEPS[gKey] || [], notes, warn, k: k0, params: used, needs: MKEYS.filter(x => needs.has(x)) };
  }

  root.ENGINE = { build, customPiece, G, CATS, STYLES, EASE, LARGO, finalize, rotate90, plen };
})(typeof window !== 'undefined' ? window : globalThis);
