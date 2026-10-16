/* =========================================================================
   world.execute(me); — the insurrection
   "Challenging your god / you have made some / ILLEGAL ARGUMENTS"

   "Illegal arguments" is a pun: theological AND command-line. So the created
   thing attacks its maker with SYSTEM COMMANDS, and every one is refused.
   This layer is a real terminal taking over the frame — not a circle, not a
   dot cloud. The escalation is in who is issuing and who is refusing:

     1  systemctl stop god.service      Operation not permitted
     2  kill -9 $(pidof god)            No such process
     3  chown -R me /world              Permission denied
     4  rm -rf /world/you               Device or resource busy
     5  sudo su -                       not in the sudoers file
     6  assert(me == god)               AssertionError: me is not god

   Each refusal lands on the beat, hard, with the exit code stamped after it.
   ========================================================================= */
(function (root) {
  'use strict';

  var W = 1920, H = 1080;
  var el, bodyEl, titleEl, clock = 0, lastT = -1, cur = null, shown = 0, landAt = 0;
  var count = 0, promptEl = null, lastBeatAt = 0;

  function fmt(t) {
    var m = Math.floor(t / 60), s = (t % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
  }

  function init(o) {
    el = document.createElement('div');
    el.id = 'pvsys';
    el.innerHTML =
      '<div class="sys-bar">' +
        '<span class="sys-dot r"></span><span class="sys-dot y"></span><span class="sys-dot g"></span>' +
        '<span class="sys-title">me@world: ~ — bash</span>' +
        '<span class="sys-uid">uid=1000(me) gid=1000(me) — NOT ROOT</span>' +
      '</div>' +
      '<div class="sys-body"></div>';
    o.host.appendChild(el);
    bodyEl = el.querySelector('.sys-body');
    titleEl = el.querySelector('.sys-title');
  }

  /* one command + its refusal, typed then stamped */
  function line(spec, at) {
    var d = document.createElement('div');
    d.className = 'sys-line new';
    var stamp = document.createElement('span');
    stamp.className = 'sys-ts';
    stamp.textContent = '[' + fmt(at) + ']';
    var cmd = document.createElement('span');
    cmd.className = 'sys-cmd';
    cmd.textContent = spec.cmd;
    var st = document.createElement('span');
    st.className = 'sys-st ' + (spec.st === 'FAIL' ? 'fail' : 'ok');
    st.textContent = spec.st;
    var why = document.createElement('div');
    why.className = 'sys-why';
    why.textContent = spec.why;
    d.appendChild(stamp); d.appendChild(cmd); d.appendChild(st);
    d.appendChild(why);
    return d;
  }

  /* Every sys command in the score at or before time t, in order.
     The terminal ACCUMULATES: by the last command the whole panel is the list
     of everything it tried and everything that was refused. Rebuilding that
     list from the score (rather than appending blindly) is also what makes a
     SEEK correct — jumping straight to 133.8 must show the five commands that
     came before it, not just the one that happens to be playing. */
  function historyAt(t) {
    var all = (root.PVFORCE && root.PVFORCE.all) || [];
    var out = [];
    for (var i = 0; i < all.length; i++) {
      var e = all[i];
      if (e[0] > t + .001) break;
      var s = e[5] && e[5].sys;
      if (!s) continue;
      for (var j = 0; j < s.length; j++) out.push({ c: s[j], at: e[0] });
    }
    return out;
  }

  function setLine(spec) {
    if (!el) return;
    /* NOTE: the command list lives in the spec's `txt` slot (e[5]), NOT in `k`
       (e[3]) — `k` is the numeric params for the field. Reading the wrong one
       fails silently: the terminal just never appears. */
    var s = spec && spec.txt && spec.txt.sys;
    if (!s) {
      /* Leaving the section (or seeking out of it). Fade the panel out via the
         `on` class — pv.css animates opacity/translate, because `display:none`
         cannot transition and the old version vanished in a single frame, which
         read as a cut out of the section.
         The BODY MUST ALSO RESET here. Otherwise seeking back into the section
         appended a second copy of every command to the old ones, and seeking
         out and in repeatedly grew the log without bound. */
      if (el.classList.contains('on') || count) {
        el.classList.remove('on');
        bodyEl.innerHTML = '';
        promptEl = null;
        count = 0;
      }
      lastT = -1;
      return;
    }
    if (spec.t === lastT) return;
    lastT = spec.t;

    var hist = historyAt(spec.t);
    /* seeked BACKWARDS (or first entry): rebuild from scratch */
    if (hist.length < count) {
      bodyEl.innerHTML = '';
      promptEl = null;
      count = 0;
    }
    el.classList.add('on');
    var wasEmpty = (count === 0);

    /* APPEND only what is new. Rebuilding innerHTML replayed every entry's
       entry-animation at once, which is what made each beat land as a hard
       jump; appending lets the older lines stay put and the new one slide in
       underneath — and then the panel scrolls by one line, which reads as a
       terminal rather than a slideshow. */
    for (var i = count; i < hist.length; i++) {
      bodyEl.insertBefore(line(hist[i].c, hist[i].at), promptEl);
    }
    count = hist.length;

    /* the prompt lives at the end and never moves */
    if (!promptEl) {
      promptEl = document.createElement('div');
      promptEl.className = 'sys-prompt';
      promptEl.innerHTML = '<span class="sys-user">me@world</span>:<span class="sys-path">~</span>$ ' +
        '<span class="sys-cur"></span>' +
        '<span class="sys-hint">no shell for you</span>';
      bodyEl.appendChild(promptEl);
    } else {
      bodyEl.appendChild(promptEl);        /* keep it last */
    }
    bodyEl.scrollTop = bodyEl.scrollHeight;

    titleEl.textContent = 'me@world: ~ — bash — ' + count + ' command' +
      (count === 1 ? '' : 's') + ' attempted, 0 succeeded';
    if (wasEmpty) bodyEl.scrollTop = 0;
    landAt = clock;
  }

  function frame(o) {
    if (!el) return;
    clock += Math.min(.05, o.dt || .016);
    if (!el.classList.contains('on')) return;
    /* the refusal stamp slams in, then the whole panel shudders. The shove
       decays over 0.34s so consecutive commands read as a drumbeat rather than
       a series of disconnected jumps. */
    var age = clock - landAt;
    el.style.setProperty('--shock', age < .34 ? (1 - age / .34).toFixed(3) : '0');
  }

  root.PVSYS = {
    init: init, frame: frame, setLine: setLine,
    on: function () { return el && el.classList.contains('on'); }
  };
})(window);
