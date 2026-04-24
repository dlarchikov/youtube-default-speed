const MIN_SPEED = 0.75;
const MAX_SPEED = 2.0;
const PRESETS = [0.75, 1, 1.25, 1.5, 1.75, 2];

const CX = 130;
const CY = 175;
const R = 95;
const START_ANGLE = 210;
const END_ANGLE = 330;
const SWEEP = END_ANGLE - START_ANGLE;

let currentSpeed = 1;

function d2r(d) { return d * Math.PI / 180; }

function pointOnArc(angle, radius) {
  return {
    x: CX + radius * Math.cos(d2r(angle)),
    y: CY + radius * Math.sin(d2r(angle))
  };
}

function speedToAngle(speed) {
  return START_ANGLE + (speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED) * SWEEP;
}

function angleToSpeed(angle) {
  const a = Math.max(START_ANGLE, Math.min(END_ANGLE, angle));
  let s = MIN_SPEED + (a - START_ANGLE) / SWEEP * (MAX_SPEED - MIN_SPEED);
  return Math.round(s * 20) / 20;
}

function saveSpeed(speed) {
  currentSpeed = speed;
  chrome.runtime.sendMessage({ action: 'setSpeed', speed }).catch(() => {});
  renderGauge(speed);
  renderPresets(speed);
}

function fmtSpeed(s) {
  return s % 1 === 0 ? s.toFixed(0) : s.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function renderGauge(speed) {
  const svg = document.getElementById('gauge');
  const angle = speedToAngle(speed);
  const pStart = pointOnArc(START_ANGLE, R);
  const pAngle = pointOnArc(angle, R);
  const pEnd = pointOnArc(END_ANGLE, R);

  let h = '';

  h += '<defs>';
  h += '<linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="0">';
  h += '<stop offset="0%" stop-color="#4ade80"/>';
  h += '<stop offset="40%" stop-color="#facc15"/>';
  h += '<stop offset="100%" stop-color="#ef4444"/>';
  h += '</linearGradient>';
  h += '</defs>';

  h += `<path d="M ${pStart.x} ${pStart.y} A ${R} ${R} 0 0 1 ${pEnd.x} ${pEnd.y}" fill="none" stroke="#222" stroke-width="12" stroke-linecap="round"/>`;

  if (speed > MIN_SPEED) {
    h += `<path d="M ${pStart.x} ${pStart.y} A ${R} ${R} 0 0 1 ${pAngle.x} ${pAngle.y}" fill="none" stroke="url(#arcGrad)" stroke-width="8" stroke-linecap="round"/>`;
  }

  PRESETS.forEach(v => {
    const a = speedToAngle(v);
    const inner = pointOnArc(a, R - 7);
    const outer = pointOnArc(a, R + 7);
    h += `<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="#555" stroke-width="1.5" stroke-linecap="round"/>`;

    const lbl = pointOnArc(a, R + 22);
    h += `<text x="${lbl.x}" y="${lbl.y}" fill="#777" font-size="10" text-anchor="middle" dominant-baseline="middle">${v}</text>`;
  });

  const needle = pointOnArc(angle, R - 22);
  h += `<line x1="${CX}" y1="${CY}" x2="${needle.x}" y2="${needle.y}" stroke="#ff4444" stroke-width="2.5" stroke-linecap="round"/>`;
  h += `<circle cx="${CX}" cy="${CY}" r="5" fill="#ff4444"/>`;
  h += `<circle cx="${CX}" cy="${CY}" r="2" fill="#111"/>`;

  h += `<text x="${CX}" y="130" fill="#fff" font-size="22" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${fmtSpeed(speed)}</text>`;
  h += `<text x="${CX}" y="148" fill="#666" font-size="12" text-anchor="middle" dominant-baseline="middle">×</text>`;

  h += `<circle cx="${CX}" cy="${CY}" r="${R + 5}" fill="transparent"/>`;

  svg.innerHTML = h;
}

function renderPresets(active) {
  const container = document.getElementById('presets');
  container.innerHTML = '';
  PRESETS.forEach(speed => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn' + (speed === active ? ' active' : '');
    btn.textContent = speed;
    btn.addEventListener('click', () => saveSpeed(speed));
    container.appendChild(btn);
  });
}

document.getElementById('gauge').addEventListener('click', (e) => {
  const svg = e.currentTarget;
  const rect = svg.getBoundingClientRect();
  const vw = 260, vh = 220;
  const x = (e.clientX - rect.left) / rect.width * vw;
  const y = (e.clientY - rect.top) / rect.height * vh;

  const dx = x - CX;
  const dy = y - CY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 30 || dist > R + 15) return;

  let angle = Math.atan2(dy, dx) * 180 / Math.PI;
  if (angle < 0) angle += 360;

  if (angle >= START_ANGLE - 8 && angle <= END_ANGLE + 8) {
    saveSpeed(angleToSpeed(angle));
  }
});

document.getElementById('header').textContent = chrome.i18n.getMessage('popupHeader');

chrome.runtime.sendMessage({ action: 'getSpeed' }).then((response) => {
  if (response) currentSpeed = response.speed;
  renderGauge(currentSpeed);
  renderPresets(currentSpeed);
}).catch(() => {
  renderGauge(currentSpeed);
  renderPresets(currentSpeed);
});
