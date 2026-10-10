// Điểm nhấn thêm kiểu game: thẻ "STAGE 0X" ghép từ khối vuông trên mỗi phần, thông báo thành tựu,
// trời đêm sáng dần thành bình minh khi cuộn tới cuối, mã bí mật (↑↑↓↓←→←→BA hoặc bấm nhân vật 5 lần).
// Cần sprites.js và pixel.js (window.PXFX).
(() => {
  const PX = window.PX, FX = window.PXFX;
  if (!PX || !FX) return;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const vi = document.documentElement.lang === 'vi';
  const pal = PX.pal;

  /* ---------- Chữ pixel 3x5 ---------- */
  const FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
    E: '111100110100111', G: '011100101101011', H: '101101111101101', I: '111010010010111',
    K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101',
    O: '010101101101010', P: '110101110100100', R: '110101110101101', S: '011100010001110',
    T: '111010010010010', U: '101101101101111', V: '101101101101010', Y: '101101010010010',
    0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100110101010', ' ': '000000000000000',
  };
  // Trả về lưới ký tự dùng được với mosaic(): mỗi chữ 3x5, cách 1 cột, tô màu chuyển dần theo cột
  function textRows(str, colors) {
    const chars = [...str.toUpperCase()].map(ch => FONT[ch] || FONT[' ']);
    const w = chars.length * 4 - 1;
    const rows = Array.from({ length: 5 }, () => Array(w).fill('.'));
    chars.forEach((bits, n) => {
      for (let i = 0; i < 15; i++) {
        if (bits[i] !== '1') continue;
        const x = n * 4 + (i % 3);
        rows[i / 3 | 0][x] = colors[Math.min(colors.length - 1, x * colors.length / w | 0)];
      }
    });
    return rows.map(r => r.join(''));
  }

  /* ---------- Thẻ "STAGE 0X": chữ pixel ghép từ khối vuông khi cuộn tới ---------- */
  // Tên phần đã có ở dòng ngay dưới (.eyebrow, có dấu), nên thẻ chỉ ghi số màn
  $$('main > section.section').forEach((sec, i) => {
    const head = $('.sec-head', sec);
    if (!head) return;
    const cv = document.createElement('canvas');
    cv.className = 'stage';
    cv.setAttribute('aria-hidden', 'true');
    head.prepend(cv);
    const rows = textRows(`STAGE ${String(i + 1).padStart(2, '0')}`, ['c', 'C', 'I', 'i', 'P', 'p']);
    // Canvas rộng đúng theo tỉ lệ chữ; căn trái, riêng phần Liên hệ căn giữa
    const fit = () => {
      const h = cv.clientHeight || 30;
      cv.style.width = Math.min(head.clientWidth, h / 5 * rows[0].length) + 'px';
    };
    fit();
    addEventListener('resize', fit);
    const m = FX.mosaic(cv, rows, { dur: 900, inside: true });
    new IntersectionObserver(([e], ob) => {
      if (!e.isIntersecting) return;
      ob.disconnect();
      m.start();
      if (!reduce) setTimeout(() => FX.burst(...FX.centerOf(cv), .7), 950);
    }, { threshold: .8 }).observe(cv);
    addEventListener('resize', () => m.size());
  });

  /* ---------- Thông báo thành tựu ở góc phải trên ---------- */
  const box = $('.achv');
  const got = new Set();
  const icon = key => {
    const rows = PX.icons[key] || PX.icons.star;
    const c = document.createElement('canvas');
    c.width = rows[0].length; c.height = rows.length;
    FX.blit(c.getContext('2d'), rows, 0, 0);
    return c.toDataURL();
  };
  // Hiện lần lượt từng cái, tối đa 2 cái cùng lúc trên màn hình
  const queue = [];
  let showing = 0;
  function unlock(id, key, title) {
    if (!box || got.has(id)) return;
    got.add(id);
    queue.push([key, title]);
    pump();
  }
  function pump() {
    if (showing >= 2 || !queue.length) return;
    const [key, title] = queue.shift();
    showing++;
    const el = document.createElement('div');
    el.className = 'achv-item';
    el.innerHTML = `<img alt="" src="${icon(key)}"><span><small>${vi ? 'THÀNH TỰU MỞ KHÓA' : 'ACHIEVEMENT UNLOCKED'}</small><b></b></span>`;
    $('b', el).textContent = title;
    box.append(el);
    FX.burst(...FX.centerOf($('img', el)), .7, ['#facc15', '#fde68a', '#fff7ed']);
    setTimeout(() => {
      el.classList.add('bye');
      setTimeout(() => { el.remove(); showing--; pump(); }, 400);
    }, 3200);
    setTimeout(pump, 900);
  }
  // [phần tử, biểu tượng, tên thành tựu]
  const ACH = vi ? [
    ['.stat', 'chip', '25 máy ICT trên 4 line sản xuất'],
    ['#kinh-nghiem .tl', 'brief', 'Hai chặng đường đi làm'],
    ['.lvls', 'py', 'Python và SQL Server đạt LV 4'],
    ['.award', 'cap', 'Khóa AI của Samsung Innovation Campus'],
    ['.paper', 'star', 'Bài báo được Springer xuất bản'],
    ['.contact-cards', 'mail', 'Đọc hết CV. Cảm ơn bạn!'],
  ] : [
    ['.stat', 'chip', '25 ICT testers on 4 production lines'],
    ['#experience .tl', 'brief', 'Two career stages'],
    ['.lvls', 'py', 'Python and SQL Server at level 4'],
    ['.award', 'cap', 'Samsung Innovation Campus AI course'],
    ['.paper', 'star', 'Paper published by Springer'],
    ['.contact-cards', 'mail', 'Read the whole CV. Thank you!'],
  ];
  ACH.forEach(([sel, key, title], n) => {
    const el = $(sel);
    if (!el) return;
    new IntersectionObserver(([e], ob) => {
      if (!e.isIntersecting) return;
      ob.disconnect();
      setTimeout(() => unlock(n, key, title), 500);
    }, { threshold: .5 }).observe(el);
  });

  /* ---------- Trời sáng dần: cuộn tới cuối trang thì chân trời ửng cam, mặt trời pixel mọc ---------- */
  const bg = $('.bg');
  if (bg) {
    const dawn = document.createElement('canvas');
    dawn.className = 'dawn';
    dawn.setAttribute('aria-hidden', 'true');
    bg.append(dawn);
    const ctx = dawn.getContext('2d');
    const S = 4;
    let W = 0, H = 0, last = -1;
    const size = () => {
      W = Math.ceil(innerWidth / S); H = Math.ceil(innerHeight / S);
      dawn.width = W; dawn.height = H;
      last = -1;
      paint();
    };
    // Dải màu chân trời đi theo bậc thang (dithering) cho đúng chất pixel
    function paint() {
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, (scrollY / max - .55) / .45)) : 0;
      const q = Math.round(p * 40) / 40;
      if (q === last) return;
      last = q;
      ctx.clearRect(0, 0, W, H);
      if (q <= 0) return;
      const bands = ['#4c1d95', '#7e22ce', '#be185d', '#ea580c', '#f59e0b'];
      const top = H * (1 - .42 * q);
      const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      for (let y = Math.floor(top); y < H; y++) {
        const k = (y - top) / (H - top);
        const b = Math.min(bands.length - 1, k * bands.length | 0);
        ctx.fillStyle = bands[b];
        for (let x = 0; x < W; x++) {
          if (bayer[(y % 4) * 4 + (x % 4)] / 16 < Math.min(1, k * 1.4) * .4 * q) ctx.fillRect(x, y, 1, 1);
        }
      }
      // Mặt trời mọc từ chân trời
      const r = Math.round(W * .04 + 6), cx = Math.round(W * .84), cy = Math.round(H + r - q * r * 1.6);
      ctx.fillStyle = '#fcd34d';
      for (let dy = -r; dy <= r; dy++) {
        const half = Math.floor(Math.sqrt(r * r - dy * dy));
        if ((cy + dy) % 3 === 0 && dy > r * .2) continue; // các vạch ngang kiểu mặt trời retro
        ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
      }
      ctx.globalAlpha = 1;
    }
    size();
    addEventListener('resize', size);
    addEventListener('scroll', () => requestAnimationFrame(paint), { passive: true });
  }

  /* ---------- Mã bí mật: ↑↑↓↓←→←→BA, hoặc bấm nhanh 5 lần vào nhân vật dẫn đường ---------- */
  const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let pos = 0;
  addEventListener('keydown', e => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = k === CODE[pos] ? pos + 1 : k === CODE[0] ? 1 : 0;
    if (pos === CODE.length) { pos = 0; secret(); }
  });
  addEventListener('px-secret', secret);

  let raining = false;
  function secret() {
    window.PXGUIDE?.secret();
    unlock('secret', 'star', vi ? 'Tìm ra mã bí mật' : 'Found the secret code');
    if (reduce || raining) return;
    raining = true;
    const cv = document.createElement('canvas');
    cv.className = 'rain';
    cv.setAttribute('aria-hidden', 'true');
    document.body.append(cv);
    const S = 4, W = cv.width = Math.ceil(innerWidth / S), H = cv.height = Math.ceil(innerHeight / S);
    cv.style.width = W * S + 'px'; cv.style.height = H * S + 'px';
    const ctx = cv.getContext('2d');
    const COLORS = ['c', 'C', 'i', 'I', 'p', 'P', 'y', 'e', 'r'].map(c => pal[c]);
    const drops = Array.from({ length: Math.min(260, W * 1.2 | 0) }, () => ({
      x: Math.random() * W | 0, y: -Math.random() * H * 1.4, v: .35 + Math.random() * .9,
      s: Math.random() < .25 ? 2 : 1, c: COLORS[Math.random() * COLORS.length | 0],
    }));
    // Đống khối chồng lên dưới đáy màn hình
    const pile = new Uint8Array(W);
    const t0 = performance.now();
    const step = t => {
      const k = (t - t0) / 5200;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = k > .8 ? (1 - k) / .2 : 1;
      for (const d of drops) {
        d.y += d.v;
        const floor = H - pile[d.x] - d.s;
        if (d.y >= floor) {
          if (k < .7) { pile[d.x] = Math.min(H / 4, pile[d.x] + d.s); for (let j = 1; j < d.s; j++) pile[(d.x + j) % W] = pile[d.x]; }
          d.y = -Math.random() * 40; d.x = Math.random() * W | 0;
        }
        ctx.fillStyle = d.c;
        ctx.fillRect(d.x, Math.round(d.y), d.s, d.s);
      }
      for (let x = 0; x < W; x++) {
        if (!pile[x]) continue;
        ctx.fillStyle = COLORS[(x * 7) % COLORS.length];
        ctx.fillRect(x, H - pile[x], 1, pile[x]);
      }
      if (k < 1) requestAnimationFrame(step);
      else { cv.remove(); raining = false; }
    };
    requestAnimationFrame(step);
    for (let i = 0; i < 5; i++) setTimeout(() => FX.burst(innerWidth * (.15 + Math.random() * .7), innerHeight * (.2 + Math.random() * .4), 1.4), i * 380);
  }
})();
