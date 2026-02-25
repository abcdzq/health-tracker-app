const Charts = {
  _getColors() {
    const s = getComputedStyle(document.documentElement);
    return {
      primary: s.getPropertyValue('--primary').trim() || '#4CAF50',
      accent: s.getPropertyValue('--accent').trim() || '#FF9800',
      text: s.getPropertyValue('--text').trim() || '#212121',
      textSec: s.getPropertyValue('--text-secondary').trim() || '#757575',
      border: s.getPropertyValue('--border').trim() || '#E0E0E0',
      surface: s.getPropertyValue('--surface').trim() || '#FFFFFF'
    };
  },

  _setup(canvas, width, height) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return ctx;
  },

  ring(canvas, value, max, opts = {}) {
    const c = this._getColors();
    const size = opts.size || 120;
    const ctx = this._setup(canvas, size, size);
    const lw = opts.lineWidth || 10;
    const r = (size - lw) / 2 - 2;
    const cx = size / 2, cy = size / 2;
    const pct = Math.min(value / (max || 1), 1);
    const start = -Math.PI / 2;
    const color = opts.color || c.primary;

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = c.border;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.stroke();

    if (pct > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, start, start + pct * Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    ctx.fillStyle = c.text;
    ctx.font = `bold ${opts.fontSize || 20}px -apple-system, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(opts.label || Math.round(pct * 100) + '%', cx, cy - (opts.sublabel ? 7 : 0));

    if (opts.sublabel) {
      ctx.fillStyle = c.textSec;
      ctx.font = `${opts.subFontSize || 11}px -apple-system, sans-serif`;
      ctx.fillText(opts.sublabel, cx, cy + 13);
    }
  },

  bar(canvas, labels, values, opts = {}) {
    const c = this._getColors();
    const w = opts.width || canvas.parentElement?.clientWidth || 300;
    const h = opts.height || 160;
    const ctx = this._setup(canvas, w, h);

    const pl = 36, pr = 12, pt = 12, pb = 28;
    const cw = w - pl - pr, ch = h - pt - pb;
    const mx = Math.max(...values, opts.maxValue || 1) * 1.15 || 1;
    const gap = cw / labels.length;
    const bw = Math.min(gap * 0.55, 28);
    const color = opts.color || c.primary;

    for (let i = 0; i <= 4; i++) {
      const y = pt + (ch / 4) * i;
      ctx.strokeStyle = c.border;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(pl, y);
      ctx.lineTo(w - pr, y);
      ctx.stroke();
      ctx.fillStyle = c.textSec;
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.round(mx - (mx / 4) * i), pl - 4, y);
    }

    values.forEach((v, i) => {
      const x = pl + gap * i + (gap - bw) / 2;
      const barH = (v / mx) * ch;
      const y = pt + ch - barH;
      if (barH > 0) {
        ctx.fillStyle = color;
        const rad = Math.min(bw / 2, 4);
        ctx.beginPath();
        if (barH > rad * 2) {
          ctx.moveTo(x, y + rad);
          ctx.arcTo(x, y, x + rad, y, rad);
          ctx.arcTo(x + bw, y, x + bw, y + rad, rad);
          ctx.lineTo(x + bw, pt + ch);
          ctx.lineTo(x, pt + ch);
        } else {
          ctx.rect(x, y, bw, barH);
        }
        ctx.fill();
      }
      ctx.fillStyle = c.textSec;
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(labels[i], pl + gap * i + gap / 2, pt + ch + 6);
    });

    if (opts.goalLine && opts.goalLine <= mx) {
      const gy = pt + ch - (opts.goalLine / mx) * ch;
      ctx.strokeStyle = c.accent;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(pl, gy);
      ctx.lineTo(w - pr, gy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  },

  line(canvas, labels, values, opts = {}) {
    const c = this._getColors();
    const w = opts.width || canvas.parentElement?.clientWidth || 300;
    const h = opts.height || 160;
    const ctx = this._setup(canvas, w, h);

    const valid = values.map((v, i) => v != null ? i : -1).filter(i => i >= 0);
    if (!valid.length) {
      ctx.fillStyle = c.textSec;
      ctx.font = '13px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('尚無資料', w / 2, h / 2);
      return;
    }

    const vv = valid.map(i => values[i]);
    const mn = Math.min(...vv), mx = Math.max(...vv);
    const pad = (mx - mn) * 0.15 || 0.5;
    const dMin = mn - pad, dMax = mx + pad, dRange = dMax - dMin || 1;

    const pl = 42, pr = 12, pt = 12, pb = 28;
    const cw = w - pl - pr, ch = h - pt - pb;
    const gap = labels.length > 1 ? cw / (labels.length - 1) : cw;
    const color = opts.color || c.primary;

    for (let i = 0; i <= 4; i++) {
      const y = pt + (ch / 4) * i;
      ctx.strokeStyle = c.border;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(pl, y);
      ctx.lineTo(w - pr, y);
      ctx.stroke();
      ctx.fillStyle = c.textSec;
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText((dMax - (dRange / 4) * i).toFixed(1), pl - 4, y);
    }

    const getXY = i => ({
      x: pl + gap * i,
      y: pt + ch - ((values[i] - dMin) / dRange) * ch
    });

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    valid.forEach((idx, j) => {
      const p = getXY(idx);
      j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    if (valid.length > 1) {
      ctx.beginPath();
      valid.forEach((idx, j) => {
        const p = getXY(idx);
        j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
      });
      const last = getXY(valid[valid.length - 1]);
      const first = getXY(valid[0]);
      ctx.lineTo(last.x, pt + ch);
      ctx.lineTo(first.x, pt + ch);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, pt, 0, pt + ch);
      grad.addColorStop(0, color + '30');
      grad.addColorStop(1, color + '05');
      ctx.fillStyle = grad;
      ctx.fill();
    }

    valid.forEach(i => {
      const p = getXY(i);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.surface;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });

    const step = Math.max(1, Math.ceil(labels.length / 7));
    labels.forEach((l, i) => {
      if (labels.length > 8 && i % step !== 0 && i !== labels.length - 1) return;
      ctx.fillStyle = c.textSec;
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(l, pl + gap * i, pt + ch + 6);
    });
  }
};
