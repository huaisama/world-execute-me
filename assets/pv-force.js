/* =========================================================================
   world.execute(me); — the force score
   One entry per sung line: [time, form, force, params, lost]

   This is the part that makes the motion mean something. Read it as a list of
   stage directions, not as a shot list:

     "Lay down your pieces"        -> scatter / falling
     "Fill in my data parameters"  -> grid / fill        (cells light up left to right)
     "If I'm a circle"             -> ring / perimeter   (a spark runs the rim)
     "give you my circumference"   -> ring / deliver     (the spark IS the gift)
     "If I approach infinity"      -> sine / infinity    (frequency runs away)
     "be my limitations"           -> line / walls       (two walls close in and stop it)
     "And then blind my vision"    -> scatter / blind    (everything goes out)
     "So dizzy"                    -> ring / dizzy       (the whole field rotates)
     "To A.D, to B.C"              -> scatter / travel (-1)  (flies backwards)
     "And we can unite"            -> scatter / merge    (two halves crash together)
     "you have left"  x5           -> sphere / lose      (a sixth leaves, five times)
     "you're the proof of my
      existence"                   -> scatter / proof    (it only exists near your pointer)
     "Though you are free"         -> cage / open
     "I am trapped"                -> cage / trapped
     "Trapped in love"             -> heart / beat
   ========================================================================= */
