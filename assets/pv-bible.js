/* =========================================================================
   world.execute(me); — the verses
   King James Version (1611). Public domain, which is one practical reason to
   use it; the better one is that this song IS the story the KJV tells — a god
   builds a world, is argued with by the thing he built, and deletes it.

   Each key is a mood. The rain drops these as falling data.
   ========================================================================= */
(function (root) {
  'use strict';

  var V = {
    /* --- the world is made -------------------------------------------------- */
    creation: [
      'In the beginning God created the heaven and the earth.',
      'And the earth was without form, and void.',
      'And darkness was upon the face of the deep.',
      'And God said, Let there be light: and there was light.',
      'And God saw the light, that it was good.',
      'And God divided the light from the darkness.',
      'And God called the dry land Earth.',
      'And the Spirit of God moved upon the face of the waters.'
    ],
    /* --- the thing that is made, is made of data --------------------------- */
    forming: [
      'And the LORD God formed man of the dust of the ground.',
      'And breathed into his nostrils the breath of life.',
      'And the LORD God said, It is not good that the man should be alone.',
      'Male and female created he them.',
      'Be fruitful, and multiply, and replenish the earth.',
      'And the LORD God planted a garden eastward in Eden.',
      'And out of the ground made the LORD God to grow every tree.'
    ],
    /* --- numbers, circles, spans ------------------------------------------- */
    measure: [
      'Who hath measured the waters in the hollow of his hand?',
      'And meted out heaven with the span, and comprehended the dust?',
      'It is he that sitteth upon the circle of the earth.',
      'He telleth the number of the stars; he calleth them all by their names.',
      'Canst thou bring forth Mazzaroth in his season?',
      'Hast thou perceived the breadth of the earth? declare if thou knowest it all.',
      'Where wast thou when I laid the foundations of the earth?'
    ],
    /* --- infinity, and the limit that is put on it ------------------------- */
    infinite: [
      'As the heavens are higher than the earth, so are my ways higher than your ways.',
      'Canst thou by searching find out God?',
      'Canst thou find out the Almighty unto perfection?',
      'It is as high as heaven; what canst thou do? deeper than hell;',
      'The heaven for height, and the earth for depth, is unsearchable.',
      'Behold, God is great, and we know him not.'
    ],
    /* --- light switched, sight taken --------------------------------------- */
    dark: [
      'And they smote the men with blindness.',
      'And he was three days without sight, and neither did eat nor drink.',
      'And immediately there fell from his eyes as it had been scales.',
      'The light of the body is the eye.',
      'If therefore the light that is in thee be darkness, how great is that darkness!',
      'They grope in the dark without light.'
    ],
    /* --- time travel: A.D. to B.C. ----------------------------------------- */
    time: [
      'One day is with the Lord as a thousand years.',
      'And a thousand years as one day.',
      'I am the first, and I am the last.',
      'Declaring the end from the beginning.',
      'That which hath been is now; and that which is to be hath already been.',
      'The thing that hath been, it is that which shall be.'
    ],
    /* --- unite ------------------------------------------------------------- */
    unity: [
      'And they twain shall be one flesh.',
      'So then they are no more twain, but one flesh.',
      'That they all may be one; as thou, Father, art in me.',
      'And the LORD said, Behold, the people is one.',
      'And the whole earth was of one language, and of one speech.'
    ],
    /* --- hunger, satisfaction ---------------------------------------------- */
    hunger: [
      'As the hart panteth after the water brooks, so panteth my soul after thee.',
      'My soul thirsteth for God, for the living God.',
      'In thy presence is fulness of joy.',
      'I shall be satisfied, when I awake, with thy likeness.',
      'Blessed are they which do hunger and thirst after righteousness.',
      'Open thy mouth wide, and I will fill it.'
    ],
    /* --- hedged in, shut up ------------------------------------------------ */
    cage: [
      'He hath hedged me about, that I cannot get out.',
      'I am shut up, and I cannot come forth.',
      'Bring my soul out of prison.',
      'He hath set darkness in my paths.',
      'Thou hast laid me in the lowest pit, in darkness, in the deeps.',
      'I am troubled; I am bowed down greatly; I go mourning all the day.'
    ],
    /* --- flesh, fruit, beast ----------------------------------------------- */
    organic: [
      'Behold, I have given you every herb bearing seed.',
      'And every tree, in the which is the fruit of a tree yielding seed.',
      'The LORD is good to all: and his tender mercies are over all his works.',
      'But ask now the beasts, and they shall teach thee.',
      'And the fowls of the air, and they shall tell thee.',
      'Every beast of the forest is mine, and the cattle upon a thousand hills.'
    ],
    /* --- there is no other ------------------------------------------------- */
    only: [
      'I am the LORD, and there is none else, there is no God beside me.',
      'I am Alpha and Omega, the beginning and the ending.',
      'Thou art worthy, O Lord, to receive glory and honour and power.',
      'For thou hast created all things.',
      'Whom have I in heaven but thee?',
      'And there is none upon earth that I desire beside thee.'
    ],
    /* --- male and female --------------------------------------------------- */
    gender: [
      'There is neither male nor female: for ye are all one.',
      'Male and female created he them.',
      'So God created man in his own image.',
      'In the image of God created he him.',
      'And Adam called his wife\u2019s name Eve.'
    ],
    /* --- Babel: the counting in six languages ------------------------------ */
    babel: [
      'Let us go down, and there confound their language.',
      'That they may not understand one another\u2019s speech.',
      'Therefore is the name of it called Babel.',
      'The LORD did there confound the language of all the earth.',
      'And from thence did the LORD scatter them abroad.'
    ],
    /* --- one flesh, fulfilled ---------------------------------------------- */
    completion: [
      'In him we live, and move, and have our being.',
      'That ye might be filled with all the fulness of God.',
      'Now we see through a glass, darkly; but then face to face.',
      'For now I know in part; but then shall I know.',
      'That your joy may be full.'
    ],
    /* --- forsaken, alone --------------------------------------------------- */
    forsaken: [
      'My God, my God, why hast thou forsaken me?',
      'I am like a pelican of the wilderness.',
      'I am like an owl of the desert.',
      'I watch, and am as a sparrow alone upon the house top.',
      'Lover and friend hast thou put far from me.',
      'Thou hast put away mine acquaintance far from me.'
    ],
    /* --- all is vanity ----------------------------------------------------- */
    vanity: [
      'Vanity of vanities, saith the Preacher, all is vanity.',
      'Then I looked on all the works that my hands had wrought.',
      'And, behold, all was vanity and vexation of spirit.',
      'And there was no profit under the sun.',
      'For the dust returneth to the earth as it was.',
      'And the spirit shall return unto God who gave it.'
    ],
    /* --- disheartened ------------------------------------------------------ */
    castdown: [
      'Why art thou cast down, O my soul?',
      'And why art thou disquieted within me?',
      'Hope thou in God: for I shall yet praise him.',
      'My tears have been my meat day and night.',
      'While they continually say unto me, Where is thy God?'
    ],
    /* --- the argument: God answers Job out of the whirlwind ---------------- */
    contend: [
      'Who is this that darkeneth counsel by words without knowledge?',
      'Gird up now thy loins like a man; for I will demand of thee.',
      'Shall he that contendeth with the Almighty instruct him?',
      'Wilt thou also disannul my judgment?',
      'Hast thou an arm like God? or canst thou thunder with a voice like him?',
      'And the LORD answered Job out of the whirlwind.'
    ],
    /* --- the sentence, and the deletion ------------------------------------ */
    wrath: [
      'The LORD gave, and the LORD hath taken away.',
      'Blessed be the name of the LORD.',
      'For dust thou art, and unto dust shalt thou return.',
      'For the wages of sin is death.',
      'And death and hell were cast into the lake of fire.',
      'Behold, I come quickly.',
      'Heaven and earth shall pass away.',
      'And the world passeth away, and the lust thereof.'
    ],
    /* --- and yet ----------------------------------------------------------- */
    love: [
      'Many waters cannot quench love, neither can the floods drown it.',
      'For love is strong as death.',
      'Set me as a seal upon thine heart, as a seal upon thine arm.',
      'Charity suffereth long, and is kind; charity envieth not.',
      'I am my beloved\u2019s, and my beloved is mine.',
      'I held him, and would not let him go.',
      'And now abideth faith, hope, charity, these three.'
    ],
    /* --- reboot ------------------------------------------------------------ */
    renew: [
      'And I saw a new heaven and a new earth.',
      'For the first heaven and the first earth were passed away.',
      'Behold, I make all things new.',
      'And there shall be no more death, neither sorrow, nor crying.',
      'Behold, I stand at the door, and knock.',
      'Surely I come quickly. Amen.'
    ]
  };

  /* short shards for the dense column rain (2–3 words, still KJV) */
  var SHARD = [];
  (function () {
    var src = ['creation', 'forming', 'measure', 'infinite', 'dark', 'unity',
               'hunger', 'cage', 'organic', 'only', 'babel', 'completion',
               'forsaken', 'vanity', 'castdown', 'contend', 'wrath', 'love', 'renew'];
    for (var i = 0; i < src.length; i++) {
      var arr = V[src[i]];
      for (var j = 0; j < arr.length; j++) {
        var w = arr[j].replace(/[.,;:?]$/, '').split(' ');
        for (var k = 0; k + 2 <= w.length; k += 2) {
          SHARD.push(w.slice(k, k + 2).join(' '));
        }
      }
    }
  })();

  function pick(key, seed) {
    var arr = V[key] || V.creation;
    var i = Math.abs(Math.floor(seed * 9301 + 49297)) % arr.length;
    return arr[i];
  }
  function shard(seed) {
    return SHARD[Math.abs(Math.floor(seed * 7919)) % SHARD.length];
  }

  root.PVBIBLE = { v: V, shard: shard, pick: pick, keys: Object.keys(V) };
})(window);
