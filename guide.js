// Doanh dẫn đường: cuộn qua ảnh chân dung thì ảnh vỡ thành khối vuông, bay xuống góc trái màn hình và ghép
// thành nhân vật pixel đi cùng người xem. Mỗi phần nói một câu (chữ chạy như hộp thoại game) kèm thanh tiến độ;
// tới phần cuối thì ăn mừng. Cuộn ngược lên đầu thì các khối bay về ghép lại thành ảnh chân dung.
// Cần sprites.js (PX.guide) và pixel.js (window.PXFX). Tắt JS thì khối .guide giữ nguyên thuộc tính hidden.
(() => {
  const PX = window.PX, FX = window.PXFX;
  const root = document.querySelector('.guide');
  const photo = document.querySelector('.photo');
  const portrait = document.querySelector('.portrait');
  if (!PX?.guide || !FX || !root || !photo || !portrait) return;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const now = () => performance.now();
  const pal = PX.pal, G = PX.guide;

  /* ----- Nhân vật đứng trên bệ nổi, vẽ vào canvas 28x48 ----- */
  const me = $('.g-me', root);
  const cv = $('canvas', me);
  const ctx = cv.getContext('2d');
  const CW = cv.width, CH = cv.height;
  const OX = 4, PAD = 35, OY = PAD - 29; // hàng cuối của nhân vật chạm mặt bệ
  let pose = 'idle', poseUntil = 0, typing = false, news = false;

  const sizeMe = () => {
    const s = innerWidth < 600 ? 2 : 3;
    cv.style.width = CW * s + 'px';
    cv.style.height = CH * s + 'px';
  };
  const setPose = (p, ms) => { pose = p; poseUntil = now() + ms; if (reduce) draw(now()); };

  function draw(t) {
    ctx.clearRect(0, 0, CW, CH);
    if (t > poseUntil) pose = 'idle';
    const bob = reduce ? 0 : (t / 650 | 0) % 2;
    const jump = !reduce && pose === 'cheer' ? ((t / 200 | 0) % 2) * 3 : 0;
    const py = PAD + bob;

    // Quầng sáng và hạt sáng rơi dưới bệ
    ctx.fillStyle = '#22d3ee';
    ctx.globalAlpha = .25; ctx.fillRect(5, py + 4, 18, 1);
    ctx.globalAlpha = .1; ctx.fillRect(8, py + 5, 12, 2);
    if (!reduce) for (let k = 0; k < 3; k++) {
      const d = (t / 110 + k * 5) % 9;
      ctx.globalAlpha = 1 - d / 9;
      ctx.fillStyle = k === 1 ? '#c4b5fd' : '#67e8f9';
      ctx.fillRect(8 + k * 6, py + 4 + d | 0, 1, 1);
    }
    ctx.globalAlpha = 1;

    // Bệ: viền đen, mặt trên sáng, hàng đèn LED chạy dọc thân bệ
    ctx.fillStyle = '#04070e'; ctx.fillRect(2, py - 1, 24, 5);
    ctx.fillStyle = '#67e8f9'; ctx.fillRect(3, py, 22, 1);
    ctx.fillStyle = '#1e3a5f'; ctx.fillRect(3, py + 1, 22, 2);
    for (let n = 0; n < 5; n++) {
      ctx.fillStyle = (n + (t / 280 | 0)) % 5 === 0 ? '#a5f3fc' : '#334155';
      ctx.fillRect(5 + n * 4, py + 2, 2, 1);
    }

    // Nhân vật, chớp mắt và mấp máy miệng khi nói
    let name = pose;
    if (name === 'wave' && !reduce && (t / 260 | 0) % 2) name = 'wave2';
    const y0 = OY + bob - jump;
    FX.blit(ctx, G.frames[name], OX, y0);
    const patch = [];
    if (typing && (name === 'idle' || name === 'point') && (t / 120 | 0) % 2) patch.push(...G.talk);
    if (!reduce && name !== 'cheer' && t % 3800 < 140) patch.push(...G.blink);
    for (const [x, y, ch] of patch) { ctx.fillStyle = pal[ch]; ctx.fillRect(OX + x, y0 + y, 1, 1); }

    // Có lời mới mà đang ẩn hộp thoại thì hiện dấu "!" trên đầu
    if (news) FX.blit(ctx, PX.bubble, 18, Math.max(0, y0 - 6 + (reduce ? 0 : (t / 450 | 0) % 2)));
  }

  let raf = 0;
  const loop = t => { draw(t); raf = requestAnimationFrame(loop); };
  const play = () => { if (reduce) draw(now()); else if (!raf && !document.hidden) raf = requestAnimationFrame(loop); };
  const pause = () => { cancelAnimationFrame(raf); raf = 0; };
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : state === 'out' && play()));

  /* ----- Hộp thoại, câu theo từng phần, thanh tiến độ ----- */
  const out = $('.g-text', root);
  const live = $('.g-live', root);
  const actsEl = $('.g-actions', root);
  const cellsEl = $('.g-cells', root);
  const stepEl = $('.g-step', root);
  const lines = new Map($$('.g-lines li', root).map(li => [li.dataset.for, li.textContent.trim()]));
  const secs = $$('main > section.section');
  cellsEl.innerHTML = secs.map(() => '<i></i>').join('');
  let cur = -1, text = '', withActs = false, muted = false, celebrated = false, greeted = false;
  let typeTimer = 0, hideTimer = 0, greetTimer = 0;

  const progress = () => {
    $$('i', cellsEl).forEach((c, i) => c.classList.toggle('on', i <= cur));
    stepEl.textContent = `${Math.max(0, cur + 1)}/${secs.length}`;
  };
  progress();

  function say(t, acts = false) {
    if (!t) return;
    text = t; withActs = acts;
    if (muted || root.classList.contains('quiet')) { news = true; if (reduce) draw(now()); return; }
    news = false;
    clearTimeout(typeTimer); clearTimeout(hideTimer);
    root.classList.add('talk');
    actsEl.hidden = true;
    live.textContent = t;
    if (reduce) { out.textContent = t; return typed(); }
    typing = true;
    let n = 0;
    const tick = () => {
      out.textContent = t.slice(0, ++n);
      if (n >= t.length) return typed();
      typeTimer = setTimeout(tick, /[,.!?]/.test(t[n - 1]) ? 140 : 22);
    };
    tick();
  }
  function typed() {
    typing = false;
    actsEl.hidden = !withActs;
    // Tự ẩn lời thoại sau vài giây cho đỡ che nội dung (trừ câu cuối có nút)
    if (!withActs) hideTimer = setTimeout(() => root.classList.remove('talk'), innerWidth < 600 ? 5000 : 7000);
  }
  function hush() {
    clearTimeout(typeTimer); clearTimeout(hideTimer);
    typing = false;
    root.classList.remove('talk');
  }

  function sectionLine() {
    if (cur < 0) return;
    const last = cur === secs.length - 1;
    if (last && !celebrated) {
      // Tới phần cuối lần đầu: nhảy ăn mừng, nổ pháo pixel
      celebrated = true;
      setPose('cheer', 2600);
      FX.burst(...FX.centerOf(cv), 1.8);
      setTimeout(() => FX.burst(...FX.centerOf(cv), 1.2, ['#facc15', '#fde68a', '#f472b6', '#fff7ed']), 350);
    } else setPose(last ? 'wave' : 'point', 2400);
    say(lines.get(secs[cur].id), last);
  }

  // Phần nào đi qua giữa màn hình là phần đang xem
  const spy = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const i = secs.indexOf(e.target);
    if (i === cur) return;
    cur = i;
    progress();
    if (state === 'out' && greeted) sectionLine();
  }), { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach(s => spy.observe(s));

  function arrive() {
    greeted = false;
    setPose('wave', 1800);
    say(lines.get('top'));
    // Chào xong thì nói về phần đang xem
    clearTimeout(greetTimer);
    greetTimer = setTimeout(() => { greeted = true; if (state === 'out') sectionLine(); }, 3200);
  }

  /* ----- Bay giữa ảnh chân dung và góc màn hình ----- */
  const fly = document.createElement('canvas');
  fly.className = 'g-fly';
  fly.setAttribute('aria-hidden', 'true');
  document.body.append(fly);
  const fctx = fly.getContext('2d');
  let state = 'home', want = 'home';

  // Vị trí từng điểm ảnh của nhân vật trên màn hình
  function guideCells() {
    const r = cv.getBoundingClientRect(), s = r.width / CW, list = [];
    G.frames.idle.forEach((row, j) => [...row].forEach((ch, i) => {
      if (pal[ch]) list.push({ x: r.left + (OX + i) * s, y: r.top + (OY + j) * s, s, c: pal[ch] });
    }));
    return list;
  }
  // Vị trí từng khối của chân dung; có ảnh thật thì đặt hình chân dung pixel vào khung ảnh
  function portraitCells() {
    if (FX.portrait) return FX.portrait.screenCells();
    const rows = PX.art.portrait, r = photo.getBoundingClientRect();
    const s = r.width * .86 / rows[0].length, ox = r.left + r.width * .07, oy = r.top + r.height * .12, list = [];
    rows.forEach((row, j) => [...row].forEach((ch, i) => {
      if (pal[ch]) list.push({ x: ox + i * s, y: oy + j * s, s, c: pal[ch] });
    }));
    return list;
  }
  const shuffle = a => {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  // Mỗi khối bay theo đường cong từ hình này sang hình kia, đổi màu ở giữa đường
  function flight(from, to, dur, then) {
    if (reduce || !from.length || !to.length) return then();
    fly.width = innerWidth;
    fly.height = innerHeight;
    shuffle(from); shuffle(to);
    const n = Math.max(from.length, to.length);
    const ps = Array.from({ length: n }, (_, i) => ({
      a: from[i % from.length], b: to[i % to.length],
      d: Math.random() * .35, arc: (Math.random() - .5) * 220,
    }));
    const t0 = now();
    const step = t => {
      const k = (t - t0) / dur;
      fctx.clearRect(0, 0, fly.width, fly.height);
      for (const p of ps) {
        const kk = Math.min(1, Math.max(0, (k - p.d) / .65));
        const e = kk < .5 ? 4 * kk ** 3 : 1 - (-2 * kk + 2) ** 3 / 2;
        const x = p.a.x + (p.b.x - p.a.x) * e + Math.sin(Math.PI * e) * p.arc;
        const y = p.a.y + (p.b.y - p.a.y) * e;
        const s = p.a.s + (p.b.s - p.a.s) * e;
        fctx.fillStyle = e < .55 ? p.a.c : p.b.c;
        fctx.fillRect(Math.round(x), Math.round(y), Math.ceil(s), Math.ceil(s));
      }
      if (k < 1) requestAnimationFrame(step);
      else { fctx.clearRect(0, 0, fly.width, fly.height); then(); }
    };
    requestAnimationFrame(step);
  }

  function flyOut() {
    state = 'moving';
    sizeMe();
    root.hidden = false;
    root.classList.add('arriving');
    requestAnimationFrame(() => {
      const from = portraitCells(), to = guideCells();
      photo.classList.add('away');
      flight(from, to, 1150, () => {
        root.classList.remove('arriving');
        state = 'out';
        play();
        FX.burst(...FX.centerOf(cv), 1.2);
        arrive();
        sync();
      });
    });
  }
  function flyHome() {
    state = 'moving';
    hush();
    clearTimeout(greetTimer);
    const from = guideCells();
    root.classList.add('leaving');
    pause();
    flight(from, portraitCells(), 1000, () => {
      root.hidden = true;
      root.classList.remove('leaving');
      photo.classList.remove('away');
      state = 'home';
      FX.burst(...FX.centerOf(photo), 1.3);
      sync();
    });
  }
  function sync() {
    if (state === 'moving' || state === want) return;
    if (want === 'out') flyOut(); else flyHome();
  }

  // Ảnh chân dung khuất gần hết phía trên màn hình thì nhân vật xuất hiện
  new IntersectionObserver(([e]) => {
    want = e.intersectionRatio < .3 && e.boundingClientRect.top < innerHeight / 2 ? 'out' : 'home';
    sync();
  }, { threshold: [0, .3, .6] }).observe(portrait);
  addEventListener('resize', () => { if (state !== 'home') sizeMe(); });

  /* ----- Bấm nhân vật: ẩn/hiện lời thoại; bấm nhanh 5 lần mở bí mật ----- */
  let taps = [];
  me.addEventListener('click', () => {
    const t = now();
    taps = taps.filter(x => t - x < 1600).concat(t);
    if (taps.length >= 5) { taps = []; dispatchEvent(new Event('px-secret')); return; }
    if (root.classList.contains('talk')) { muted = true; hush(); }
    else { muted = false; setPose('wave', 1200); say(text || lines.get('top'), withActs); }
  });
  $('.g-x', root).addEventListener('click', () => {
    muted = true;
    hush();
    me.focus({ preventScroll: true });
  });

  // Đang mở hộp thoại của nhân vật ở dải phong cảnh thì nhân vật dẫn đường im lặng
  const dlg = $('.dlg');
  if (dlg) new MutationObserver(() => root.classList.toggle('quiet', dlg.classList.contains('show')))
    .observe(dlg, { attributes: true, attributeFilter: ['class'] });

  window.PXGUIDE = {
    secret() {
      if (state !== 'out') return;
      muted = false;
      setPose('cheer', 2600);
      say(lines.get('konami'));
      // Nói xong câu bí mật thì quay lại lời của phần đang xem
      clearTimeout(greetTimer);
      greetTimer = setTimeout(() => { if (state === 'out') say(lines.get(secs[cur]?.id), cur === secs.length - 1); }, 4500);
    },
  };
})();