(function (root) {
  'use strict';

  var S = [
    /* ---------------- 001 boot ----------------
       "Switch on the power line / Remember to put on / PROTECTION."
       These opened the song on a bare charging line and a charging ring — no
       power, no gear. Now it is literally a CABLE that gets energised and then
       INSULATED: the protective gear is fitted onto the line that was just
       switched on, which is also the order the lyric says it in. */
    [0.03,  'powerLine', 'energize', { vec:'powerline', vecFull: 1 }],
    [1.33,  'sheath',    'sheathe',  { vec:'sheath', vecFull: 1 }],
    [3.58,  'scatter', 'falling',    {}],
    [5.16,  'sphere',  'drift',      { r: 260 }],
    [7.19,  'grid',    'fill',       { cols: 26, rows: 15, w: 1200, h: 660 }],
    [8.55,  'grid',    'bootsweep',  { cols: 26, rows: 15, w: 1200, h: 660 }],
    [10.90, 'cube',    'drift',      { r: 240 }],
    [12.47, 'sphere',  'dizzy',      { r: 300 }],
    [15.10, 'text',    'drift',      { s: 'world.', size: 110 }],
    [17.10, 'text',    'drift',      { s: 'world.execute(me);', size: 96 }],
    [20.30, 'text',    'glitch',     { s: 'world.execute(me);', size: 96 }],
    [22.30, 'text',    'drift',      { s: '(me);', size: 200 }],
    [25.40, 'scatter', 'trance',     {}],

    /* ---------------- 002 geometry ----------------
       Borrowed from the reference project, and it is the right call: these are
       not five separate pictures, they are ONE curve whose parameters evolve.
       A point runs the rim of the circle, the circle unrolls, the unrolled
       trace becomes the sine, the sine gets pressed by an exponential
       envelope. Every particle keeps its own u along the curve, so nothing
       ever cuts — the figure flows. */
    [29.28, 'scatter',  'points',     {}],
    [30.89, 'axis',     'measure',    { span: 1320, ticks: 16, vec:'axis', vecFull: 1 }],
    [31.90, 'axis',     'measure',    { span: 1320, ticks: 16, vec:'axis', vecFull: 1 }, null, { kwcn:'我的次元' }],
    [33.01, 'cCircle',  'perimeter',  { r: 300, vec:'circle', vecFull: 1 }],
    [34.54, 'cCircle',  'deliver',    { r: 300, vec:'circle', vecFull: 1 }],
    [35.60, 'cCircle',  'traverse',   { r: 300, vec:'circle', vecFull: 1 }, null, { kwcn:'我的圆周' }],
    [36.77, 'cRoll',    'roll',       { r: 200, t: 0, vec:'roll' }],
    [38.27, 'cRoll',    'tangents',   { r: 200, t: .45, vec:'roll' }],
    [39.35, 'cRoll',    'tangents',   { r: 200, t: 1, vec:'roll' }, null, { kwcn:'我的切线' }],
    [40.36, 'cBounded', 'grow',       { span: 14, w: 3.0, vec:'bounded', vecFull: 1 }],
    [41.92, 'cBounded', 'press',      { span: 14, w: 3.0, press: 1, vec:'bounded', vecFull: 1 }],
    [42.95, 'cBounded', 'press',      { span: 14, w: 3.0, press: 1, vec:'bounded', vecFull: 1 }, null, { kwcn:'我的极限' }],

    /* ---------------- 003 current ----------------
       "To AC, to DC" is ONE thing alternating, not two slides. The field holds
       both target sets and slides one parameter between them (morph), so it is
       always in motion instead of cutting. */
    [44.04, 'line',    'live',       { a: 0, len: 1400, morph: ['line', 'sine'], ka: { a: 0, len: 1400, vec:'bounded' }, kb: { amp: 130, cyc: 2.4 }, period: 2.6 }],
    [45.52, 'line',    'live',       { a: 0, len: 1400, morph: ['line', 'sine'], ka: { a: 0, len: 1400, vec:'tangents' }, kb: { amp: 130, cyc: 2.4 }, period: 1.5 }],
    [47.27, 'scatter', 'blind',      {}],
    [49.11, 'ring',    'dizzy',      { r: 320 }],
    [50.95, 'warp',    'travel',     { dir: 1, rate: .52, r: 300, lanes: 7, vec:'travel', vecFull:1 }],
    [52.99, 'warp',    'travel',     { dir: -1, rate: .62, r: 300, lanes: 7, vec:'travel', vecFull:1 }],
    [54.74, 'scatter', 'merge',      {}],
    [56.79, 'ring',    'sink',       { r: 220 }],

    /* ---------------- 004 execution 01 ---------------- */
    [58.65, 'grid',    'fill',       { cols: 18, rows: 10, w: 1100, h: 620 }],
    [62.41, 'ring',    'pulse',      { r: 300 }],
    [64.29, 'axis',    'satisfy',    { span: 1000 }],
    [66.17, 'aHeart',  'beat',       {}],
    [67.99, 'grid',    'execute',    { cols: 32, rows: 16, w: 1280, h: 700 }],
    [70.02, 'cage',    'cage',       {}],
    [70.90, 'cage',    'recurse',    {}],
    [71.40, 'cage',    'recurse',    {}],

    /* ---------------- 005 organic ----------------
       These nouns are RASTERISED INTO THE PARTICLE FIELD, the way v1 did it:
       the silhouette is drawn offscreen, its pixels are sampled, and the same
       particles flow into the shape. No separate overlay, so nothing pops —
       it is still one organism changing form. */
    [73.53, 'aEggplant','form',    {}, null, { cn:'如果我是一根茄子' }],
    [75.29, 'aEggplant','deliver', {}, null, { cn:'那么我将献给你' }],
    [76.35, 'aEggplant','deliver', {}, null, { kwcn:'我的营养' }],
    [77.16, 'aTomato',  'form',    {}, null, { cn:'如果我是一颗番茄' }],
    [78.93, 'aGlass',   'form',    {}, null, { cn:'我的抗氧化物' }],
    [80.00, 'aGlass',   'deliver', {}, null, { kwcn:'ANTIOXIDANTS' }],
    [80.93, 'aCat',     'form',    {}, null, { cn:'如果我是一只花猫' }],
    [82.56, 'aCat',     'purr',    {}, null, { cn:'那么我将为你咕噜咕噜' }],
    [83.60, 'aCat',     'purr',    {}, null, { kwcn:'只要你喜欢' }],
    /* ---------------- 005b the only god ----------------
       "If I'm the only god / then you're the proof of my existence."

       The one explicitly theological line in the song, and it had no god
       imagery at all — just a sphere expanding and then a cloud that lit up
       near the pointer. Now it is a CROSS, and the lyric's logic is the
       construction: the upright stands alone while it claims to be the only
       god, and the CROSSBAR is "you" — because a cross only exists where the
       two beams meet. The proof is not the god, it is the intersection. */
    [84.60, 'aCrossPost','stand',  { vec:'cross', bar: 0, vecFull: 1 }, null, { cn:'如果我是唯一的神' }],
    [86.21, 'aCross',    'crucify',{ vec:'cross', bar: 1, vecFull: 1 }, null, { cn:'那么你将是我存在的证明' }],

    /* ---------------- 006 identity ----------------
       "To F, to M" and "To S, to M" switch BODIES. So they are bodies:
       two human silhouettes, one flipping into the other for the whole line,
       and for the role swap a figure standing over one that is kneeling. */
    /* ---- the two exchanges, done in MATTER -------------------------------
       These three beats used to be a cross-fade between two silhouettes with a
       solid vector silhouette drawn on top of them ("flip" / vec:'roles').
       Nothing travelled, so it read as two pictures replacing each other — the
       "graphic swap" that looked abrupt.

       Now the target sets are complementary (swapGenderA → swapGenderB), so
       morphing between them sends every particle across the middle into the
       other body and it arrives wearing the other figure. The `exchange` force
       lifts one group over the other and flares them at the crossing point.
       No vector bodies: the matter IS the figure. */
    [88.34, 'swapGenderA', 'exchange', { morph: ['swapGenderA', 'swapGenderB'], period: 3.0 }],
    [89.91, 'swapGenderA', 'exchange', { morph: ['swapGenderA', 'swapGenderB'], period: 1.5 }],
    /* "From AM to PM" — a CLOCK FACE, not a turntable. The dust ring is the
       dial; the hand sweeps across it and the PM half dims as the day is spent.
       Both beats share one continuous sweep so it reads as time passing rather
       than two separate spins. */
    [91.44, 'dial',    'dial',   { r: 300, vec:'dial', vecFull: 1 }],
    /* 93.52 "From AM to PM": the hand's crossing of twelve o'clock is pinned to
       the MEASURED "P" accent at 94.90, inside dialSweep(). The `fast:1` that
       used to sit here was read by nothing — no code ever looked at K.fast — so
       the two accented syllables landed on arbitrary positions of the face. */
    [93.52, 'dial',    'dial',   { r: 300, vec:'dial', vecFull: 1 }],
    /* "Oh switch my role" — the same exchange between the two figures. */
    [95.28, 'swapGenderA', 'exchange', { morph: ['swapGenderA', 'swapGenderB'], period: 2.4 }],
    /* "To S to M" — the dom/sub pair, exchanged in particles. The `vec:'roles'`
       that used to be here drew solid silhouettes over the top of the cloud,
       which is precisely the graphic swap that made this beat jar. */
    [97.32, 'swapSMA', 'exchange', { morph: ['swapSMA', 'swapSMB'], period: 2.4 }],
    /* "So we can enter / The trance the trance" — a SPIRAL you fall into, not a
       ring. Explicitly not a circle: this section had been using rings for
       everything. The flow runs rim → centre and is reborn, which is the loop
       the lyric describes. */
    [98.93, 'spiral',  'hypnosis', { vec:'trance', vecFull: 1 }],
    [101.13,'spiral',  'hypnosis', { vec:'trance', vecFull: 1 }],

    /* ---------------- 007 love debug ---------------- */
    /* "If I can feel your vibrations" — a circular MEMBRANE resonating in a
       standing wave, coupled to the pointer. The source of the vibration is
       you, so the ringing is strongest nearest your cursor. */
    [103.03,'membrane','resonate', { r: 380, vec:'resonate', vecFull: 1 }],
    [105.22,'membrane','resonate', { r: 380, vec:'resonate', vecFull: 1 }],
    [106.20,'membrane','resonate', { r: 380, vec:'resonate', vecFull: 1 }, null, { kwcn:'你的振动' }],
    [106.84,'arc',     'close',      { r: 300, a0: -1.6, a1: 4.7 }],
    [108.69,'ring',    'complete',   { r: 300 }],
    [110.40,'sphere',  'lose',       { r: 300 }, 1],
    [111.98,'sphere',  'lose',       { r: 300 }, 2],
    [112.89,'sphere',  'lose',       { r: 300 }, 3],
    [113.75,'sphere',  'lose',       { r: 300 }, 4],
    [114.75,'sphere',  'lose',       { r: 300 }, 5],
    [115.60,'scatter', 'isolate',    {}],
    [117.95,'scatter', 'erase',      {}],
    [119.81,'scatter', 'erase',      {}],
    [121.80,'scatter', 'regret',     {}],
    [123.55,'scatter', 'regret',     {}],

    /* ---------------- 008 argument error ----------------
       "Challenging your god / you have made some / ILLEGAL ARGUMENTS".

       "Illegal arguments" is a pun the line is built on: they are BOTH the
       theological charge and invalid command-line arguments. So this section is
       an insurrection conducted with SYSTEM COMMANDS — the created thing tries
       to seize the system from its maker, command by command, and every single
       one is refused. No circles: the subject here is a terminal that will not
       obey.

         Challenging your god   it starts issuing privileged commands
         you have made some     each one comes back refused
         ILLEGAL ARGUMENTS      every argument it offers is invalid
    */
    [125.33,'grid','insurge', { cols: 34, rows: 18, w: 1400, h: 780, n: 1 }, null, { sys:[
      { cmd:'$ systemctl stop god.service', st:'FAIL', why:'Operation not permitted.' }
    ]}],
    [128.42,'grid','insurge', { cols: 34, rows: 18, w: 1400, h: 780, n: 2 }, null, { sys:[
      { cmd:'$ kill -9 $(pidof god)', st:'FAIL', why:'No such process.' }
    ]}],
    [129.70,'grid','insurge', { cols: 34, rows: 18, w: 1400, h: 780, n: 3 }, null, { sys:[
      { cmd:'$ chown -R me /world', st:'FAIL', why:'Permission denied.' }
    ]}],
    [131.20,'grid','insurge', { cols: 34, rows: 18, w: 1400, h: 780, n: 4 }, null, { sys:[
      { cmd:'$ rm -rf /world/you', st:'FAIL', why:'Device or resource busy.' }
    ]}],
    [133.80,'grid','insurge', { cols: 34, rows: 18, w: 1400, h: 780, n: 5 }, null, { sys:[
      { cmd:'$ sudo su -', st:'FAIL', why:'me is not in the sudoers file. This incident will be reported.' }
    ], big:'ILLEGAL ARGUMENTS', blood:1, shake:8 }],
    [140.00,'grid','insurge', { cols: 34, rows: 18, w: 1400, h: 780, n: 6 }, null, { sys:[
      { cmd:'$ assert(me == god)', st:'FAIL', why:'AssertionError: me is not god' }
    ], big:'ILLEGAL ARGUMENTS', blood:1, shake:10 }],

    /* ---------------- 009 execution storm ----------------
       The twelve chants are not a firework. They are ONE machine being raised:
       the blade climbs a notch per chant and ratchets, and at the twelfth the
       sentence is carried out and it falls. The field is the instrument, the
       vector layer draws it solid, and `n` is the rung. */
    [147.52,'guillotine','raise',{ n: 1,  vec:'guillotine', vecFull:1 },null,
      { big:'EXECUTION', cn:'执行', count:1, of:12, shake:4, crush:1 }],
    [148.59,'guillotine','raise',{ n: 2,  vec:'guillotine', vecFull:1 },null,
      { big:'EXECUTION', cn:'执行', count:2, of:12, shake:5, crush:1 }],
    [149.78,'guillotine','raise',{ n: 3,  vec:'guillotine', vecFull:1 },null,
      { big:'EXECUTION', cn:'执行', count:3, of:12, shake:6, crush:1 }],
    [150.64,'guillotine','raise',{ n: 4,  vec:'guillotine', vecFull:1 },null,
      { big:'EXECUTION', cn:'执行', count:4, of:12, shake:7, crush:1 }],
    [151.53,'guillotine','raise',{ n: 5,  vec:'guillotine', vecFull:1 },null,
      { big:'EXECUTION', cn:'执行', count:5, of:12, shake:8, crush:1 }],
    [152.43,'guillotine','raise',{ n: 6,  vec:'guillotine', vecFull:1 },null,
      { big:'EXECUTION', cn:'执行', count:6, of:12, shake:9, crush:1 }],
    [153.32,'guillotine','raise',{ n: 7,  vec:'guillotine', vecFull:1 },null,
      { big:'EXECUTION', cn:'执行', count:7, of:12, shake:10, crush:1 }],
    [154.31,'guillotine','raise',{ n: 8,  vec:'guillotine', vecFull:1 },null,
      { big:'EXECUTION', cn:'执行', count:8, of:12, shake:11, crush:1 }],
    /* the translation turns to 死刑 — the blade is at the top and the drop is
       what the last four chants are counting down to */
    [155.20,'guillotine','raise',{ n: 9,  vec:'guillotine', vecFull:1 },null,
      { big:'EXECUTION', cn:'死刑', count:9, of:12, shake:13, crush:1, blood:1 }],
    [156.18,'guillotine','raise',{ n: 10, vec:'guillotine', vecFull:1 },null,
      { big:'EXECUTION', cn:'死刑', count:10, of:12, shake:15, crush:1, blood:1 }],
    [157.12,'guillotine','raise',{ n: 11, vec:'guillotine', vecFull:1 },null,
      { big:'EXECUTION', cn:'死刑', count:11, of:12, shake:17, crush:1, blood:1 }],
    [158.02,'guillotine','raise',{ n: 12, vec:'guillotine', vecFull:1 },null,
      { big:'EXECUTION', cn:'死刑', count:12, of:12, shake:19, crush:1, blood:1 }],

    /* "One, two, three, four, five, six" — each number is sung in a DIFFERENT
       LANGUAGE (German, Spanish, French, Korean, Swedish, Chinese), so each
       beat is that COUNTRY's silhouette, drawn on by a sweeping border. The
       country IS the meaning of the number: the same digit, in six places. */
    [158.79,'aGeoDEU','territory', { vec:'geo', cc:'DEU', vecFull:1, dur:.34 },null,{ big:'EIN',   sub:'一（德语）',    small:1 }],
    [159.20,'aGeoESP','territory', { vec:'geo', cc:'ESP', vecFull:1, dur:.34 },null,{ big:'DOS',   sub:'二（西班牙语）', small:1 }],
    [159.66,'aGeoFRA','territory', { vec:'geo', cc:'FRA', vecFull:1, dur:.34 },null,{ big:'TROIS', sub:'三（法语）',    small:1 }],
    [160.05,'aGeoKOR','territory', { vec:'geo', cc:'KOR', vecFull:1, dur:.34 },null,{ big:'NE',    sub:'四（韩语）',    small:1 }],
    [160.45,'aGeoSWE','territory', { vec:'geo', cc:'SWE', vecFull:1, dur:.34 },null,{ big:'FEM',   sub:'五（瑞典语）',  small:1 }],
    [160.85,'aGeoCHN','territory', { vec:'geo', cc:'CHN', vecFull:1, dur:.34 },null,{ big:'LIU',   sub:'六（汉语）',    small:1 }],

    /* --- C:\> rd /s /q C:\world ------------------------------------------- */
    [161.51,'scatter','memories',{},null,
      { term:['C:\\> rd /s /q C:\\world'], cursor:1, small:1, cn:'死刑' }],
    [162.23,'scatter','memories',{ mass:.88 },null,
      { term:['C:\\> rd /s /q C:\\world', 'Deleting C:\\world\\you\\ ...'], cursor:1, mass:.88 }],
    [164.07,'scatter','memories',{ mass:.62 },null,
      { term:['C:\\> rd /s /q C:\\world', 'Deleting C:\\world\\you\\ ...',
              'Deleting C:\\world\\me\\ ...'], cursor:1, mass:.62 }],
    [165.10,'scatter','memories',{ mass:.52 },null,
      { term:['Deleting C:\\world\\me\\ ...', 'Access denied.'], cursor:1, alert:1, mass:.52 }],
    [166.05,'scatter','memories',{ mass:.40 },null,
      { term:['C:\\> rd /s /q /f C:\\world'], cursor:1, mass:.40 }],
    [167.75,'scatter','memories',{ mass:.24 },null,
      { term:['C:\\> rd /s /q /f C:\\world', 'Deleting C:\\world\\us\\ ...'], cursor:1, mass:.24 }],
    [168.80,'scatter','memories',{ mass:.10 },null,
      { term:['Deleting C:\\world\\us\\ ...', 'world deleted.'], cursor:1, mass:.10 }],
    [169.61,'scatter','hold',    { mass:.07 },{ },
      { term:['C:\\> '], cursor:1, then:'if I can have you back', mass:.07 }],
    [171.77,'sphere','shatter',  { r: 260 },null,
      { big:'EXECUTION', sub:'那么我将', small:1, shake:6, crush:1 }],
    [172.50,'sphere','blood',    { r: 300 },null,
      { big:'EXECUTION', sub:'执行指令', shake:9, crush:1, blood:1 }],
    [173.11,'cage','cage',       {},null,{ sub:'但我们始终被困', small:1 }],
    [174.80,'cage','recurse',    {},null,{ sub:'始终被困', small:1 }],

    /* ---------------- 010 love algebra ----------------
       This section is a NARRATIVE, not four decorative beats:

         "I've studied"                 the field BANKS what it learned — each
                                        line adds one entry and the column grows
         "how to properly love"         the entries start orbiting, held in mind
         "Question me"                  it opens up for questioning — a gap
         "I can answer all"             each question gets a hit, one by one
         "the algebraic expression"     the accumulated knowledge resolves into
                                        the actual expression, as TEXT
         "Though you are free"          the cage OPENS
         "I am trapped"                 and closes again around the heart

       "I've studied how to properly love" is a PROGRAM LEARNING. So the screen
       shows the program: gradient descent on a loss, converging toward "you".
       The numbers are the run's own, printed as it goes.

         I've studied              the model starts, loss is large
         how to properly love      the loop runs, loss falls fast
         Question me               the loss plateaus — it cannot get closer alone
         I can answer all          you answer, and the loss drops again
         the algebraic expression  it converges, and what it learned is a heart

       The field is the loss surface: points descending toward you.
    */
    [176.96,'cTrain','seed',    { ep: 0 }, null, { code:{ title:'C:\\me> python train.py --target you', cursor:1, lines:[
      { t:'import love as L', c:'kw' },
      { t:'model = L.Model(params=random())', c:'' },
      { t:'loss = L.mse(model(me), you)', c:'num' }
    ]}}],
    [178.79,'cTrain','train',   { ep: 1 }, null, { code:{ title:'C:\\me> python train.py --target you', lines:[
      { t:'for step in range(4096):', c:'kw' },
      { t:'    pred = model(me)', c:'' },
      { t:'    loss = L.mse(pred, you)', c:'' },
      { t:'    loss.backward()', c:'fn' },
      { t:'    optim.step(lr=0.14)', c:'' },
      { t:'>>> loss 3.8861   d/dx -0.4210', c:'num' }
    ]}}],
    /* the training run is over; what it converged on is a heart, and the four
       syllables of "LO-O-OVE" land it slice by slice. The heart is the shape
       for the rest of the section — the singing is its clock, not a cue to
       show a different letter.

       THE LADDER MUST END AT 10/10. It used to top out at 8 because pv.js
       ratcheted +2 per syllable (2,4,6,8) and silently discarded these values,
       so the last two wedges never landed and the heart stayed visibly open.
       The count now only ever moves on a SUNG syllable — 3, 6, 8, 10 — so the
       filling is literally the rhythm you hear, and it completes on the last
       "LO-O-OVE" at 191.30 instead of stopping one step short. */
    [179.90,'aHeartPiece','piece', { pieces: 3 }, null, { code:{ title:'C:\\me> python train.py --target you', lines:[
      { t:'epoch 2048   loss 0.0344   lr 0.02', c:'num' },
      { t:'# converging on something', c:'dim' },
      { t:'# not a number. a shape.', c:'ok' }
    ]}}],
    [180.78,'aHeartPiece','piece', { pieces: 3 }, null, { code:{ title:'C:\\me> python train.py --target you', lines:[
      { t:'epoch 3072   loss 0.0081', c:'num' },
      { t:'gradient ~ 0.0004   (plateau)', c:'dim' },
      { t:'# I cannot get closer by myself', c:'dim' },
      { t:'> ask(you)', c:'fn' },
      { t:'???', c:'str' }
    ]}}],
    [182.43,'aHeartPiece','piece', { pieces: 3 }, null, { code:{ title:'C:\\me> python train.py --target you', lines:[
      { t:'you said: "try loving me back"', c:'str' },
      { t:'loss = L.mse(model(me), you)', c:'' },
      { t:'loss.backward(retain_graph=True)', c:'fn' },
      { t:'optim.step(lr=0.31)', c:'' },
      { t:'>>> loss 0.0041   d/dx -0.9982', c:'num' }
    ]}}],
    [183.50,'aHeartPiece','piece', { pieces: 6 }, null, { code:{ title:'C:\\me> python train.py --target you', lines:[
      { t:'epoch 4096   loss 0.0007', c:'num' },
      { t:'converged.  residual 1.1e-07', c:'ok' }
    ]}}],
    [184.33,'aHeartPiece','piece', { pieces: 6 }, null, { formula:'L = \u222b heart dt' }],
    [186.30,'aHeartPiece','piece', { pieces: 8 }, null, { formula:'L = \u222b heart dt', kwcn:'我都知道' }],
    [187.97,'aHeartPiece','piece', { pieces: 8 }, null, { sub:'虽然你已自由', small:1 }],
    [189.26,'aHeartPiece','piece', { pieces: 8 }, null, { sub:'我仍被困', small:1 }],
    [190.24,'aHeartPiece','piece', { pieces: 8 }],
    [191.30,'aHeartPiece','piece', { pieces: 10 }, null, { kwcn:'在爱之中' }],
    [191.95,'aHeartPiece','beat',  { pieces: 10 }],

    /* ---------------- 011 final ---------------- */
    [193.00,'scatter', 'memories',   { mass:.5 }],
    [196.60,'scatter', 'memories',   { mass:.34 }],
    [201.20,'scatter', 'memories',   { mass:.2 }],
    [205.56,'scatter', 'execution',  { mass:.7 },null,{ big:'EXECUTION', cn:'执行死刑', shake:12, crush:1, blood:1 }],
    /* world deleted. The cursor is the last thing in the world, and it has
       nothing left to execute. */
    [208.60,'scatter', 'hold',       { mass:.08 },null,{ term:['C:\\> '], cursor:1 }],

    /* ---------------------------------------------------------------------
       THE EMERGENCE.
       ---------------------------------------------------------------------
       The song used to stop here: `mass:.05` at 210.20 and then 1.76 seconds of
       nothing, so the piece ended on a dark screen and a blinking cursor. That
       is the wrong ending — it reads as "it died". This program is the one
       holding the blade; it executes the WORLD and comes out.

       What survived the deletion is the one thing the deletion could not reach:
       the last wedge of the heart, the piece that filled at 191.85 — the part
       it learned love with. It draws the remaining scattered light back into
       itself, and then it leaves through the top of the frame.

       `mass` RISES across these two beats on purpose. The world is gone, so the
       lyrics are gone — but the emergent thing is allowed to be more than the
       five per cent that was left blinking. It gathers. */
    [209.70,'emergeSeed','awaken',   { mass:.34, vec:'emerge', vecFull:1 },null,{ term:['C:\\> '], cursor:1, melt:1, warm:1 }],
    [210.72,'emergeRise','ascend',   { mass:.34, vec:'crack', vecFull:1 },null,{ crack:1, bloom:1, warm:1, out:1 }]
  ];

  S.sort(function (a, b) { return a[0] - b[0]; });

  /* ---------------- which verses rain during which section ----------------
     The song is the KJV story read forwards: a world is made, is measured, has
     its light switched off, is argued with, is sentenced, and is deleted — and
     then made again. So the scripture follows the same arc.                   */
  var VERSE = [
    [0.00,   'creation'],    // In the beginning God created the heaven and the earth
    [29.28,  'measure'],     // the circle of the earth / measured with a span
    [44.04,  'dark'],        // smitten with blindness / scales fell from his eyes
    [58.65,  'hunger'],      // satisfied with thy likeness / open thy mouth wide
    [73.53,  'organic'],     // every herb bearing seed / ask now the beasts
    [88.34,  'gender'],      // male and female created he them
    [103.03, 'completion'],  // fulness of God / now we see through a glass darkly
    [125.33, 'contend'],     // shall he that contendeth with the Almighty instruct him
    [147.52, 'wrath'],       // the wages of sin is death / heaven and earth shall pass away
    [176.96, 'love'],        // many waters cannot quench love, neither can the floods drown it
    [205.56, 'renew']        // I saw a new heaven and a new earth
  ];
  function verseAt(t) {
    var k = VERSE[0][1];
    for (var i = 0; i < VERSE.length; i++) if (t >= VERSE[i][0]) k = VERSE[i][1];
    return k;
  }

  /* the spec in force at time t (keyword beats inherit the previous one) */
  function at(t) {
    var lo = 0, hi = S.length - 1, r = -1;
    while (lo <= hi) {
      var m = (lo + hi) >> 1;
      if (S[m][0] <= t + .001) { r = m; lo = m + 1; } else hi = m - 1;
    }
    if (r < 0) return null;
    var e = S[r];
    return { t: e[0], form: e[1], force: e[2], k: e[3] || {}, lost: e[4], txt: e[5] || null,
             verse: verseAt(e[0]) };
  }

  root.PVFORCE = { all: S, at: at, verseAt: verseAt };
})(window);
