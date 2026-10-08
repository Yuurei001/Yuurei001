// Hiệu ứng cho trang CV. Không dùng thư viện ngoài.
// Thẻ <html> được đổi class "no-js" -> "js" ngay trong <head>; tắt JS thì CSS hiện đủ nội dung.
(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Cuộn: thanh tiến độ, menu, nút lên đầu, dòng thời gian ---------- */
  const nav = $('.nav');
  const toTop = $('.to-top');
  const tl = $('.tl');
  function onScroll() {
    const max = root.scrollHeight - innerHeight;
    const y = scrollY;
    root.style.setProperty('--sp', max > 0 ? (y / max).toFixed(4) : 0);
    nav.classList.toggle('scrolled', y > 20);
    toTop.classList.toggle('show', y > innerHeight * .8);
    if (tl) {
      // Đường thời gian vẽ tới điểm 60% chiều cao màn hình
      const r = tl.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * .6 - r.top) / r.height));
      tl.style.setProperty('--tl', p.toFixed(4));
    }
  }
  let ticking = false;
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(() => { onScroll(); ticking = false; }); }
  }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();
  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

  /* ---------- Menu điện thoại ---------- */
  const burger = $('.burger');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  $$('.menu a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  }));

  /* ---------- Đánh dấu mục đang xem trên menu ---------- */
  const links = new Map($$('.menu a[href^="#"]').map(a => [a.getAttribute('href').slice(1), a]));
  const spy = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => a.classList.remove('active'));
      links.get(e.target.id)?.classList.add('active');
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });

  /* ---------- Hiện dần khi cuộn tới ---------- */
  const seen = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      e.target.querySelectorAll('[data-count]').forEach(countUp);
      if (e.target.matches('[data-count]')) countUp(e.target);
      seen.unobserve(e.target);
    });
  }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal, .tl-item, .viz, .dial, .langbox, .stats').forEach(el => seen.observe(el));

  /* ---------- Số đếm lên (HTML ghi sẵn số cuối để tắt JS vẫn đúng) ---------- */
  if (!reduce) $$('[data-count]').forEach(el => {
    el.textContent = (0).toFixed((el.dataset.count.split('.')[1] || '').length);
  });
  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = 1;
    const end = parseFloat(el.dataset.count);
    const dec = (el.dataset.count.split('.')[1] || '').length;
    if (reduce) { el.textContent = end.toFixed(dec); return; }
    const dur = 1800, t0 = performance.now();
    const step = t => {
      const k = Math.min(1, (t - t0) / dur);
      const v = end * (1 - Math.pow(1 - k, 4));
      el.textContent = v.toFixed(dec);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- Chữ tự gõ ở phần mở đầu ---------- */
  const typed = $('.typed');
  if (typed && !reduce) {
    const words = JSON.parse(typed.dataset.words);
    let w = 0, i = words[0].length, del = true;
    const tick = () => {
      const word = words[w];
      typed.textContent = word.slice(0, i);
      let wait = del ? 38 : 75;
      if (del && i === 0) { del = false; w = (w + 1) % words.length; wait = 350; }
      else if (!del && i === words[w].length) { del = true; wait = 1900; }
      else i += del ? -1 : 1;
      setTimeout(tick, wait);
    };
    setTimeout(tick, 2200);
  }

  /* ---------- Vệt sáng theo chuột, viền sáng và nghiêng 3D trên thẻ ---------- */
  if (finePointer && !reduce) {
    addEventListener('pointermove', e => {
      root.style.setProperty('--mx', e.clientX + 'px');
      root.style.setProperty('--my', e.clientY + 'px');
    }, { passive: true });

    $$('.glow').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--px', e.clientX - r.left + 'px');
        card.style.setProperty('--py', e.clientY - r.top + 'px');
      });
    });

    $$('.project').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        card.classList.add('tilting');
        card.style.setProperty('--rx', (-y * 9).toFixed(2) + 'deg');
        card.style.setProperty('--ry', (x * 11).toFixed(2) + 'deg');
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('tilting');
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });

    // Nút chính hơi hút theo con trỏ
    $$('.magnet').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        btn.style.translate = `${(e.clientX - r.left - r.width / 2) * .18}px ${(e.clientY - r.top - r.height / 2) * .3}px`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.translate = ''; });
    });
  }

  /* ---------- Sao chép email ---------- */
  const toast = $('.toast');
  let toastTimer;
  $$('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    const text = btn.dataset.copy;
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    toast.querySelector('span').textContent = btn.dataset.done;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }));

  /* ---------- Mạng điểm nối nhau ở nền phần mở đầu ---------- */
  const canvas = $('.net');
  const hero = $('.hero');
  if (canvas && hero) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, pts = [], running = false, raf = 0;
    const mouse = { x: -1e4, y: -1e4 };
    const LINK = 140;

    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = hero.clientWidth; H = hero.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(95, Math.round(W * H / 15000));
      pts = Array.from({ length: n }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
        r: Math.random() * 1.4 + .6,
      }));
      if (reduce) draw();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (!reduce) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > W) p.vx *= -1;
          if (p.y < 0 || p.y > H) p.vy *= -1;
        }
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j], dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(129, 140, 248, ${(1 - d / LINK) * .22})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        const md = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (md < 190) {
          ctx.strokeStyle = `rgba(34, 211, 238, ${(1 - md / 190) * .55})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
        ctx.fillStyle = md < 190 ? 'rgba(103, 232, 249, .95)' : 'rgba(148, 163, 184, .55)';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
    }

    const loop = () => { draw(); raf = requestAnimationFrame(loop); };
    const start = () => { if (!running && !reduce) { running = true; loop(); } };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(hero);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1e4; });
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 150); });
    size();
  }
})();
