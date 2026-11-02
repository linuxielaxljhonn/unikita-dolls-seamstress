/* ============================================================
   BASE DE DATOS DE MUÑECAS — medidas en cm
   conf: 'medido'  = medidas principales publicadas por una fuente
         'escalado'= derivado de un molde medido con un factor publicado
         'estimado'= proporciones estimadas: MEDIR LA MUÑECA ANTES DE CORTAR
   Los campos dados en "g" son los que vienen de la fuente; el resto se
   calcula con la plantilla proporcional de su familia (FAM).
   ============================================================ */
(function (root) {
  const FAM = {
    barbie: { H: 29, B: 12.7, W: 9.1, Hp: 13.2, N: 6.0, Sh: 5.6, BL: 6.0, WH: 3.0, R: 4.2, Ins: 14.5, Out: 18.0, Th: 7.5, An: 2.8, Arm: 9.5, UA: 4.2, Hand: 4.4, Hd: 12.5, HdH: 4.6, Ft: 2.6 },
    ken:    { H: 30.5, B: 15.9, W: 11.4, Hp: 15.2, N: 7.0, Sh: 6.8, BL: 6.6, WH: 3.0, R: 4.6, Ins: 15.0, Out: 19.0, Th: 8.2, An: 3.2, Arm: 10, UA: 5.0, Hand: 5.0, Hd: 13.5, HdH: 5.0, Ft: 3.0 },
    mh:     { H: 26.5, B: 7.5, W: 5.7, Hp: 10.9, N: 3.2, Sh: 4.2, BL: 4.0, WH: 2.2, R: 3.2, Ins: 11.6, Out: 15.4, Th: 5.5, An: 2.0, Arm: 6.4, UA: 3.0, Hand: 3.7, Hd: 17, HdH: 7.0, Ft: 2.6 },
    bratz:  { H: 25, B: 8.9, W: 6.4, Hp: 10.0, N: 4.0, Sh: 4.6, BL: 4.4, WH: 2.4, R: 3.6, Ins: 9.5, Out: 13.0, Th: 6.6, An: 3.0, Arm: 6.5, UA: 3.4, Hand: 3.8, Hd: 19, HdH: 8.0, Ft: 3.0 }
  };

  const FIELDS = [
    ['H', 'Altura total', 'De coronilla a planta (sin pelo)'],
    ['B', 'Contorno pecho', 'Por la parte más saliente, bajo los brazos'],
    ['W', 'Contorno cintura', 'Cintura real: pon una goma y deja que baje sola'],
    ['Hp', 'Contorno cadera', 'Por la parte más ancha del glúteo'],
    ['N', 'Contorno cuello', 'En la base del cuello'],
    ['Sh', 'Ancho hombros', 'De hombro a hombro por la espalda'],
    ['BL', 'Talle espalda', 'De la nuca (vértebra) a la cintura'],
    ['WH', 'Cintura–cadera', 'Distancia vertical de cintura a cadera'],
    ['R', 'Tiro', 'De cintura a entrepierna por el lateral'],
    ['Ins', 'Entrepierna', 'De entrepierna al tobillo'],
    ['Out', 'Largo lateral', 'De cintura al tobillo por fuera'],
    ['Th', 'Contorno muslo', 'Lo más alto del muslo'],
    ['An', 'Contorno tobillo', 'Sobre el hueso del tobillo'],
    ['Arm', 'Largo brazo', 'De hombro a muñeca'],
    ['UA', 'Contorno brazo', 'Parte superior del brazo'],
    ['Hand', 'Paso de mano', 'Contorno de la mano abierta (dedos rígidos)'],
    ['Hd', 'Contorno cabeza', 'Por encima de las cejas, CON pelo'],
    ['HdH', 'Alto cabeza', 'De barbilla a coronilla'],
    ['Ft', 'Largo pie', 'Talón a punta (en su postura natural)']
  ];

  function est(fam, g, s) {
    s = s || 1; g = g || {};
    const f = FAM[fam], m = {};
    m.H = g.H ?? f.H * s; const hr = m.H / f.H;
    m.B = g.B ?? f.B * hr; const br = m.B / f.B;
    m.W = g.W ?? f.W * br; m.Hp = g.Hp ?? f.Hp * br; const hp = m.Hp / f.Hp;
    ['N', 'UA', 'Hand', 'Sh'].forEach(k => m[k] = g[k] ?? f[k] * br);
    m.Th = g.Th ?? f.Th * hp; m.An = g.An ?? f.An * hr;
    ['BL', 'WH', 'R', 'Ins', 'Out', 'Arm', 'Ft', 'HdH', 'Hd'].forEach(k => m[k] = g[k] ?? f[k] * hr);
    for (const k in m) m[k] = Math.round(m[k] * 10) / 10;
    return m;
  }

  const MH = FAM.mh;
  const D = [
    // ---------------- BARBIE ----------------
    { marca: 'Barbie', linea: 'Barbie', cuerpo: 'Vintage (molde original)', desde: 1959, hasta: 1966, estilo: 'Clásico', fam: 'barbie', conf: 'medido', g: { H: 29, B: 14.0, W: 7.9, Hp: 12.7, N: 6.35 }, ref: 'Patrón Simplicity 5257 (fashion teen 11½")' },
    { marca: 'Barbie', linea: 'Barbie', cuerpo: "Twist 'n Turn (TNT)", desde: 1967, hasta: 1976, estilo: 'Clásico', fam: 'barbie', conf: 'estimado', g: { H: 29, B: 14.0, W: 8.1, Hp: 12.9 }, ref: 'Estimado a partir del molde vintage' },
    { marca: 'Barbie', linea: 'Barbie', cuerpo: 'Superstar / clásico', desde: 1977, hasta: 1999, estilo: 'Clásico', fam: 'barbie', conf: 'medido', g: { H: 29, B: 14.4, W: 8.5, Hp: 13.1 }, ref: 'daytondolls.wordpress.com ("Original")' },
    { marca: 'Barbie', linea: 'Barbie', cuerpo: 'Shani (cuerpo)', desde: 1991, hasta: 2000, estilo: 'Clásico', fam: 'barbie', conf: 'medido', g: { H: 29, B: 13.5, W: 8.1, Hp: 12.7 }, ref: 'daytondolls.wordpress.com' },
    { marca: 'Barbie', linea: 'Barbie Collector', cuerpo: 'Model Muse', desde: 2000, hasta: null, estilo: 'Coleccionista', fam: 'barbie', conf: 'medido', g: { H: 29, B: 12.3, W: 8.1, Hp: 11.9 }, ref: 'daytondolls.wordpress.com' },
    { marca: 'Barbie', linea: 'Barbie', cuerpo: 'Ombligo / Fashionista 2009 / Basics', desde: 2000, hasta: 2015, estilo: 'Clásico', fam: 'barbie', conf: 'medido', g: { H: 29, B: 12.7, W: 8.6, Hp: 13.5 }, ref: 'daytondolls.wordpress.com ("BB/Fashionista/LITD")' },
    { marca: 'Barbie', linea: 'Fashionistas', cuerpo: 'Original (Regular)', desde: 2016, hasta: null, estilo: 'Regular', fam: 'barbie', conf: 'medido', g: { H: 29, B: 12.7, W: 9.1, Hp: 13.2 }, ref: 'dinerija.com (guía de tallas); Pixie Faire: 12,7/8,9/13' },
    { marca: 'Barbie', linea: 'Fashionistas', cuerpo: 'Curvy', desde: 2016, hasta: null, estilo: 'Curvy', fam: 'barbie', conf: 'medido', g: { H: 28.5, B: 13.3, W: 10.4, Hp: 15.3 }, ref: 'dinerija.com; Pixie Faire: 13/10,5/15,5' },
    { marca: 'Barbie', linea: 'Fashionistas', cuerpo: 'Petite', desde: 2016, hasta: null, estilo: 'Petite', fam: 'barbie', conf: 'medido', g: { H: 27, B: 11.5, W: 8.8, Hp: 12.0 }, ref: 'dinerija.com' },
    { marca: 'Barbie', linea: 'Fashionistas', cuerpo: 'Tall', desde: 2016, hasta: null, estilo: 'Tall', fam: 'barbie', conf: 'medido', g: { H: 31, B: 12.7, W: 10.0, Hp: 13.0, Ins: 15.0, Th: 7.6, UA: 4.4 }, ref: 'dinerija.com; chellywood.com (Tall)' },
    { marca: 'Barbie', linea: 'Made to Move', cuerpo: 'Made to Move (articulada)', desde: 2015, hasta: null, estilo: 'Regular articulada', fam: 'barbie', conf: 'medido', g: { H: 29, B: 12.7, W: 9.1, Hp: 13.2 }, ref: 'dinerija.com (misma talla que Regular)' },
    { marca: 'Barbie', linea: 'Made to Move', cuerpo: 'Made to Move Curvy', desde: 2017, hasta: null, estilo: 'Curvy articulada', fam: 'barbie', conf: 'medido', g: { H: 28.5, B: 13.3, W: 10.4, Hp: 15.3 }, ref: 'dinerija.com (misma talla que Curvy)' },
    { marca: 'Barbie', linea: 'Barbie 17" (43 cm)', cuerpo: 'Endless Hair / 17"', desde: 2018, hasta: null, estilo: 'Grande 1:4', fam: 'barbie', conf: 'medido', g: { H: 43, B: 16.5, W: 12.6, Ins: 21.5, Th: 9.5, UA: 5.7 }, ref: 'chellywood.com' },
    { marca: 'Barbie', linea: 'Ken', cuerpo: 'Ken vintage', desde: 1961, hasta: 1976, estilo: 'Masculino', fam: 'ken', conf: 'medido', g: { H: 30.5, B: 15.9, W: 11.4, Hp: 15.2, N: 7.0 }, ref: 'Patrón Simplicity 6208 (medidas Ken)' },
    { marca: 'Barbie', linea: 'Ken Fashionistas', cuerpo: 'Ken Original', desde: 2017, hasta: null, estilo: 'Masculino', fam: 'ken', conf: 'medido', g: { H: 30.5, B: 15.0 }, ref: 'dollscroll.com (pecho)' },
    { marca: 'Barbie', linea: 'Ken Fashionistas', cuerpo: 'Ken Broad', desde: 2017, hasta: null, estilo: 'Masculino ancho', fam: 'ken', conf: 'medido', g: { H: 30.5, B: 17.1, W: 15.2, UA: 6.4 }, ref: 'Faun Party (Ravelry)' },
    { marca: 'Barbie', linea: 'Ken Fashionistas', cuerpo: 'Ken Slim', desde: 2017, hasta: null, estilo: 'Masculino delgado', fam: 'ken', conf: 'estimado', g: { H: 30.5, B: 14.2, W: 10.8, Hp: 13.8 }, ref: 'Estimado' },
    { marca: 'Barbie', linea: 'Skipper', cuerpo: 'Skipper vintage', desde: 1964, hasta: 1975, estilo: 'Junior', fam: 'barbie', conf: 'medido', g: { H: 23.5, B: 10.5, W: 7.6, Hp: 10.2, N: 3.8 }, ref: 'Patrón Simplicity 6208 (cintura, cadera, cuello); pecho estimado', noSrc: ['B'] },

    // ---------------- MONSTER HIGH ----------------
    { marca: 'Monster High', linea: 'G1', cuerpo: 'Estándar (Basic)', desde: 2010, hasta: 2016, estilo: 'Estándar', fam: 'mh', conf: 'medido', g: { H: 26.5, B: 7.5, W: 5.7, Hp: 10.9, N: 3.2, BL: 4.0, Ins: 11.6, Out: 15.4, Arm: 6.4, Hand: 3.7, Th: 5.5 }, ref: 'chellywood.com (Gilda Goldstag); Slate: pecho 7 / cintura 5,1' },
    { marca: 'Monster High', linea: 'G1', cuerpo: 'Adulto / alto (115%)', desde: 2011, hasta: 2016, estilo: 'Alto', fam: 'mh', conf: 'escalado', s: 1.15, ref: 'Monster High Wiki: patrones de adulto al 115%' },
    { marca: 'Monster High', linea: 'G1', cuerpo: 'Hermana pequeña (90%)', desde: 2012, hasta: 2016, estilo: 'Pequeño', fam: 'mh', conf: 'escalado', s: 0.9, ref: 'Monster High Wiki: hermanas pequeñas al 90%' },
    { marca: 'Monster High', linea: 'G1 17" (43 cm)', cuerpo: 'Frightfully Tall 17"', desde: 2013, hasta: 2016, estilo: 'Grande 1:4', fam: 'mh', conf: 'escalado', s: 1.5, ref: 'raddollclothes.com: línea 17" = 150%' },
    { marca: 'Monster High', linea: 'G1 28" (71 cm)', cuerpo: 'Línea 28"', desde: 2014, hasta: 2016, estilo: 'Gigante', fam: 'mh', conf: 'escalado', s: 2.5, ref: 'raddollclothes.com: línea 28" = 250%' },
    { marca: 'Monster High', linea: 'G2', cuerpo: 'Reboot G2', desde: 2016, hasta: 2018, estilo: 'Estándar', fam: 'mh', conf: 'estimado', g: { H: 26.5, B: 8.0, W: 6.2, Hp: 11.0 }, ref: 'Estimado: medir' },
    { marca: 'Monster High', linea: 'G3', cuerpo: 'G3 estándar', desde: 2022, hasta: null, estilo: 'Estándar', fam: 'mh', conf: 'estimado', g: { H: 27.5, B: 8.6, W: 6.6, Hp: 11.6 }, ref: 'Estimado: los cuerpos G3 son más gruesos que G1; medir' },
    { marca: 'Monster High', linea: 'G3', cuerpo: 'G3 Draculaura (pera)', desde: 2022, hasta: null, estilo: 'Pera', fam: 'mh', conf: 'estimado', g: { H: 26.0, B: 8.4, W: 7.0, Hp: 12.6 }, ref: 'Estimado: cuerpo pera (Monster High Wiki); medir' },
    { marca: 'Monster High', linea: 'G3', cuerpo: 'G3 Cleo (alta)', desde: 2022, hasta: null, estilo: 'Alto', fam: 'mh', conf: 'estimado', g: { H: 28.5, B: 8.6, W: 6.4, Hp: 11.4 }, ref: 'Estimado: medir' },
    { marca: 'Monster High', linea: 'G3', cuerpo: 'G3 Abbey (grande)', desde: 2023, hasta: null, estilo: 'Grande', fam: 'mh', conf: 'estimado', g: { H: 28.0, B: 10.0, W: 8.0, Hp: 12.8 }, ref: 'Estimado: medir' },

    // ---------------- BRATZ ----------------
    { marca: 'Bratz', linea: 'Bratz', cuerpo: 'Original 2001 (y réplicas 2021)', desde: 2001, hasta: 2009, estilo: 'Original', fam: 'bratz', conf: 'medido', g: { H: 25, B: 8.9, W: 6.4 }, ref: 'Slate (medidas de aficionados): pecho 3,5" cintura 2,5"' },
    { marca: 'Bratz', linea: 'Bratz', cuerpo: 'Relanzamiento 2010', desde: 2010, hasta: 2012, estilo: 'Original', fam: 'bratz', conf: 'estimado', g: { H: 25, B: 8.9, W: 6.4 }, ref: 'Estimado: medir' },
    { marca: 'Bratz', linea: 'Bratz', cuerpo: 'Cuerpo alto 2013', desde: 2013, hasta: 2014, estilo: 'Alto', fam: 'bratz', conf: 'estimado', g: { H: 27, B: 9.0, W: 6.4 }, ref: 'Wikipedia/MGA: en 2013 cuerpo más alto; medidas estimadas' },
    { marca: 'Bratz', linea: 'Bratz', cuerpo: 'Reboot 2015', desde: 2015, hasta: 2017, estilo: 'Reboot', fam: 'bratz', conf: 'estimado', g: { H: 25, B: 8.6, W: 6.2 }, ref: 'Wikipedia: 25 cm con cuerpo nuevo; resto estimado' },
    { marca: 'Bratz', linea: 'Bratz Collector', cuerpo: 'Collector 2018 (Hayden Williams)', desde: 2018, hasta: null, estilo: 'Coleccionista', fam: 'bratz', conf: 'estimado', g: { H: 25, B: 8.9, W: 6.4 }, ref: 'Estimado (estilo similar a 2001)' },
    { marca: 'Bratz', linea: 'Bratz', cuerpo: 'Réplicas 20º aniversario', desde: 2021, hasta: null, estilo: 'Original', fam: 'bratz', conf: 'estimado', g: { H: 25, B: 8.9, W: 6.4 }, ref: 'Réplicas del molde 2001' },
    { marca: 'Bratz', linea: 'Bratz Boyz', cuerpo: 'Boyz (cuerpo antiguo)', desde: 2002, hasta: 2009, estilo: 'Masculino', fam: 'bratz', conf: 'estimado', g: { H: 26, B: 9.6, W: 7.2, Hp: 9.6 }, ref: 'Estimado: medir' },

    // ---------------- DEFA LUCY ----------------
    { marca: 'Defa Lucy', linea: 'Defa Lucy', cuerpo: 'Clásica 29 cm', desde: 2010, hasta: null, estilo: 'Regular', fam: 'barbie', conf: 'estimado', g: { H: 29, B: 12.5, W: 8.8, Hp: 12.8 }, ref: 'Altura 29 cm (tiendas); proporciones tipo Barbie estimadas' },
    { marca: 'Defa Lucy', linea: 'Defa Lucy', cuerpo: 'Pequeña 27 cm', desde: 2010, hasta: null, estilo: 'Petite', fam: 'barbie', conf: 'estimado', g: { H: 27 }, ref: 'Altura 27 cm (tiendas); resto estimado' },
    { marca: 'Defa Lucy', linea: 'Defa Lucy', cuerpo: 'Alta 32 cm', desde: 2015, hasta: null, estilo: 'Tall', fam: 'barbie', conf: 'estimado', g: { H: 32 }, ref: 'Altura 32 cm (tiendas); resto estimado' },
    { marca: 'Defa Lucy', linea: 'Defa Lucy Studio / Collector', cuerpo: 'Collector 30 cm', desde: 2025, hasta: null, estilo: 'Coleccionista', fam: 'barbie', conf: 'estimado', g: { H: 30.5 }, ref: 'Anuncios 12" (2025); resto estimado' },

    // ---------------- REFERENCIA ----------------
    { marca: 'Otras', linea: 'Blythe (referencia)', cuerpo: 'Blythe Neo', desde: 2001, hasta: null, estilo: 'Cabezona', fam: 'bratz', conf: 'medido', g: { H: 28.5, B: 10.5, W: 7.5, Hp: 10.5, Hd: 27.5, HdH: 10 }, ref: 'diycraftclub.com' }
  ];

  D.forEach((d, i) => {
    d.id = 'd' + i;
    d.m = est(d.fam, d.g, d.s);
    d.src = Object.keys(d.g || {}).filter(k => !(d.noSrc || []).includes(k));
    if (d.conf === 'estimado') d.src = d.src.filter(k => k === 'H');
    if (d.conf === 'escalado') d.src = Object.keys(d.m);
  });

  root.DOLLDB = { FAM, FIELDS, DOLLS: D, est };
})(typeof window !== 'undefined' ? window : globalThis);
