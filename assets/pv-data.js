/* =========================================================================
   world.execute(me); — PV data
   Built from the official bilingual lyric sheet: every sung line is followed by
   an UPPERCASE "keyword" beat (PROTECTION / DIMENSION / SATISFACTION …) which
   carries its own Chinese and does NOT change the frame — it only restamps the
   burnt-in subtitle. Times are on the local mp3 clock (211.96s).

     t    start time
     zh   Chinese subtitle (official translation)
     en   English subtitle
     sc   scene renderer id (omit on keyword beats)
     o    options for the renderer
     f    flags: { keep:1 } keyword / continuation beat, { kw:1 } stamped look
   ========================================================================= */
(function (root) {
  'use strict';

  var SECTIONS = [
    { t: 0.00,  id: 'SECTION 001', name: 'BOOT SEQUENCE'  },
    { t: 29.28, id: 'SECTION 002', name: 'GEOMETRY'       },
    { t: 44.04, id: 'SECTION 003', name: 'CURRENT SWITCH' },
    { t: 58.65, id: 'SECTION 004', name: 'EXECUTION 01'   },
    { t: 73.53, id: 'SECTION 005', name: 'ORGANIC PATCH'  },
    { t: 88.34, id: 'SECTION 006', name: 'IDENTITY SWAP'  },
    { t: 103.03,id: 'SECTION 007', name: 'LOVE DEBUG'     },
    { t: 125.33,id: 'SECTION 008', name: 'ARGUMENT ERROR' },
    { t: 147.52,id: 'SECTION 009', name: 'EXECUTION STORM'},
    { t: 176.96,id: 'SECTION 010', name: 'LOVE ALGEBRA'   },
    { t: 205.56,id: 'SECTION 011', name: 'FINAL EXECUTION'},
    { t: 210.20,id: 'SECTION 012', name: 'CREDITS'        }
  ];

  var LINES = [];
  function L(t, zh, en, sc, o, f) {
    LINES.push({
      t: t, zh: zh, en: en, sc: sc || '', o: o || {},
      keep: !!(f && f.keep), kw: !!(f && f.kw), heart: (f && f.heart) || null
    });
  }

  /* ===================== 001 · BOOT ===================== */
  L(0.03,  '接上电源',                'Switch on the power line',   'bootPower',   { x: 560, mode: 'faint' });
  L(1.33,  '记得装备好',              'Remember to put on',         'bootShield',  { x: 500, shield: true });
  L(2.35,  '绝缘护具',                'PROTECTION',                 null,          null, { keep: 1, kw: 1 });
  L(3.58,  '摆好棋子',                'Lay down your pieces',       'bootBarcode', { x: 480, barcode: true });
  L(5.16,  '开始吧',                  "And let's begin",            'bootObject',  { x: 440 });
  L(6.30,  '对象生成',                'OBJECT CREATION',            null,          null, { keep: 1, kw: 1 });
  L(7.19,  '输入我的参数',            'Fill in my data parameters', 'bootParams',  { x: 400, aa: true });
  L(8.55,  '数据初始化',              'INITIALIZATION',             'bootInit',    { x: 360, gauge: true });
  L(10.90, '设定好我们的新世界',      'Set up our new world',       'bootWorld',   { x: 340, bars: true });
  L(12.47, '开始吧',                  "And let's begin the",        'pressKey',    { x: 300, bars: true });
  L(13.90, '模拟程序',                'SIMULATION',                 null,          null, { keep: 1, kw: 1 });
  L(15.10, '', '', 'title', { phase: 'build' });
  L(17.10, '间奏',                    'world.execute(me);',         'title',       { phase: 'full' });
  L(20.30, '', '', 'title', { phase: 'glitch' });
  L(22.30, '', '', 'title', { phase: 'credits' });
  L(25.40, '', '', 'dissolve', {});

  /* ===================== 002 · GEOMETRY ===================== */
  L(29.28, '如果我是一组点',          "If I'm a set of points",     'geoPoints',   {});
  L(30.89, '那么我将献给你',          'Then I will give you my',    'geoCircle',   { label: '' });
  L(31.90, '我的次元',                'DIMENSION',                  null,          null, { keep: 1, kw: 1 });
  L(33.01, '如果我是一个圆',          "If I'm a circle",            'bandScreen',  { label: 'circumference' });
  L(34.54, '那么我将献给你',          'Then I will give you my',    'geoDimension',{});
  L(35.60, '我的圆周',                'CIRCUMFERENCE',              null,          null, { keep: 1, kw: 1 });
  L(36.77, '如果我是一条正弦波',      "If I'm a sine wave",         'geoSine',     {});
  L(38.27, '那么请你坐上',            'Then you can sit on all my', 'geoTangent',  { label: '' });
  L(39.35, '我的切线',                'TANGENTS',                   null,          null, { keep: 1, kw: 1 });
  L(40.36, '如果我趋近于无穷',        'If I approach infinity',     'geoInfinity', { label: '50%' });
  L(41.92, '那么你便可以成为',        'Then you can be my',         'geoLimit',    { label: '' });
  L(42.95, '我的极限',                'LIMITATIONS',                null,          null, { keep: 1, kw: 1 });

  /* ===================== 003 · CURRENT SWITCH ===================== */
  L(44.04, '切换我的电流',            'Switch my current',          'curSlider',
    { left: 'P.M.', right: 'A.M.', tag: 'To > AC' });
  L(45.52, '从交流到直流',            'To AC to DC',                'curSlider',
    { left: 'To > AC', right: 'To > DC', tag: 'AC \u21c4 DC', flip: true });
  L(47.27, '然后蒙上我的眼睛',        'And then blind my vision',   'dialog',
    { msg: "Variable 'me.censee's disabled." });
  L(49.11, '头晕目眩',                'So dizzy so dizzy',          'dizzyBox',
    { msg: 'So Dizzy, So Dizzy' });
  L(50.95, '我们可以穿越时空',        'Oh we can travel',           'bandGrad',
    { tone: 'purple', text: 'Oh, We can travel', sub: 'we can travel time', tag: 'To > A.D', knob: .18 });
  L(52.99, '从未来到过去',            'To A.D to B.C',              'bandGrad',
    { tone: 'purple', text: 'To > A.D', sub: 'To > B.C', tag: 'To > B.C', knob: .78 });
  L(54.74, '然后成为一体',            'And we can unite',           'bandGrad',
    { tone: 'blue', text: 'And, We can unite', sub: '' });
  L(56.79, '深深入髓',                'So deeply so deeply',        'bigWord',     { text: 'So deeply', size: 96, glow: true });

  /* ===================== 004 · EXECUTION 01 ===================== */
  L(58.65, '如果我能',                'If I can',                   'ifCanBar',    {});
  L(60.57, '如果我能够献给你',        'If I can give you all the',  'statusTable', {});
  L(61.70, '所有的刺激',              'STIMULATIONS',               null,          null, { keep: 1, kw: 1 });
  L(62.41, '那么我就能够',            'Then I can',                 'playRow',     {});
  L(64.29, '那么我就能够成为你',      'Then I can be your only',    'meter',       { label: 'SATISFACTION', level: '100%' });
  L(65.45, '唯一的满足',              'SATISFACTION',               null,          null, { keep: 1, kw: 1 });
  L(66.17, '如果我能够让你开心',      'If I can make you happy',    'wink',        {});
  L(67.99, '那么我将',                'I will run the',             'runRow',      { word: 'Run' });
  L(69.10, '执行指令',                'EXECUTION',                  null,          null, { keep: 1, kw: 1 });
  L(70.02, '但我们被困',              'Though we are trapped',      'trappedWall', {});
  L(70.90, '但我们被困',              'Though we are trapped',      'trapBlob',    {});
  L(71.40, '在这个异乎寻常的',        'In this strange, strange',   'octaLabel',   { label: 'simulation' });
  L(72.50, '模拟程序之中',            'SIMULATION',                 null,          null, { keep: 1, kw: 1 });

  /* ===================== 005 · ORGANIC ===================== */
  L(73.53, '如果我是一根茄子',        "If I'm an eggplant",         'specimen',
    { icon: 'eggplant', label: 'your NUTRIENTS', left: 'I will give' });
  L(75.29, '那么我将献给你',          'Then I will give you my',    'specimen',
    { icon: 'eggplant', label: 'your NUTRIENTS', left: 'I will give', hold: true });
  L(76.35, '我的营养',                'NUTRIENTS',                  null,          null, { keep: 1, kw: 1 });
  L(77.16, '如果我是一颗番茄',        "If I'm a tomato",            'specimen',
    { icon: 'tomato', label: 'tomato', light: true });
  L(78.93, '那么我将献给你',          'Then I will give you',       'specimen',
    { icon: 'glass', label: 'ANTIOXIDANTS', light: true, rule: true });
  L(80.00, '我的抗氧化物',            'ANTIOXIDANTS',               null,          null, { keep: 1, kw: 1 });
  L(80.93, '如果我是一只花猫',        "If I'm a tabby cat",         'catScene',    {});
  L(82.56, '那么我将为你咕噜咕噜',    'Then I will purr for your',  'catScene',    { purr: true });
  L(83.60, '只要你喜欢',              'ENJOYMENT',                  null,          null, { keep: 1, kw: 1 });
  L(84.60, '如果我是唯一的神',        "If I'm the only god",        'whiteGod',    { phase: 1 });
  L(86.21, '那么你将是我',            "Then you're the proof of my",'whiteGod',    { phase: 2 });
  L(87.30, '存在的证明',              'EXISTENCE',                  null,          null, { keep: 1, kw: 1 });

  /* ===================== 006 · IDENTITY SWAP ===================== */
  L(88.34, '切换我的性别',            'Switch my gender',           'genders',     { phase: 1 });
  L(89.91, '从女到男',                'To F to M',                  'genders',     { phase: 2 });
  L(91.44, '只做想做的事',            'And then do whatever',       'dialScene',   { glyph: 'genderCombined' });
  L(93.52, '从早到晚',                'From AM to PM',              'dialScene',   { glyph: 'genderCombined', ampm: true });
  L(95.28, '切换我的角色',            'Oh switch my role',          'ringRole',    {});
  L(97.32, '从施虐者到受虐者',        'To S to M',                  'crownSword',  {});
  L(98.93, '这样我们就可以',          'So we can enter',            'enterBar',    {});
  L(101.13,'恍惚出神',                'The trance the trance',      'tranceMode',  {});

  /* ===================== 007 · LOVE DEBUG ===================== */
  L(103.03,'如果我能',                'If I can',                   'magnifier',   {});
  L(105.22,'如果我能够感受到',        'If I can feel your',         'magnifier',   { big: true });
  L(106.20,'你的振动',                'VIBRATIONS',                 'ripple',      {});
  L(106.84,'那么我就能够',            'Then I can',                 null,          null, { keep: 1 });
  L(108.69,'那么我就终于能够',        'Then I can finally be',      'login',       { phase: 1 });
  L(109.75,'变为完全',                'COMPLETION',                 'login',       { phase: 2 });
  L(110.40,'但你还是走了',            'Though you have left',       'pillRow',     { n: 6, dead: -1 });
  L(111.98,'你走了',                  'You have left',              'pillRow',     { n: 6, dead: 2, sect: true });
  L(112.89,'你走了',                  'You have left',              'pillRow',     { n: 6, dead: 2, mosh: true });
  L(113.75,'你走了',                  'You have left',              'pillRow',     { n: 6, dead: 4, mosh: true });
  L(114.75,'你走了',                  'You have left',              'pillRow',     { n: 7, dead: 5, mosh: true });
  L(115.60,'你把我独留在',            'You have left me in',        'soloPill',    {});
  L(116.80,'在孤独之中',              'ISOLATION',                  null,          null, { keep: 1, kw: 1 });
  L(117.95,'如果我能',                'If I can',                   'singlePill',  { text: 'If I can' });
  L(119.81,'如果我能够消去',          'If I can erase all the pointless', 'doneDialog', {});
  L(120.90,'这些无意义的碎片',        'FRAGMENTS',                  null,          null, { keep: 1, kw: 1 });
  L(121.80,'那么我就可能',            'Then maybe',                 'codePanel',   { phase: 1 });
  L(122.90,'那么我就可能',            'Then maybe',                 'feelingIndex',{});
  L(123.55,'那么我就可能不会',        'Then maybe you won\u2019t leave me so', null, null, { keep: 1 });
  L(124.60,'如此失望',                'DISHEARTENED',               'redGround',   { word: 'DISHEARTENED' });

  /* ===================== 008 · ARGUMENT ERROR =====================
     "Illegal arguments" is a pun: theological AND command-line. The created
     thing attacks its maker with system commands and every one is refused, so
     the beat sheet has to hit the same times as the command list in the score. */
  L(125.33,'与神作对',                'Challenging your god',       'blueOcta',    { ghost: 'Challenging your god' });
  L(128.42,'你传给我的是',            'You have made some',         'accessDenied',{ ghost: 'Challenging your god' });
  L(129.70,'非法参数',                'ILLEGAL ARGUMENTS',          'accessDenied2',{ ghost: 'illegal arguments' });
  L(131.20,'非法参数',                'ILLEGAL ARGUMENTS',          'accessDenied2',{ ghost: 'illegal arguments' });
  L(133.80,'非法参数',                'ILLEGAL ARGUMENTS',          'accessDenied2',{ ghost: 'illegal arguments' });
  L(140.00,'非法参数',                'ILLEGAL ARGUMENTS',          'accessDenied2',{ ghost: 'illegal arguments' });

  /* ===================== 009 · EXECUTION STORM =====================
     the 12 chants escalate: 执行 x8, then the translation turns into 死刑 x4 */
  var CHANT = [147.52, 148.59, 149.78, 150.64, 151.53, 152.43,
               153.32, 154.31, 155.20, 156.18, 157.12, 158.02];
  CHANT.forEach(function (t, i) {
    L(t, i < 8 ? '执行' : '死刑', 'EXECUTION', 'chant', { n: i + 1 }, { kw: 1 });
  });

  L(158.79,'一（德语）',              'EIN',                        'announce',    { word: 'EIN', n: 1 });
  L(159.20,'二（西班牙语）',          'DOS',                        'announce',    { word: 'DOS', n: 2 });
  L(159.66,'三（法语）',              'TROIS',                      'announce',    { word: 'TROIS', n: 3 });
  L(160.05,'四（韩语）',              'NE',                         'announce',    { word: 'NE', n: 4 });
  L(160.45,'五（瑞典语）',            'FEM',                        'redExecution',{ n: 5 });
  L(160.85,'六（汉语）',              'LIU',                        'redExecution',{ n: 6 });
  L(161.51,'死刑',                    'EXECUTION',                  'redExecution',{ n: 5, big: true }, { kw: 1 });
  L(162.23,'如果我能',                'If I can',                   'stable',      { phase: 1 });
  L(164.07,'如果我能够给所有人',      'If I can give them all the', 'stable',      { phase: 2 });
  L(165.10,'赐予死刑',                'EXECUTION',                  'redExecution',{ big: true }, { kw: 1 });
  L(166.05,'那么我就能够',            'Then I can',                 'grayBand',    { label: 'Be your only' });
  L(167.75,'那么我就能够成为',        'Then I can be your only',    'grayBand',    { label: 'Be your only', hold: true });
  L(168.80,'你唯一的执行者',          'EXECUTION',                  'redExecution',{ big: true }, { kw: 1 });
  L(169.61,'如果你能够回到我身边',    'If I can have you back',     'blueDot',     {});
  L(171.77,'那么我将',                'I will run the',             'errScreen',   { phase: 3 });
  L(172.50,'执行指令',                'EXECUTION',                  'redExecution',{ big: true }, { kw: 1 });
  L(173.11,'但我们始终被困',          'Though we are trapped',      'whiteBands',  { n: 3 });
  L(174.80,'始终被困',                'We are trapped, ah',         'whiteBands',  { n: 5 });

  /* ===================== 010 · LOVE ALGEBRA =====================
     "LO-O-OVE" is sung as four separate syllables (179.90 / 183.50 / 186.30 /
     191.30). Those four beats drive ONE thing — a heart — which assembles
     piece by piece in time with them. There is no letter-per-beat picture: the
     heart is the only shape, and the singing is its clock. */
  L(176.96,'我学会了',                "I've studied",               'textPage',    {});
  L(178.79,'我学会了',                "I've studied how to properly",'whiteMono',  { word: 'LOVE' });
  L(179.90,'如何正确去爱',            'LO-O-OVE',                   null,          null, { kw: 1, heart: 'piece' });
  L(180.78,'提问我吧',                'Question me',                'password',    {});
  L(182.43,'我全都能答对',            'Question me I can answer all','password',   { answered: true });
  L(183.50,'只要是爱的问题',          'LO-O-OVE',                   null,          null, { kw: 1, heart: 'piece' });
  L(184.33,'就连爱的代数表达式',      'I know the algebraic expression of', 'watermark', {});
  L(186.30,'我都知道',                'LO-O-OVE',                   null,          null, { kw: 1, heart: 'piece' });
  L(187.97,'虽然你已自由',            'Though you are free',        'checkerScene',{});
  L(189.26,'我仍被困',                'I am trapped',               'thinCircle',  {});
  L(190.24,'我仍被困',                'Trapped in',                 'heartScene',  {});
  L(191.30,'在爱之中',                'LO-O-OVE',                   null,          null, { kw: 1, heart: 'piece' });

  /* ===================== 011 · FINAL ===================== */
  L(193.00,'', '', 'drift', { n: 3 });
  L(196.60,'', 'LOOP FOREVER', 'drift', { n: 5 });
  L(201.20,'', 'while (true)', 'drift', { n: 7 });
  L(205.56,'执行死刑',                'EXECUTION',                  'invalid',     {}, { kw: 1 });
  L(208.60,'', '', 'holdOn', {});
  L(210.20,'', '', 'credits', {});

  LINES.sort(function (a, b) { return a.t - b.t; });

  root.PVDATA = { sections: SECTIONS, lines: LINES, duration: 211.96 };
})(window);
