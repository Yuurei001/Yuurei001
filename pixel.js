// Pixel art cho trang CV: trời sao, dải phong cảnh có nhân vật biết nói, biểu tượng pixel, bãi cỏ chân trang.
// Hình vẽ khai báo trong sprites.js (window.PX). Tắt JS thì các phần này ẩn đi, trang vẫn đủ nội dung.
(() => {
  const PX = window.PX;
  if (!PX) return;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pal = PX.pal;
  const now = () => performance.now();
  // Một điểm ảnh to bao nhiêu px màn hình
  const scale = () => (innerWidth >= 1100 ? 4 : 3);

  /* ---------- Công cụ vẽ ---------- */
  // Số ngẫu nhiên có hạt giống: cảnh giữ nguyên bố cục mỗi lần vẽ lại
  const seeded = seed => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Số giả ngẫu nhiên từ hai số nguyên, dùng cho đèn nhấp nháy
  const hash = (a, b) => {
    let h = Math.imul(a + 1, 374761393) ^ Math.imul(b + 1, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // Vẽ hình lưới ký tự tại (x, y); flip = lật ngang
  function blit(ctx, rows, x, y, colors = pal, flip = false) {
    const w = rows[0].length;
    rows.forEach((row, j) => {
      for (let i = 0; i < w; i++) {
        const c = colors[row[i]];
        if (!c) continue;
        ctx.fillStyle = c;
        ctx.fillRect(x + (flip ? w - 1 - i : i), y + j, 1, 1);
      }
    });
  }
  // Một điểm sáng có quầng hình chữ thập
  function dot(ctx, x, y, color, a = 1) {
    ctx.fillStyle = color;
    ctx.globalAlpha = a * .32;
    ctx.fillRect(x - 1, y, 3, 1);
    ctx.fillRect(x, y - 1, 1, 3);
    ctx.globalAlpha = a;
    ctx.fillRect(x, y, 1, 1);
    ctx.globalAlpha = 1;
  }
  // Đường thẳng pixel (Bresenham); dash = 2 thì vẽ cách một điểm
  function line(ctx, x0, y0, x1, y1, dash = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    for (;;) {
      if (n++ % dash === 0) ctx.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  // Các điểm trên đoạn thẳng, bỏ điểm đầu (dùng để nối dây cáp)
  function trace(x0, y0, x1, y1, out) {
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    while (x0 !== x1 || y0 !== y1) {
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
      out.push([x0, y0]);
    }
  }
  // Hình tròn đặc theo lưới pixel, dùng màu fillStyle hiện tại
  function disc(ctx, cx, cy, r) {
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy));
      ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
    }
  }
  // Gọi draw(t) mỗi khung hình khi el còn trên màn hình và tab đang mở
  function run(el, draw) {
    if (reduce) return;
    let raf = 0, on = false, vis = false;
    const tick = t => { draw(t); raf = requestAnimationFrame(tick); };
    const sync = () => {
      const want = vis && !document.hidden;
      if (want === on) return;
      on = want;
      if (on) raf = requestAnimationFrame(tick); else cancelAnimationFrame(raf);
    };
    new IntersectionObserver(([e]) => { vis = e.isIntersecting; sync(); }).observe(el);
    document.addEventListener('visibilitychange', sync);
  }

  /* ---------- Nổ pixel: các vòng tròn đồng tâm lan ra kèm tia vuông ---------- */
  // Vẽ trên một lớp canvas phủ màn hình, độ phân giải bằng 1/3 để giữ nét pixel
  const BS = 3;
  const BURST = ['#22d3ee', '#a5f3fc', '#6366f1', '#a855f7', '#fde68a'];
  const fx = document.createElement('canvas');
  fx.className = 'fx';
  fx.setAttribute('aria-hidden', 'true');
  document.body.append(fx);
  const fctx = fx.getContext('2d');
  const blasts = [];
  let fxRaf = 0;
  const sizeFx = () => {
    fx.width = Math.ceil(innerWidth / BS);
    fx.height = Math.ceil(innerHeight / BS);
    fx.style.width = fx.width * BS + 'px';
    fx.style.height = fx.height * BS + 'px';
  };
  // Vòng tròn rỗng một điểm ảnh (thuật toán điểm giữa)
  function ring(ctx, cx, cy, r) {
    let x = r, y = 0, e = 1 - r;
    while (x >= y) {
      for (const [a, b] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) ctx.fillRect(cx + a, cy + b, 1, 1);
      y++;
      if (e < 0) e += 2 * y + 1; else { x--; e += 2 * (y - x) + 1; }
    }
  }
  // x, y theo px màn hình; size 1 = cỡ thường
  function burst(x, y, size = 1, colors = BURST) {
    if (reduce) return;
    const n = Math.round(12 * size);
    blasts.push({
      x: x / BS | 0, y: y / BS | 0, t0: now(), size, colors,
      bits: Array.from({ length: n }, (_, i) => ({
        a: i / n * Math.PI * 2 + Math.random() * .4,
        v: (14 + Math.random() * 14) * size,
        c: colors[i % colors.length],
      })),
    });
    if (!fxRaf) fxRaf = requestAnimationFrame(drawFx);
  }
  function drawFx(t) {
    fctx.clearRect(0, 0, fx.width, fx.height);
    for (let i = blasts.length - 1; i >= 0; i--) {
      const b = blasts[i], k = (t - b.t0) / (650 + 250 * b.size);
      if (k >= 1) { blasts.splice(i, 1); continue; }
      // Ba vòng nối đuôi nhau, vòng sau trễ hơn vòng trước
      for (let j = 0; j < 3; j++) {
        const kk = k * 1.35 - j * .17;
        if (kk <= 0 || kk >= 1) continue;
        const e = 1 - Math.pow(1 - kk, 3);
        fctx.globalAlpha = (1 - kk) * (j ? .7 : 1);
        fctx.fillStyle = b.colors[j % b.colors.length];
        ring(fctx, b.x, b.y, Math.max(1, Math.round((3 + j * 2 + 20 * e) * b.size)));
      }
      // Tia vuông bay ra rồi rơi nhẹ
      const e = 1 - Math.pow(1 - k, 2);
      fctx.globalAlpha = 1 - k;
      for (const p of b.bits) {
        fctx.fillStyle = p.c;
        const px = Math.round(b.x + Math.cos(p.a) * p.v * e);
        const py = Math.round(b.y + Math.sin(p.a) * p.v * e + 10 * k * k);
        const sz = k < .5 ? 2 : 1;
        fctx.fillRect(px, py, sz, sz);
      }
      // Lóe sáng ở tâm lúc đầu
      if (k < .15) { fctx.globalAlpha = 1; fctx.fillStyle = '#fff'; fctx.fillRect(b.x - 1, b.y - 1, 3, 3); }
    }
    fctx.globalAlpha = 1;
    fxRaf = blasts.length ? requestAnimationFrame(drawFx) : 0;
  }
  const centerOf = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  if (!reduce) {
    sizeFx();
    addEventListener('resize', sizeFx);
    // Bấm ở đâu nổ ở đó; nút, liên kết và nhân vật thì nổ to hơn từ giữa
    document.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      const el = e.target.closest?.('a, button');
      if (el) burst(...centerOf(el), 1.3);
      else burst(e.clientX, e.clientY, .8);
    });
    // Bấm bằng bàn phím (Enter/Space) không có tọa độ chuột
    document.addEventListener('click', e => {
      const el = e.target.closest?.('a, button');
      if (e.detail === 0 && el) burst(...centerOf(el), 1.3);
    });
  }

  /* ---------- Khối vuông gom lại thành hình ---------- */
  // Mỗi điểm ảnh của hình là một khối bay từ vị trí ngẫu nhiên về đúng chỗ; gom xong thì nổ vòng tròn.
  // Rê chuột vào thì các khối gần con trỏ dạt ra rồi tự quay về.
  function mosaic(cv, rows, opt = {}) {
    const ctx = cv.getContext('2d');
    const cols = rows[0].length, rowsN = rows.length;
    const cells = [];
    rows.forEach((row, j) => [...row].forEach((ch, i) => {
      if (pal[ch]) cells.push({ i, j, ch, c: pal[ch], dx: 0, dy: 0 });
    }));
    let u = 1, W = 0, H = 0, t0 = 0, raf = 0, done = false, active = false, mouse = null;
    const dur = opt.dur || 1500;

    function size() {
      const r = cv.getBoundingClientRect();
      if (!r.width) return;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = Math.round(r.width * dpr); H = Math.round(r.height * dpr);
      cv.width = W; cv.height = H;
      u = Math.max(1, Math.floor(Math.min(W / cols, H / rowsN)));
      const ox = (W - u * cols) / 2 | 0, oy = (H - u * rowsN) / 2 | 0;
      const rnd = seeded(cols * 7 + cells.length);
      for (const c of cells) {
        c.x = ox + c.i * u; c.y = oy + c.j * u;
        // Điểm xuất phát rải trên một vòng rộng quanh hình (inside: rải ngay trong khung)
        const a = rnd() * Math.PI * 2, rr = (.55 + rnd() * .7) * Math.max(W, H);
        c.sx = opt.inside ? rnd() * W : W / 2 + Math.cos(a) * rr;
        c.sy = opt.inside ? rnd() * H : H / 2 + Math.sin(a) * rr;
        // Khối gần tâm về trước, khối ở viền về sau
        c.d = Math.hypot(c.i + .5 - cols / 2, c.j + .5 - rowsN / 2) / (cols * .7) * .45 + rnd() * .2;
      }
      if (active && (reduce || done)) draw(now());
    }

    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      const k = reduce ? 1 : Math.min(1, (t - t0) / dur);
      let moving = !done;
      for (const c of cells) {
        let x = c.x, y = c.y;
        if (!done) {
          const kk = Math.min(1, Math.max(0, (k - c.d * .6) / .55));
          const e = 1 - Math.pow(1 - kk, 3);
          x = c.sx + (c.x - c.sx) * e; y = c.sy + (c.y - c.sy) * e;
          ctx.globalAlpha = Math.min(1, kk * 3);
        }
        // Đẩy khối ra xa con trỏ, lò xo kéo về chỗ cũ
        let tx = 0, ty = 0;
        if (mouse) {
          const ddx = x + u / 2 - mouse.x, ddy = y + u / 2 - mouse.y, d = Math.hypot(ddx, ddy), R = u * 7;
          if (d < R && d > 0) { const f = (1 - d / R) * u * 3.2; tx = ddx / d * f; ty = ddy / d * f; }
        }
        c.dx += (tx - c.dx) * .18; c.dy += (ty - c.dy) * .18;
        if (Math.abs(c.dx - tx) + Math.abs(c.dy - ty) > .3) moving = true;
        ctx.fillStyle = c.c;
        ctx.fillRect(Math.round(x + c.dx), Math.round(y + c.dy), u, u);
      }
      ctx.globalAlpha = 1;
      if (!done && k >= 1) {
        done = true;
        cv.classList.add('built');
        opt.onDone?.();
      }
      return moving;
    }

    const loop = t => { raf = draw(t) ? requestAnimationFrame(loop) : 0; };
    const kick = () => { if (!raf && !reduce && active) raf = requestAnimationFrame(loop); };

    if (!reduce) {
      const host = opt.host || cv;
      host.addEventListener('pointermove', e => {
        if (!done) return;
        const r = cv.getBoundingClientRect(), s = W / r.width;
        mouse = { x: (e.clientX - r.left) * s, y: (e.clientY - r.top) * s };
        kick();
      });
      host.addEventListener('pointerleave', () => { mouse = null; kick(); });
    }
    return {
      size,
      start() {
        if (active) return;
        active = true;
        size();
        t0 = now();
        if (reduce) { done = true; draw(t0); cv.classList.add('built'); } else kick();
      },
      // Vị trí từng khối trên màn hình (px CSS), để guide.js cho các khối bay đi
      screenCells() {
        if (!W) size();
        const r = cv.getBoundingClientRect(), k = r.width / (W || 1);
        return cells.map(c => ({ x: r.left + c.x * k, y: r.top + c.y * k, s: u * k, ch: c.ch, c: c.c }));
      },
      replay() {
        if (reduce || !done) return;
        done = false;
        cv.classList.remove('built');
        t0 = now();
        kick();
      },
    };
  }

  const mosaics = [];
  let portraitMosaic = null;

  // Chân dung đầu trang: dùng khi chưa có ảnh thật avatar.jpg; bấm đúp để gom lại lần nữa
  const photo = $('.photo');
  if (photo && PX.art?.portrait) {
    const img = photo.querySelector('img');
    const go = () => {
      if (img?.isConnected && img.naturalWidth) return;
      const cv = document.createElement('canvas');
      cv.className = 'px-portrait';
      cv.setAttribute('aria-hidden', 'true');
      photo.append(cv);
      photo.classList.add('px-on');
      const m = mosaic(cv, PX.art.portrait, {
        host: $('.portrait'), dur: 1900,
        onDone: () => burst(...centerOf(photo), 2.2),
      });
      portraitMosaic = m;
      mosaics.push(m);
      setTimeout(m.start, 450);
      $('.portrait').addEventListener('dblclick', () => m.replay());
    };
    if (img && !img.complete) {
      img.addEventListener('load', go);
      img.addEventListener('error', () => setTimeout(go));
    } else go();
  }

  // Huy hiệu ở phần Học vấn: gom lại khi cuộn tới
  $$('.badge-art').forEach(cv => {
    const rows = PX.art?.[cv.dataset.art];
    if (!rows) return;
    const m = mosaic(cv, rows, {
      host: cv.closest('.award') || cv, dur: 1300,
      onDone: () => burst(...centerOf(cv), 1.2),
    });
    mosaics.push(m);
    new IntersectionObserver(([e], ob) => {
      if (!e.isIntersecting) return;
      ob.disconnect();
      setTimeout(m.start, +(cv.dataset.delay || 0));
    }, { threshold: .5 }).observe(cv);
  });

  // Chia sẻ cho guide.js
  window.PXFX = { burst, mosaic, blit, centerOf, get portrait() { return portraitMosaic; } };

  /* ---------- Thanh kỹ năng: ô cuối sáng lên thì nổ một vòng nhỏ như lúc lên cấp ---------- */
  $$('.lvl').forEach(card => {
    const ons = $$('.lvl-bar i.on', card);
    const last = ons[ons.length - 1];
    if (!last) return;
    new IntersectionObserver(([e], ob) => {
      if (!e.isIntersecting) return;
      ob.disconnect();
      // Khớp với pixel.css: ô thứ i sáng sau .4s + i * .16s, cộng độ trễ hiện dần của thẻ
      const delay = 400 + (ons.length - 1) * 160 + (parseFloat(card.style.getPropertyValue('--d')) || 0) * 1000 + 250;
      setTimeout(() => burst(...centerOf(last), .9), delay);
    }, { threshold: .6 }).observe(card);
  });

  /* ---------- Biểu tượng pixel thay cho biểu tượng nét mảnh ---------- */
  const iconURLs = {};
  function iconURL(key) {
    const rows = PX.icons[key];
    if (!rows) return null;
    if (!iconURLs[key]) {
      const c = document.createElement('canvas');
      c.width = rows[0].length; c.height = rows.length;
      blit(c.getContext('2d'), rows, 0, 0);
      iconURLs[key] = c.toDataURL();
    }
    return iconURLs[key];
  }
  // data-px chọn hình riêng; không có thì lấy theo tên biểu tượng SVG (#i-db -> db)
  $$('[data-px], .ic-box, .tl-dot, .node-ic, .v-node, .fact').forEach(box => {
    const svg = box.querySelector(':scope > .icon');
    const key = box.dataset.px || svg?.querySelector('use')?.getAttribute('href').replace('#i-', '');
    const url = key && iconURL(key);
    if (!url) return;
    const img = new Image();
    img.className = 'px-ic';
    img.alt = '';
    img.src = url;
    if (svg) svg.after(img); else box.prepend(img);
    box.classList.add('px-on');
  });

  /* ---------- Dải phong cảnh: xưởng, cột điện, máy chủ, gói dữ liệu chạy trên dây ---------- */
  const hero = $('.hero');
  const land = $('.land');
  let buildLand = null;
  if (land) {
    const cv = $(':scope > canvas', land);
    const ctx = cv.getContext('2d');
    const base = document.createElement('canvas');
    const npcBtn = $('.npc', land);
    const nctx = $('canvas', npcBtn).getContext('2d');
    const LH = 60;   // chiều cao cảnh (điểm ảnh)
    const G = 45;    // mặt cỏ phía sau: nhà, cột, cây đứng ở đây
    const FEET = 54; // hàng chân nhân vật (phía trước)
    const C = {
      halo: '#fef9c3', moon: '#fdf6c8', moonDk: '#e3d9a0',
      far: '#0c1930', farRim: '#1a2d52', near: '#0e2135', nearRim: '#1b3a50',
      grass: '#10301f', grassTop: '#1f5a3a', grassDk: '#0b2417',
      wood: '#4a3426', woodDk: '#2e2019', woodHi: '#6b4f3a',
      roof: '#3a2a5e', roofDk: '#2a1f47', roofHi: '#5b4a8f',
      metal: '#334155', metalDk: '#1e293b', metalHi: '#64748b', slot: '#0b1220',
      lamp: '#fde68a', cable: '#2a4a70',
    };
    const TREE = { a: '#12352a', b: '#1d4e3c', n: '#2b1d16' };
    const FAR = { a: '#0a1729', b: '#0a1729', n: '#0a1729' };
    const FLOWERS = ['#f472b6', '#fde68a', '#c4b5fd', '#67e8f9'];
    let S = 0, W = 0, sc = null;
    const npc = { x: -1, dir: 1, target: 0, wait: 0, last: 0, hold: false, talked: false, key: '' };

    // Vẽ phần đứng yên của cảnh vào canvas phụ, trả về vị trí các phần chuyển động
    function paint(b) {
      const rnd = seeded(5);
      const px = (x, y, c, w = 1, h = 1) => { b.fillStyle = c; b.fillRect(x, y, w, h); };
      b.clearRect(0, 0, W, LH);

      // Bố cục: nhà xưởng bên trái, máy chủ bên phải, cột điện chia đều ở giữa
      const hx = Math.max(3, Math.round(W * .1));
      const sx = Math.min(W - 18, Math.round(W * .8));
      const n = W < 150 ? 1 : 2;
      const poles = Array.from({ length: n }, (_, k) => Math.round(hx + 32 + (sx - hx - 32) * (k + 1) / (n + 1)));
      const used = [[hx - 3, hx + 33], [sx - 3, sx + 18], ...poles.map(p => [p - 5, p + 6])];
      const free = (a, z) => used.every(([u, v]) => z < u || a > v);

      // Trăng và quầng sáng, giữa nhà xưởng và cột điện đầu tiên
      const mx = Math.round((hx + 33 + poles[0]) / 2), my = W < 200 ? 15 : 19;
      b.fillStyle = C.halo;
      b.globalAlpha = .035; disc(b, mx, my, 17);
      b.globalAlpha = .05; disc(b, mx, my, 12);
      b.globalAlpha = 1;
      b.fillStyle = C.moon; disc(b, mx, my, 7);
      px(mx - 3, my - 2, C.moonDk, 2, 2); px(mx + 2, my + 1, C.moonDk, 2, 1); px(mx - 1, my + 3, C.moonDk);

      // Đồi xa, tháp phát sóng, đồi gần có rặng thông
      const fy = x => 31 + Math.round(3 * Math.sin(x * .031 + 1) + 2 * Math.sin(x * .087 + 3));
      const ny = x => 38 + Math.round(2.4 * Math.sin(x * .047 + 2) + 1.4 * Math.sin(x * .13 + .5));
      for (let x = 0; x < W; x++) { const y = fy(x); px(x, y, C.farRim); px(x, y + 1, C.far, 1, G - y); }
      const tx = Math.round((poles[n - 1] + sx) / 2), ty = fy(tx) - 15;
      for (let j = 0; j < 15; j++) {
        const half = j >> 2;
        px(tx - half, ty + j, C.farRim); px(tx + half, ty + j, C.farRim);
        if (j % 4 === 3) px(tx - half, ty + j, C.farRim, half * 2 + 1, 1);
      }
      px(tx, ty - 2, C.farRim, 1, 2);
      for (let x = 0; x < W; x++) { const y = ny(x); px(x, y, C.nearRim); px(x, y + 1, C.near, 1, G - y); }
      for (let x = 1; x < W - 4; x += 5 + (rnd() * 9 | 0)) blit(b, PX.pine, x, ny(x + 3) - 10, FAR);

      // Bãi cỏ, mờ dần xuống dưới theo ô bàn cờ (Bayer) để nối liền với nền trang
      px(0, G, C.grassTop, W, 1);
      px(0, G + 1, C.grass, W, 9);
      for (let i = 0; i < W * 3; i++) px(rnd() * W | 0, G + 1 + (rnd() * 9 | 0), C.grassDk);
      const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      for (let r = 0; r < 5; r++) for (let x = 0; x < W; x++) {
        if (bayer[(r % 4) * 4 + (x % 4)] < 16 * (1 - (r + 1) / 6)) px(x, G + 10 + r, C.grass);
      }
      for (let x = 0; x < W; x++) {
        if (rnd() < .35) px(x, G - 1, C.grassTop);
        if (rnd() < .1) px(x, G - 2, C.grassTop);
      }

      // Cây thông
      for (const f of [.015, .045, .3, .36, .5, .7, .9, .935, .975]) {
        const spr = rnd() < .5 ? PX.pineBig : PX.pine, w = spr[0].length;
        const x = Math.round(W * f - w / 2);
        if (x < -2 || x + w > W + 2 || !free(x - 1, x + w)) continue;
        used.push([x, x + w - 1]);
        blit(b, spr, x, G + 1 - spr.length, TREE);
      }

      // Nhà xưởng: tường gỗ, mái tím, cửa sổ đèn vàng, cửa sổ màn hình, ăng-ten
      const top = G - 13;
      px(hx, top, C.wood, 30, 14);
      for (let y = top + 2; y <= G; y += 3) px(hx, y, C.woodDk, 30, 1);
      px(hx, top, C.woodDk, 1, 14); px(hx + 29, top, C.woodDk, 1, 14);
      for (let j = 0; j < 9; j++) {
        const l = hx - 2 + (8 - j), w = 34 - 2 * (8 - j), y = top - 9 + j;
        px(l, y, j === 0 ? C.roofHi : j === 8 ? C.roofDk : C.roof, w, 1);
        if (j % 2) for (let k = l + (j % 4 === 1 ? 1 : 3); k < l + w - 1; k += 4) px(k, y, C.roofDk);
        px(l + w - 1, y, C.roofHi);
      }
      b.globalAlpha = .1; px(hx + 2, G + 1, C.lamp, 11, 2); b.globalAlpha = 1;
      px(hx + 4, top + 3, C.woodDk, 7, 6); px(hx + 5, top + 4, C.lamp, 5, 4); px(hx + 5, top + 4, '#fef3c7', 2, 1);
      px(hx + 7, top + 4, C.woodDk, 1, 4); px(hx + 5, top + 6, C.woodDk, 5, 1);
      px(hx + 19, top + 3, C.metalDk, 7, 6); px(hx + 20, top + 4, '#0c4a5c', 5, 4);
      px(hx + 21, top + 5, '#67e8f9', 3, 1); px(hx + 21, top + 7, '#22d3ee', 2, 1);
      px(hx + 12, G - 8, C.woodDk, 5, 9); px(hx + 13, G - 7, '#3a281d', 3, 8); px(hx + 15, G - 4, C.lamp);
      px(hx + 21, top - 15, C.metalHi, 1, 6);
      px(hx + 18, top - 14, C.metalHi, 7, 1); px(hx + 19, top - 12, C.metalHi, 5, 1);
      px(hx + 30, G - 12, C.metal, 2, 2);

      // Hàng rào
      const fence = (a, z) => {
        for (let x = a; x <= z; x++) {
          if ((x - a) % 4 === 0) { px(x, G - 5, C.woodHi); px(x, G - 4, C.wood, 1, 5); }
          else { px(x, G - 4, C.wood); px(x, G - 2, C.wood); }
        }
      };
      fence(hx + 34, poles[0] - 5);
      if (sx + 40 < W && free(sx + 19, sx + 40)) fence(sx + 20, sx + 40);

      // Cột điện gỗ có sứ cách điện
      poles.forEach(p => {
        px(p, G - 30, C.woodHi, 1, 31); px(p + 1, G - 30, C.woodDk, 1, 31);
        px(p - 4, G - 28, C.wood, 10, 1);
        px(p - 3, G - 29, '#22d3ee'); px(p + 4, G - 29, '#22d3ee');
      });

      // Tủ máy chủ SQL
      const st = G - 24;
      b.globalAlpha = .18; px(sx - 3, G + 1, '#22d3ee', 21, 1); b.globalAlpha = 1;
      px(sx, st, C.metalHi, 15, 1);
      px(sx, st + 1, C.metal, 15, 24);
      px(sx, st + 1, C.metalHi, 1, 24); px(sx + 14, st + 1, C.metalDk, 1, 24);
      px(sx + 1, st + 2, C.slot, 13, 7);
      [...'SQL'].forEach((ch, i) => PX.font[ch].forEach((row, j) => {
        [...row].forEach((v, k) => { if (v === '#') px(sx + 2 + i * 4 + k, st + 3 + j, '#67e8f9'); });
      }));
      const leds = [];
      for (let u = 0; u < 5; u++) {
        const y = st + 10 + u * 3;
        px(sx + 2, y, C.slot, 11, 2); px(sx + 3, y, C.metalDk, 5, 1);
        leds.push([sx + 10, y], [sx + 12, y]);
      }
      px(sx - 1, st + 3, C.metalHi, 1, 3);

      // Dây cáp: nhà -> các cột -> máy chủ, võng xuống giữa hai điểm treo
      const anchors = [[hx + 32, G - 12]];
      poles.forEach(p => anchors.push([p - 3, G - 30], [p + 4, G - 30]));
      anchors.push([sx - 1, st + 4]);
      const path = [anchors[0]];
      for (let i = 0; i < anchors.length - 1; i++) {
        const [x0, y0] = anchors[i], [x1, y1] = anchors[i + 1];
        const sag = i % 2 ? 0 : Math.max(2, Math.round(Math.abs(x1 - x0) * .07));
        const steps = Math.max(1, Math.abs(x1 - x0));
        let lx = x0, ly = y0;
        for (let k = 1; k <= steps; k++) {
          const t = k / steps;
          const x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t + sag * 4 * t * (1 - t));
          trace(lx, ly, x, y, path);
          lx = x; ly = y;
        }
      }
      path.forEach(([x, y]) => px(x, y, C.cable));

      // Hoa và ngọn cỏ ở phía trước
      for (let x = 1; x < W - 1; x++) {
        const r = rnd();
        if (r < .045) {
          const y = G + 3 + (rnd() * 6 | 0);
          px(x, y + 1, C.grassTop); px(x, y, FLOWERS[rnd() * FLOWERS.length | 0]);
        } else if (r < .2) px(x, G + 2 + (rnd() * 7 | 0), C.grassTop, 1, 1 + (rnd() * 2 | 0));
      }

      // Đom đóm, cũng là những bit dữ liệu lơ lửng
      const flies = Array.from({ length: Math.max(6, Math.min(22, W / 16 | 0)) }, () => ({
        x: rnd() * W, y: 22 + rnd() * 21, ph: rnd() * 6.3, c: rnd() < .3 ? '#67e8f9' : '#d9f99d',
      }));

      return { path, leds, flies, ant: [hx + 21, top - 16], tower: [tx, ty - 3], door: hx + 34 };
    }

    // Vẽ một khung hình: nền tĩnh + đèn nhấp nháy + gói dữ liệu + đom đóm + nhân vật
    function frame(t) {
      ctx.clearRect(0, 0, W, LH);
      ctx.drawImage(base, 0, 0);
      if (t % 2000 < 900) dot(ctx, sc.tower[0], sc.tower[1], '#f43f5e', .9);
      if ((t + 600) % 1600 < 450) dot(ctx, sc.ant[0], sc.ant[1], '#f43f5e');

      const path = sc.path, L = path.length;
      let flash = false;
      for (let i = 0; i < 3; i++) {
        const pos = (t * .04 + i * (L + 30) / 3) % (L + 30);
        if (pos >= L) { flash ||= pos < L + 8; continue; }
        const k = pos | 0;
        ctx.fillStyle = '#22d3ee';
        for (let j = 1; j <= 3 && k - j >= 0; j++) {
          ctx.globalAlpha = .55 - j * .15;
          ctx.fillRect(path[k - j][0], path[k - j][1], 1, 1);
        }
        ctx.globalAlpha = 1;
        dot(ctx, path[k][0], path[k][1], '#cffafe');
      }
      sc.leds.forEach(([x, y], n) => {
        if (!flash && hash(n, t / (170 + n * 23) | 0) < .4) return;
        ctx.fillStyle = flash ? '#a5f3fc' : n % 2 ? '#34d399' : '#22d3ee';
        ctx.fillRect(x, y, 1, 1);
      });

      for (const f of sc.flies) {
        const a = Math.sin(t * .0016 + f.ph);
        if (a > 0) dot(ctx, Math.round(f.x + Math.sin(t * .0007 + f.ph) * 6), Math.round(f.y + Math.sin(t * .0011 + f.ph * 1.7) * 3), f.c, a);
      }
      moveNpc(t);
    }

    // Nhân vật đi qua lại trên cỏ, thỉnh thoảng đứng nghỉ; dừng lại khi được trỏ chuột hoặc đang nói chuyện
    function moveNpc(t) {
      const dt = Math.min(50, t - (npc.last || t));
      npc.last = t;
      let walking = false;
      if (!reduce && !npc.hold && t > npc.wait) {
        const d = npc.target - npc.x;
        if (Math.abs(d) < 1) {
          npc.wait = t + 1400 + Math.random() * 2800;
          npc.target = 4 + Math.random() * (W - 18);
        } else {
          npc.dir = Math.sign(d);
          npc.x += npc.dir * Math.min(Math.abs(d), dt * .014);
          walking = true;
        }
      }
      const step = walking ? (t / 150 | 0) % 2 : 0;
      const bubble = !npc.talked && (reduce || t % 5200 < 3400);
      const bob = reduce ? 0 : (t / 450 | 0) % 2;
      const key = `${step}${bubble}${bob}${npc.dir}`;
      if (key !== npc.key) {
        npc.key = key;
        nctx.clearRect(0, 0, 10, 26);
        if (bubble) blit(nctx, PX.bubble, 2, bob);
        blit(nctx, step ? PX.hero.stand.slice(0, 12).concat(PX.hero.legs) : PX.hero.stand, 0, 10, pal, npc.dir < 0);
      }
      npcBtn.style.transform = `translateX(${Math.round(npc.x) * S}px)`;
    }

    buildLand = () => {
      const s = scale(), w = Math.ceil(land.clientWidth / s);
      if (s === S && w === W) return;
      S = s; W = w;
      land.style.height = LH * S + 'px';
      cv.width = base.width = W;
      cv.height = base.height = LH;
      cv.style.width = W * S + 'px';
      cv.style.height = LH * S + 'px';
      npcBtn.style.width = 10 * S + 'px';
      npcBtn.style.height = 26 * S + 'px';
      npcBtn.style.bottom = (LH - FEET) * S + 'px';
      sc = paint(base.getContext('2d'));
      if (npc.x < 0) { npc.x = npc.target = reduce ? sc.door : Math.round(W * .36); npc.wait = now() + 1500; }
      npc.x = Math.min(npc.x, W - 14);
      npc.target = Math.min(npc.target, W - 14);
      npc.key = '';
      frame(now());
    };
    run(land, frame);
    const hold = on => () => { npc.hold = on || (!!dlg && !dlg.hidden); };
    npcBtn.addEventListener('pointerenter', hold(true));
    npcBtn.addEventListener('pointerleave', hold(false));
    npcBtn.addEventListener('focus', hold(true));
    npcBtn.addEventListener('blur', hold(false));

    /* ----- Hộp thoại kiểu Stardew: chữ chạy từng ký tự, bấm để đọc tiếp ----- */
    const dlg = $('.dlg');
    if (dlg) {
      const box = $('.dlg-box', dlg);
      const out = $('.dlg-text', dlg);
      const live = $('.dlg-live', dlg);
      const acts = $('.dlg-actions', dlg);
      const hint = $('.dlg-hint', dlg);
      const fctx = $('.dlg-face canvas', dlg).getContext('2d');
      const lines = $$('.dlg-lines li', dlg).map(li => li.textContent.trim());
      let at = 0, shown = 0, typing = false, timer = 0, faceTimer = 0, hideTimer = 0, fc = 0;

      const drawFace = () => {
        fc++;
        const talk = typing && fc % 2, blink = fc % 30 === 0;
        const rows = PX.face.map((r, i) => (blink && PX.faceBlink[i]) || (talk && PX.faceTalk[i]) || r);
        fctx.clearRect(0, 0, 16, 16);
        blit(fctx, rows, 0, 0);
      };
      const done = () => {
        typing = false;
        const last = at === lines.length - 1;
        acts.hidden = !last;
        hint.hidden = last;
      };
      const type = () => {
        const text = lines[at];
        out.textContent = text.slice(0, ++shown);
        if (shown >= text.length) return done();
        timer = setTimeout(type, /[,.!?]/.test(text[shown - 1]) ? 150 : 24);
      };
      const say = () => {
        live.textContent = lines[at];
        acts.hidden = hint.hidden = true;
        if (reduce) { out.textContent = lines[at]; return done(); }
        typing = true;
        shown = 0;
        type();
      };
      const next = () => {
        if (typing) { clearTimeout(timer); out.textContent = lines[at]; done(); }
        else if (at < lines.length - 1) { at++; say(); }
        else close();
      };
      const open = () => {
        if (dlg.classList.contains('show')) return;
        clearTimeout(hideTimer);
        npc.talked = npc.hold = true;
        npcBtn.setAttribute('aria-expanded', 'true');
        dlg.hidden = false;
        void dlg.offsetWidth; // để hiệu ứng hiện ra chạy từ trạng thái ẩn
        dlg.classList.add('show');
        at = 0;
        say();
        drawFace();
        if (!reduce) faceTimer = setInterval(drawFace, 110);
        box.focus({ preventScroll: true });
        if (reduce) frame(now());
      };
      function close(refocus = true) {
        clearTimeout(timer);
        clearInterval(faceTimer);
        typing = false;
        npc.hold = false;
        npcBtn.setAttribute('aria-expanded', 'false');
        dlg.classList.remove('show');
        hideTimer = setTimeout(() => { dlg.hidden = true; }, reduce ? 0 : 260);
        if (refocus) npcBtn.focus({ preventScroll: true });
      }

      npcBtn.addEventListener('click', open);
      box.addEventListener('click', e => { if (!e.target.closest('a, button')) next(); });
      dlg.addEventListener('keydown', e => {
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('a, button')) { e.preventDefault(); next(); }
      });
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && dlg.classList.contains('show')) close(); });
      // Cuộn khỏi cảnh thì hộp thoại tự đóng
      new IntersectionObserver(([e]) => {
        if (!e.isIntersecting && dlg.classList.contains('show')) close(false);
      }).observe(land);
      $('.dlg-x', dlg).addEventListener('click', () => close());
      $$('a', acts).forEach(a => a.addEventListener('click', () => close(false)));
    }
  }

  /* ---------- Trời sao pixel: gần con trỏ thì các sao nối thành mạng ---------- */
  const sky = $('.sky');
  let sizeSky = null;
  if (hero && sky) {
    const SK = 3;
    const ctx = sky.getContext('2d');
    const COLORS = ['#e2e8f0', '#e2e8f0', '#cbd5e1', '#a5f3fc', '#c4b5fd', '#fde68a'];
    let w = 0, h = 0, stars = [], mouse = null, shoot = null, nextShoot = 0;

    sizeSky = () => {
      const top = hero.getBoundingClientRect().top;
      const bottom = land ? land.getBoundingClientRect().bottom - top : hero.clientHeight;
      w = Math.ceil(hero.clientWidth / SK);
      h = Math.ceil(bottom / SK);
      sky.width = w;
      sky.height = h;
      sky.style.width = w * SK + 'px';
      sky.style.height = h * SK + 'px';
      const rnd = seeded(11);
      stars = Array.from({ length: Math.min(190, Math.round(w * h / 280)) }, () => {
        const r = rnd();
        return {
          x: rnd() * w | 0, y: rnd() * h * .8 | 0,
          kind: r < .06 ? 2 : r < .3 ? 1 : 0,
          color: COLORS[rnd() * COLORS.length | 0],
          ph: rnd() * 6.3, sp: .0006 + rnd() * .0018,
        };
      });
      draw(now());
    };

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        const tw = Math.sin(t * s.sp + s.ph);
        const a = s.kind === 0 ? .3 + tw * .12 : s.kind === 1 ? .62 + tw * .3 : .55 + tw * .45;
        ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x, s.y, 1, 1);
        if (s.kind === 2 && tw > .2) {
          ctx.globalAlpha = (tw - .2) * .6;
          ctx.fillRect(s.x - 1, s.y, 3, 1);
          ctx.fillRect(s.x, s.y - 1, 1, 3);
        }
      }
      ctx.globalAlpha = 1;
      if (mouse) constellation();
      if (!reduce) shooting(t);
    }

    function constellation() {
      const R = 52;
      const near = stars
        .map(s => [s, Math.hypot(s.x - mouse.x, s.y - mouse.y)])
        .filter(([, d]) => d < R)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 9);
      near.forEach(([s, d], i) => {
        let best = null, bd = 34;
        for (const [q] of near) {
          const dd = Math.hypot(q.x - s.x, q.y - s.y);
          if (q !== s && dd < bd) { bd = dd; best = q; }
        }
        const k = 1 - d / R;
        ctx.fillStyle = '#22d3ee';
        ctx.globalAlpha = .4 * k;
        if (best) line(ctx, s.x, s.y, best.x, best.y);
        if (i < 3) line(ctx, s.x, s.y, mouse.x, mouse.y, 2);
        ctx.fillStyle = '#a5f3fc';
        ctx.globalAlpha = .25 + .75 * k;
        ctx.fillRect(s.x - 1, s.y, 3, 1);
        ctx.fillRect(s.x, s.y - 1, 1, 3);
      });
      ctx.globalAlpha = 1;
    }

    // Thỉnh thoảng có sao băng
    function shooting(t) {
      if (!shoot) {
        if (!nextShoot) nextShoot = t + 3000 + Math.random() * 6000;
        if (t < nextShoot) return;
        shoot = { x: w * (.45 + Math.random() * .5), y: Math.random() * h * .3, t0: t };
        nextShoot = 0;
      }
      const k = (t - shoot.t0) / 900;
      if (k >= 1) { shoot = null; return; }
      const x = shoot.x - k * 70, y = shoot.y + k * 30;
      ctx.fillStyle = '#e0f2fe';
      for (let i = 0; i < 10; i++) {
        ctx.globalAlpha = (1 - i / 10) * (1 - k);
        ctx.fillRect(Math.round(x + i * 2.33), Math.round(y - i), 1, 1);
      }
      ctx.globalAlpha = 1;
    }

    run(sky, draw);
    hero.addEventListener('pointermove', e => {
      const r = sky.getBoundingClientRect();
      mouse = { x: (e.clientX - r.left) / SK, y: (e.clientY - r.top) / SK };
      if (reduce) draw(now());
    });
    hero.addEventListener('pointerleave', () => { mouse = null; if (reduce) draw(now()); });
  }

  /* ---------- Bãi cỏ chân trang: mèo đuổi theo một bit dữ liệu ---------- */
  const meadow = $('.meadow');
  let buildMeadow = null;
  if (meadow) {
    const ctx = meadow.getContext('2d');
    const base = document.createElement('canvas');
    const MH = 12;
    const GRASS = '#10301f', TOP = '#1f5a3a', FLOWERS = ['#f472b6', '#fde68a', '#c4b5fd', '#67e8f9'];
    let S = 0, W = 0, catX = -30, last = 0;

    buildMeadow = () => {
      const s = scale(), w = Math.ceil(meadow.parentElement.clientWidth / s);
      if (s === S && w === W) return;
      S = s; W = w;
      meadow.width = base.width = W;
      meadow.height = base.height = MH;
      meadow.style.width = W * S + 'px';
      meadow.style.height = MH * S + 'px';
      const b = base.getContext('2d'), rnd = seeded(23);
      const px = (x, y, c, h = 1) => { b.fillStyle = c; b.fillRect(x, y, 1, h); };
      b.clearRect(0, 0, W, MH);
      b.fillStyle = TOP; b.fillRect(0, MH - 3, W, 1);
      b.fillStyle = GRASS; b.fillRect(0, MH - 2, W, 2);
      for (let x = 0; x < W; x++) {
        const r = rnd();
        if (r < .06) { px(x, MH - 5, TOP, 2); px(x, MH - 6, FLOWERS[rnd() * FLOWERS.length | 0]); }
        else if (r < .45) px(x, MH - 4 - (rnd() < .3 ? 1 : 0), TOP, 2);
      }
      if (reduce) catX = Math.round(W * .7);
      frame(now());
    };

    function frame(t) {
      const dt = Math.min(50, t - (last || t));
      last = t;
      if (!reduce) { catX += dt * .022; if (catX > W + 24) catX = -40; }
      ctx.clearRect(0, 0, W, MH);
      ctx.drawImage(base, 0, 0);
      const hop = reduce ? 1 : Math.abs(Math.sin(t * .006));
      dot(ctx, Math.round(catX) + 18, MH - 6 - Math.round(hop * 4), '#67e8f9');
      blit(ctx, !reduce && (t / 110 | 0) % 2 ? PX.cat.b : PX.cat.a, Math.round(catX), MH - 10);
    }
    run(meadow, frame);
  }

  /* ---------- Dựng lại khi đổi cỡ màn hình hoặc phông chữ tải xong ---------- */
  const relayout = () => { buildLand?.(); sizeSky?.(); buildMeadow?.(); mosaics.forEach(m => m.size()); };
  relayout();
  let rt;
  const later = () => { clearTimeout(rt); rt = setTimeout(relayout, 150); };
  addEventListener('resize', later);
  document.fonts?.ready.then(later);
})();
