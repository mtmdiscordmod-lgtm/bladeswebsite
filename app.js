/* ════════════════════════════════════════
   Blades in the Dark — Character Sheet
   Interactive Logic & Local Storage
   ════════════════════════════════════════ */

const STORAGE_KEY = 'blades-character-sheet';

// ── Playbook Starting Action Dots ──────
const PLAYBOOK_DATA = {
  Cutter: {
    actions: { skirmish: 2, command: 1 },
    xpTrigger: 'violence or coercion',
  },
  Hound: {
    actions: { hunt: 2, survey: 1 },
    xpTrigger: 'tracking or violence',
  },
  Leech: {
    actions: { tinker: 2, wreck: 1 },
    xpTrigger: 'technical skill or mayhem',
  },
  Lurk: {
    actions: { prowl: 2, finesse: 1 },
    xpTrigger: 'stealth or evasion',
  },
  Slide: {
    actions: { sway: 2, consort: 1 },
    xpTrigger: 'deception or influence',
  },
  Spider: {
    actions: { consort: 2, study: 1 },
    xpTrigger: 'calculation or conspiracy',
  },
  Whisper: {
    actions: { attune: 2, study: 1 },
    xpTrigger: 'knowledge or arcane power',
  },
};

// ── Default State ──────────────────────
function defaultState() {
  return {
    name: '', alias: '', crew: 'Shadows', playbook: '', look: '',
    heritage: '', background: '',
    vice: '', vicePurveyor: '',
    specialAbilities: ['', '', '', '', '', '', '', ''],
    coin: 0, stash: 0,

    // Crew: Shadows trackers
    rep: 0, heat: 0, crewTier: 0, wantedLevel: 0, crewXp: 0,
    hold: 'weak',
    huntingGround: '',

    // Shadows upgrades
    upgrade_thiefRigging: false,
    upgrade_undergroundMaps: false,
    upgrade_eliteRooks: false,
    upgrade_eliteSkulks: false,
    upgrade_steady: false,

    // Shadows crew abilities
    crewAbility_everyoneSteals: false,
    crewAbility_ghostEchoes: false,
    crewAbility_packRats: false,
    crewAbility_patron: false,
    crewAbility_secondStory: false,
    crewAbility_slippery: false,
    crewAbility_synchronized: false,

    // Lair details
    lairName: '',
    lairLocation: '',
    lairNotes: '',

    // Shadows claims
    claim_interrogation_chamber: false,
    claim_turf_1: false,
    claim_loyal_fence: false,
    claim_gambling_den: false,
    claim_tavern: false,
    claim_drug_den: false,
    claim_informants: false,
    claim_lair: true,
    claim_turf_2: false,
    claim_lookouts: false,
    claim_hagfish_farm: false,
    claim_infirmary: false,
    claim_covert_drop: false,
    claim_turf_3: false,
    claim_secret_pathways: false,

    // Crew contacts
    crewContacts: [
      { name: 'Dowler, an explorer', status: 'neutral' },
      { name: 'Laroze, a Bluecoat', status: 'neutral' },
      { name: 'Amancio, a deal broker', status: 'neutral' },
      { name: 'Fitz, a collector', status: 'neutral' },
      { name: 'Adelaide Phroaig, a noble', status: 'neutral' },
      { name: 'Rigney, a tavern owner', status: 'neutral' },
    ],

    // Factions
    factions: [],

    hunt: 0, study: 0, survey: 0, tinker: 0,
    finesse: 0, prowl: 0, skirmish: 0, wreck: 0,
    attune: 0, command: 0, consort: 0, sway: 0,
    playbookXp: 0, insightXp: 0, prowessXp: 0, resolveXp: 0,
    stress: 0, trauma: 0,
    traumaConditions: [],
    harm3: '', harm2a: '', harm2b: '', harm1a: '', harm1b: '',
    healingClock: 0,
    armor: false, heavyArmor: false, specialArmor: false,
    notes: '',
    friends: [
      { name: '', status: 'neutral' },
      { name: '', status: 'neutral' },
      { name: '', status: 'neutral' },
      { name: '', status: 'neutral' },
      { name: '', status: 'neutral' },
    ],
    loadLevel: '',
    items: [
      { name: '', load: 1, carried: false },
      { name: '', load: 1, carried: false },
      { name: '', load: 1, carried: false },
      { name: '', load: 1, carried: false },
      { name: '', load: 1, carried: false },
      { name: '', load: 1, carried: false },
      { name: '', load: 1, carried: false },
      { name: '', load: 1, carried: false },
      { name: '', load: 1, carried: false },
      { name: '', load: 1, carried: false },
    ],
    xpChallenge: '',
  };
}

let state = {};

// ── Persistence ────────────────────────
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      // Merge with defaults to handle new fields added in updates
      state = Object.assign(defaultState(), saved);
    } else {
      state = defaultState();
    }
  } catch {
    state = defaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or unavailable
  }
  updateTitle();
}

function updateTitle() {
  const name = state.name || 'Unnamed';
  const playbook = state.playbook ? ` (${state.playbook})` : '';
  document.title = `${name}${playbook} — Blades in the Dark`;
}

// ── Initialization ─────────────────────
function init() {
  loadState();
  renderAll();
  bindEvents();
  updateTitle();
  initDiceSettings(); // polls for DiceEngine module, then calls DiceEngine.init()
  initAnimations();
}

function renderAll() {
  renderTextFields();
  renderOptionGroups();
  renderMultiOptionGroups();
  renderBoxTracks();
  renderXpTracks();
  renderDots();
  renderClock();
  renderCheckboxes();
  renderAbilities();
  renderFriends();
  renderItems();
  renderLoadLevel();
  updateLoadMeter();
  renderCrewContacts();
  renderClaims();
  renderPlaybookIndicators();
  renderFactions();
}

// ── Text Fields ────────────────────────
function renderTextFields() {
  document.querySelectorAll('input[type="text"][data-field], textarea[data-field]').forEach(el => {
    const field = el.dataset.field;
    if (field in state) {
      el.value = state[field];
    }
  });
}

// ── Single-select Option Groups ────────
function renderOptionGroups() {
  document.querySelectorAll('.options:not(.multi)').forEach(group => {
    const field = group.dataset.field;
    const val = state[field] || '';
    group.querySelectorAll('.option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.value === val);
    });
  });
}

// ── Multi-select Option Groups (trauma conditions) ──
function renderMultiOptionGroups() {
  document.querySelectorAll('.options.multi').forEach(group => {
    const field = group.dataset.field;
    const arr = state[field] || [];
    group.querySelectorAll('.option').forEach(opt => {
      opt.classList.toggle('selected', arr.includes(opt.dataset.value));
    });
  });
}

// ── Box Tracks (stress, trauma, stash, coin) ──
function renderBoxTracks() {
  document.querySelectorAll('.box-track[data-track]').forEach(track => {
    const field = track.dataset.track;
    const max = parseInt(track.dataset.max);
    const val = state[field] || 0;
    track.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const box = document.createElement('span');
      box.className = 'box' + (i < val ? ' filled' : '');
      box.dataset.index = i;
      track.appendChild(box);
    }
    // Update display spans
    const display = document.querySelector(`[data-display="${field}"]`);
    if (display) display.textContent = val;
  });
}

// ── XP Tracks ──────────────────────────
function renderXpTracks() {
  document.querySelectorAll('.xp-track, .xp-track-inline').forEach(track => {
    const field = track.dataset.track;
    const max = parseInt(track.dataset.max);
    const val = state[field] || 0;
    track.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const mark = document.createElement('span');
      mark.className = 'xp-mark' + (i < val ? ' filled' : '');
      mark.dataset.index = i;
      track.appendChild(mark);
    }
  });
}

// ── Action Dots ────────────────────────
function renderDots() {
  document.querySelectorAll('.action-row').forEach(row => {
    const action = row.dataset.action;
    const val = state[action] || 0;
    const dotsContainer = row.querySelector('.dots');
    const max = parseInt(dotsContainer.dataset.max);
    dotsContainer.innerHTML = '';
    for (let i = 0; i < max; i++) {
      const dot = document.createElement('span');
      dot.className = 'dot' + (i < val ? ' filled' : '');
      dot.dataset.index = i;
      dotsContainer.appendChild(dot);
    }
  });
}

// ── Healing Clock ──────────────────────
function renderClock() {
  document.querySelectorAll('.clock[data-clock]').forEach(svg => {
    const field = svg.dataset.clock;
    const val = state[field] || 0;
    svg.querySelectorAll('.clock-seg').forEach(seg => {
      const idx = parseInt(seg.dataset.seg);
      seg.classList.toggle('filled', idx < val);
    });
  });
}

// ── Checkboxes (armor) ─────────────────
function renderCheckboxes() {
  document.querySelectorAll('input[type="checkbox"][data-field]').forEach(cb => {
    cb.checked = !!state[cb.dataset.field];
  });
}

// ── Special Abilities ──────────────────
function renderAbilities() {
  const list = document.getElementById('special-abilities-list');
  list.innerHTML = '';
  state.specialAbilities.forEach((ability, i) => {
    const row = document.createElement('div');
    row.className = 'ability-row';
    row.innerHTML = `
      <input type="text" value="${escHtml(ability)}" data-ability-index="${i}" placeholder="Ability name / description">
      <button class="ability-remove" data-remove-ability="${i}" title="Remove">&times;</button>
    `;
    list.appendChild(row);
  });
}

// ── Friends ────────────────────────────
function renderFriends() {
  const list = document.getElementById('friends-list');
  list.innerHTML = '';
  state.friends.forEach((friend, i) => {
    const row = document.createElement('div');
    row.className = 'friend-row';
    const isClose = friend.status === 'close';
    const isRival = friend.status === 'rival';
    row.innerHTML = `
      <span class="friend-status">
        <button class="friend-status-btn ${isClose ? 'active' : ''}" data-friend-status="${i}" data-status-val="close" title="Close friend">&#9650;</button>
        <button class="friend-status-btn ${isRival ? 'active' : ''}" data-friend-status="${i}" data-status-val="rival" title="Rival">&#9660;</button>
      </span>
      <input type="text" value="${escHtml(friend.name)}" data-friend-index="${i}" placeholder="Contact name">
      <button class="friend-remove" data-remove-friend="${i}" title="Remove">&times;</button>
    `;
    list.appendChild(row);
  });
}

// ── Items ──────────────────────────────
function renderItems() {
  const list = document.getElementById('items-list');
  list.innerHTML = '';
  state.items.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
      <input type="checkbox" data-item-carried="${i}" ${item.carried ? 'checked' : ''}>
      <input type="text" value="${escHtml(item.name)}" data-item-index="${i}" placeholder="Item name">
      <input type="number" class="item-load-sel" value="${item.load}" min="0" max="4" data-item-load="${i}" title="Load cost">
      <button class="item-remove" data-remove-item="${i}" title="Remove">&times;</button>
    `;
    list.appendChild(row);
  });
}

function renderLoadLevel() {
  document.querySelectorAll('input[name="load"]').forEach(radio => {
    radio.checked = radio.value === state.loadLevel;
  });
}

function updateLoadMeter() {
  const loadLimits = { light: 3, normal: 5, heavy: 6 };
  const max = loadLimits[state.loadLevel] || 0;
  const current = state.items.reduce((sum, item) => sum + (item.carried ? item.load : 0), 0);
  const currentEl = document.getElementById('load-current');
  const maxEl = document.getElementById('load-max');
  const meter = document.querySelector('.load-meter');
  if (currentEl) currentEl.textContent = current;
  if (maxEl) maxEl.textContent = max;
  if (meter) meter.classList.toggle('over', max > 0 && current > max);
}

// ── Crew Contacts ─────────────────────
function renderCrewContacts() {
  const list = document.getElementById('crew-contacts-list');
  if (!list) return;
  list.innerHTML = '';
  (state.crewContacts || []).forEach((contact, i) => {
    const row = document.createElement('div');
    row.className = 'friend-row';
    const isClose = contact.status === 'close';
    const isRival = contact.status === 'rival';
    row.innerHTML = `
      <span class="friend-status">
        <button class="friend-status-btn ${isClose ? 'active' : ''}" data-crew-contact-status="${i}" data-status-val="close" title="Close">&#9650;</button>
        <button class="friend-status-btn ${isRival ? 'active' : ''}" data-crew-contact-status="${i}" data-status-val="rival" title="Rival">&#9660;</button>
      </span>
      <input type="text" value="${escHtml(contact.name)}" data-crew-contact-index="${i}" placeholder="Contact name">
      <button class="friend-remove" data-remove-crew-contact="${i}" title="Remove">&times;</button>
    `;
    list.appendChild(row);
  });
}

// ── Claims Map ────────────────────────
function renderClaims() {
  document.querySelectorAll('.claim[data-claim]').forEach(el => {
    const key = el.dataset.claim;
    el.classList.toggle('claimed', !!state[key]);
  });
}

// ── Playbook Starting-Dot Indicators ──
function renderPlaybookIndicators() {
  // Clear old badges
  document.querySelectorAll('.pb-badge').forEach(el => el.remove());

  const pb = PLAYBOOK_DATA[state.playbook];
  if (!pb) return;

  document.querySelectorAll('.action-row').forEach(row => {
    const action = row.dataset.action;
    const dots = pb.actions[action];
    if (dots) {
      const badge = document.createElement('span');
      badge.className = 'pb-badge';
      badge.textContent = '+' + dots;
      badge.title = state.playbook + ' starts with ' + dots;
      row.appendChild(badge);
    }
  });
}

// ── Dynamic Clock SVG Generation ──────
function clockSVG(segments, filled, size) {
  size = size || 44;
  const h = size / 2;
  const r = h - 2;
  let s = `<svg class="faction-clock-svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;
  s += `<circle cx="${h}" cy="${h}" r="${r}" fill="none" stroke="currentColor" stroke-width="2"/>`;
  for (let i = 0; i < segments; i++) {
    const a1 = (i / segments) * 2 * Math.PI - Math.PI / 2;
    const a2 = ((i + 1) / segments) * 2 * Math.PI - Math.PI / 2;
    const x1 = h + r * Math.cos(a1);
    const y1 = h + r * Math.sin(a1);
    const x2 = h + r * Math.cos(a2);
    const y2 = h + r * Math.sin(a2);
    const large = (a2 - a1 > Math.PI) ? 1 : 0;
    s += `<path d="M${h},${h} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${large},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" class="clock-seg${i < filled ? ' filled' : ''}" data-seg="${i}"/>`;
    s += `<line x1="${h}" y1="${h}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" stroke="currentColor" stroke-width="1"/>`;
  }
  s += `</svg>`;
  return s;
}

// ── Factions ──────────────────────────
function renderFactions() {
  const list = document.getElementById('factions-list');
  if (!list) return;
  list.innerHTML = '';

  (state.factions || []).forEach((faction, fi) => {
    const card = document.createElement('div');
    card.className = 'faction-card';
    card.dataset.factionIndex = fi;

    const statuses = ['ally', 'friendly', 'helpful', 'neutral', 'interfering', 'hostile', 'war'];
    const statusBtns = statuses.map(s =>
      `<button class="faction-status-btn${faction.status === s ? ' active' : ''}" data-value="${s}" data-faction-status="${fi}">${s.toUpperCase()}</button>`
    ).join('');

    let clocksHtml = '';
    (faction.clocks || []).forEach((clock, ci) => {
      clocksHtml += `
        <div class="faction-clock-item" data-faction-index="${fi}" data-clock-index="${ci}">
          <input type="text" value="${escHtml(clock.name)}" data-faction-clock-name="${fi}" data-clock-idx="${ci}" placeholder="Clock name">
          ${clockSVG(clock.segments, clock.filled, 44)}
          <select data-faction-clock-segments="${fi}" data-clock-idx="${ci}">
            <option value="4"${clock.segments === 4 ? ' selected' : ''}>4-seg</option>
            <option value="6"${clock.segments === 6 ? ' selected' : ''}>6-seg</option>
            <option value="8"${clock.segments === 8 ? ' selected' : ''}>8-seg</option>
            <option value="12"${clock.segments === 12 ? ' selected' : ''}>12-seg</option>
          </select>
          <button class="faction-clock-remove" data-remove-faction-clock="${fi}" data-clock-idx="${ci}" title="Remove clock">&times;</button>
        </div>
      `;
    });

    card.innerHTML = `
      <div class="faction-header">
        <input type="text" class="faction-name-input" value="${escHtml(faction.name)}" data-faction-name="${fi}" placeholder="FACTION NAME">
        <div class="faction-tier-group">
          <label>TIER</label>
          <div class="box-track" data-faction-tier="${fi}" data-max="5"></div>
        </div>
        <button class="faction-remove" data-remove-faction="${fi}" title="Remove faction">&times;</button>
      </div>
      <div class="faction-body">
        <div class="faction-status-group">${statusBtns}</div>
        <textarea data-faction-notes="${fi}" placeholder="Turf, NPCs, Notable Assets, Quirks, Allies, Enemies, Situation...">${escHtml(faction.notes)}</textarea>
        <div class="faction-clocks-row">
          <strong style="font-size:0.8rem;letter-spacing:0.04em">CLOCKS</strong>
          <button class="add-btn" data-add-faction-clock="${fi}" style="width:auto;display:inline;padding:0.2rem 0.6rem;margin:0">+ Clock</button>
        </div>
        <div class="faction-clocks-list">${clocksHtml}</div>
      </div>
    `;
    list.appendChild(card);

    // Render the tier box track manually
    const tierTrack = card.querySelector(`[data-faction-tier="${fi}"]`);
    const max = parseInt(tierTrack.dataset.max);
    for (let i = 0; i < max; i++) {
      const box = document.createElement('span');
      box.className = 'box' + (i < faction.tier ? ' filled' : '');
      box.dataset.index = i;
      tierTrack.appendChild(box);
    }
  });
}

// ── Tab Switching ─────────────────────
function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.dataset.tab === tabName);
  });
}

// ── Event Binding ──────────────────────
function bindEvents() {
  const sheet = document.querySelector('.sheet');

  // Tab clicks (GSAP-enhanced when available)
  document.querySelectorAll('.tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => switchTabAnimated(tab.dataset.tab));
  });

  // Text inputs
  sheet.addEventListener('input', e => {
    const el = e.target;

    // Standard text/textarea fields
    if ((el.matches('input[type="text"][data-field]') || el.matches('textarea[data-field]'))) {
      state[el.dataset.field] = el.value;
      saveState();
      return;
    }

    // Ability text
    if (el.matches('[data-ability-index]')) {
      state.specialAbilities[parseInt(el.dataset.abilityIndex)] = el.value;
      saveState();
      return;
    }

    // Friend name
    if (el.matches('[data-friend-index]')) {
      state.friends[parseInt(el.dataset.friendIndex)].name = el.value;
      saveState();
      return;
    }

    // Item name
    if (el.matches('[data-item-index]')) {
      state.items[parseInt(el.dataset.itemIndex)].name = el.value;
      saveState();
      updateLoadMeter();
      return;
    }

    // Item load
    if (el.matches('[data-item-load]')) {
      state.items[parseInt(el.dataset.itemLoad)].load = Math.max(0, parseInt(el.value) || 0);
      saveState();
      updateLoadMeter();
      return;
    }

    // Crew contact name
    if (el.matches('[data-crew-contact-index]')) {
      state.crewContacts[parseInt(el.dataset.crewContactIndex)].name = el.value;
      saveState();
      return;
    }

    // Faction name
    if (el.matches('[data-faction-name]')) {
      state.factions[parseInt(el.dataset.factionName)].name = el.value;
      saveState();
      return;
    }

    // Faction notes
    if (el.matches('[data-faction-notes]')) {
      state.factions[parseInt(el.dataset.factionNotes)].notes = el.value;
      saveState();
      return;
    }

    // Faction clock name
    if (el.matches('[data-faction-clock-name]')) {
      const fi = parseInt(el.dataset.factionClockName);
      const ci = parseInt(el.dataset.clockIdx);
      state.factions[fi].clocks[ci].name = el.value;
      saveState();
      return;
    }
  });

  // Clicks (delegated)
  sheet.addEventListener('click', e => {
    const el = e.target;

    // Collapse toggle (GSAP-enhanced)
    if (el.matches('.collapse-toggle')) {
      const section = el.closest('.section');
      if (section) toggleCollapseAnimated(section);
      return;
    }

    // Single-select options
    if (el.matches('.options:not(.multi) .option')) {
      const group = el.closest('.options');
      const field = group.dataset.field;
      const val = el.dataset.value;
      state[field] = state[field] === val ? '' : val;
      saveState();
      renderOptionGroups();
      if (field === 'playbook') {
        renderPlaybookIndicators();
        const pb = PLAYBOOK_DATA[state.playbook];
        if (pb) {
          state.xpChallenge = pb.xpTrigger;
          saveState();
          renderTextFields();
        }
      }
      return;
    }

    // Multi-select options (trauma conditions)
    if (el.matches('.options.multi .option')) {
      const group = el.closest('.options');
      const field = group.dataset.field;
      const val = el.dataset.value;
      const arr = state[field] || [];
      const idx = arr.indexOf(val);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(val);
      state[field] = arr;
      saveState();
      renderMultiOptionGroups();
      return;
    }

    // Box tracks (stress, trauma, stash, coin — NOT faction tier)
    if (el.matches('.box-track[data-track] .box')) {
      const track = el.closest('.box-track[data-track]');
      const field = track.dataset.track;
      const idx = parseInt(el.dataset.index);
      const current = state[field] || 0;
      state[field] = (idx + 1 === current) ? current - 1 : idx + 1;
      saveState();
      renderBoxTracks();
      return;
    }

    // Faction tier box track
    if (el.matches('.box-track[data-faction-tier] .box')) {
      const track = el.closest('.box-track[data-faction-tier]');
      const fi = parseInt(track.dataset.factionTier);
      const idx = parseInt(el.dataset.index);
      const current = state.factions[fi].tier || 0;
      state.factions[fi].tier = (idx + 1 === current) ? current - 1 : idx + 1;
      saveState();
      renderFactions();
      return;
    }

    // XP tracks
    if (el.matches('.xp-mark')) {
      const track = el.closest('.xp-track, .xp-track-inline');
      const field = track.dataset.track;
      const idx = parseInt(el.dataset.index);
      const current = state[field] || 0;
      state[field] = (idx + 1 === current) ? current - 1 : idx + 1;
      saveState();
      renderXpTracks();
      return;
    }

    // Action dots
    if (el.matches('.dot')) {
      const dotsContainer = el.closest('.dots');
      const row = el.closest('.action-row');
      const action = row.dataset.action;
      const idx = parseInt(el.dataset.index);
      const current = state[action] || 0;
      state[action] = (idx + 1 === current) ? current - 1 : idx + 1;
      saveState();
      renderDots();
      return;
    }

    // Clock segments (healing clock and faction clocks)
    if (el.matches('.clock-seg')) {
      // Healing clock
      const healingSvg = el.closest('.clock[data-clock]');
      if (healingSvg) {
        const field = healingSvg.dataset.clock;
        const idx = parseInt(el.dataset.seg);
        const current = state[field] || 0;
        state[field] = (idx + 1 === current) ? current - 1 : idx + 1;
        saveState();
        renderClock();
        return;
      }
      // Faction clock
      const factionClockItem = el.closest('.faction-clock-item');
      if (factionClockItem) {
        const fi = parseInt(factionClockItem.dataset.factionIndex);
        const ci = parseInt(factionClockItem.dataset.clockIndex);
        const clock = state.factions[fi].clocks[ci];
        const idx = parseInt(el.dataset.seg);
        clock.filled = (idx + 1 === clock.filled) ? clock.filled - 1 : idx + 1;
        saveState();
        renderFactions();
        return;
      }
    }

    // Clear XP track
    if (el.matches('[data-clear]')) {
      state[el.dataset.clear] = 0;
      saveState();
      renderXpTracks();
      return;
    }

    // Clear clock
    if (el.matches('[data-clear-clock]')) {
      state[el.dataset.clearClock] = 0;
      saveState();
      renderClock();
      return;
    }

    // Friend status
    if (el.matches('[data-friend-status]')) {
      const i = parseInt(el.dataset.friendStatus);
      const val = el.dataset.statusVal;
      state.friends[i].status = state.friends[i].status === val ? 'neutral' : val;
      saveState();
      renderFriends();
      return;
    }

    // Remove friend
    if (el.matches('[data-remove-friend]')) {
      state.friends.splice(parseInt(el.dataset.removeFriend), 1);
      saveState();
      renderFriends();
      return;
    }

    // Remove ability
    if (el.matches('[data-remove-ability]')) {
      state.specialAbilities.splice(parseInt(el.dataset.removeAbility), 1);
      saveState();
      renderAbilities();
      return;
    }

    // Remove item
    if (el.matches('[data-remove-item]')) {
      state.items.splice(parseInt(el.dataset.removeItem), 1);
      saveState();
      renderItems();
      updateLoadMeter();
      return;
    }

    // Claims toggle
    const claimEl = el.closest('.claim[data-claim]');
    if (claimEl) {
      const key = claimEl.dataset.claim;
      if (key === 'claim_lair') return; // Lair is always claimed
      state[key] = !state[key];
      saveState();
      renderClaims();
      return;
    }

    // Crew contact status
    if (el.matches('[data-crew-contact-status]')) {
      const i = parseInt(el.dataset.crewContactStatus);
      const val = el.dataset.statusVal;
      state.crewContacts[i].status = state.crewContacts[i].status === val ? 'neutral' : val;
      saveState();
      renderCrewContacts();
      return;
    }

    // Remove crew contact
    if (el.matches('[data-remove-crew-contact]')) {
      state.crewContacts.splice(parseInt(el.dataset.removeCrewContact), 1);
      saveState();
      renderCrewContacts();
      return;
    }

    // Faction status
    if (el.matches('[data-faction-status]')) {
      const fi = parseInt(el.dataset.factionStatus);
      const val = el.dataset.value;
      state.factions[fi].status = state.factions[fi].status === val ? 'neutral' : val;
      saveState();
      renderFactions();
      return;
    }

    // Remove faction
    if (el.matches('[data-remove-faction]')) {
      const fi = parseInt(el.dataset.removeFaction);
      if (confirm(`Remove faction "${state.factions[fi].name || 'Unnamed'}"?`)) {
        state.factions.splice(fi, 1);
        saveState();
        renderFactions();
      }
      return;
    }

    // Remove faction clock
    if (el.matches('[data-remove-faction-clock]')) {
      const fi = parseInt(el.dataset.removeFactionClock);
      const ci = parseInt(el.dataset.clockIdx);
      state.factions[fi].clocks.splice(ci, 1);
      saveState();
      renderFactions();
      return;
    }

    // Add faction clock
    if (el.matches('[data-add-faction-clock]')) {
      const fi = parseInt(el.dataset.addFactionClock);
      state.factions[fi].clocks.push({ name: '', segments: 4, filled: 0 });
      saveState();
      renderFactions();
      return;
    }

    // Add buttons
    if (el.matches('[data-add="ability"]')) {
      state.specialAbilities.push('');
      saveState();
      renderAbilities();
      const inputs = document.querySelectorAll('#special-abilities-list input');
      if (inputs.length) inputs[inputs.length - 1].focus();
      return;
    }
    if (el.matches('[data-add="friend"]')) {
      state.friends.push({ name: '', status: 'neutral' });
      saveState();
      renderFriends();
      const inputs = document.querySelectorAll('#friends-list input[type="text"]');
      if (inputs.length) inputs[inputs.length - 1].focus();
      return;
    }
    if (el.matches('[data-add="crewContact"]')) {
      state.crewContacts.push({ name: '', status: 'neutral' });
      saveState();
      renderCrewContacts();
      const inputs = document.querySelectorAll('#crew-contacts-list input[type="text"]');
      if (inputs.length) inputs[inputs.length - 1].focus();
      return;
    }
    if (el.matches('[data-add="item"]')) {
      state.items.push({ name: '', load: 1, carried: false });
      saveState();
      renderItems();
      updateLoadMeter();
      const inputs = document.querySelectorAll('#items-list input[type="text"]');
      if (inputs.length) inputs[inputs.length - 1].focus();
      return;
    }
    if (el.matches('[data-add="faction"]')) {
      state.factions.push({ name: '', tier: 0, status: 'neutral', notes: '', clocks: [] });
      saveState();
      renderFactions();
      const inputs = document.querySelectorAll('.faction-name-input');
      if (inputs.length) inputs[inputs.length - 1].focus();
      return;
    }
  });

  // Checkbox changes (armor, item carried)
  sheet.addEventListener('change', e => {
    const el = e.target;

    if (el.matches('input[type="checkbox"][data-field]')) {
      state[el.dataset.field] = el.checked;
      saveState();
      return;
    }

    if (el.matches('[data-item-carried]')) {
      state.items[parseInt(el.dataset.itemCarried)].carried = el.checked;
      saveState();
      updateLoadMeter();
      return;
    }

    // Load level radio
    if (el.matches('input[name="load"]')) {
      state.loadLevel = el.value;
      saveState();
      updateLoadMeter();
      return;
    }

    // Faction clock segment count change
    if (el.matches('[data-faction-clock-segments]')) {
      const fi = parseInt(el.dataset.factionClockSegments);
      const ci = parseInt(el.dataset.clockIdx);
      const newSegs = parseInt(el.value);
      const clock = state.factions[fi].clocks[ci];
      clock.segments = newSegs;
      if (clock.filled > newSegs) clock.filled = newSegs;
      saveState();
      renderFactions();
      return;
    }
  });

  // ── Toolbar ──
  document.getElementById('btn-export').addEventListener('click', exportCharacter);
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', importCharacter);
  document.getElementById('btn-print').addEventListener('click', printSheet);
  document.getElementById('btn-reset').addEventListener('click', resetCharacter);
}

// ── Export ──────────────────────────────
function exportCharacter() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const name = state.name || 'character';
  a.download = `blades-${name.toLowerCase().replace(/\s+/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Import ─────────────────────────────
function importCharacter(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      state = Object.assign(defaultState(), imported);
      saveState();
      renderAll();
    } catch {
      alert('Invalid character file.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ── Reset ──────────────────────────────
function resetCharacter() {
  if (!confirm('Start a new character? This will erase the current sheet.')) return;
  state = defaultState();
  saveState();
  renderAll();
}

// ── Print (open printable version in new tab) ──
function printSheet() {
  const w = window.open('', '_blank');
  if (!w) {
    alert('Popup blocked. Please allow popups for this site.');
    return;
  }

  // Clone the sheet content
  const sheetClone = document.querySelector('.sheet').cloneNode(true);

  // Show all tab panels, remove tab bar and toolbar
  const tabBar = sheetClone.querySelector('.tab-bar');
  if (tabBar) tabBar.remove();
  const toolbar = sheetClone.querySelector('.toolbar');
  if (toolbar) toolbar.remove();

  sheetClone.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.add('active');
    p.style.display = 'block';
  });

  // Remove interactive-only elements
  sheetClone.querySelectorAll('.add-btn, .clear-btn, .friend-remove, .ability-remove, .item-remove, .faction-remove, .faction-clock-remove, .collapse-toggle').forEach(el => el.remove());

  // Remove hidden file input
  const fileInput = sheetClone.querySelector('#import-file');
  if (fileInput) fileInput.remove();

  // Remove select dropdowns for faction clock segments
  sheetClone.querySelectorAll('.faction-clock-item select').forEach(el => el.remove());

  w.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(document.title)} - Print</title>
  <link rel="stylesheet" href="styles.css">
  <style>
    body { padding: 0.5rem; }
    .sheet { border: none; padding: 0.5rem; }
    .tab-panel { display: block !important; border-top: 2px solid #1a1a1a; padding-top: 1rem; margin-top: 1rem; }
    .add-btn, .clear-btn, .friend-remove, .ability-remove, .item-remove,
    .faction-remove, .faction-clock-remove, .collapse-toggle,
    .faction-clock-item select { display: none !important; }
    .faction-status-btn { pointer-events: none; }
    @media print {
      body { padding: 0; }
      .sheet { padding: 0; }
    }
  </style>
</head>
<body>${sheetClone.outerHTML}</body>
</html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
}

// ── Utility ────────────────────────────
function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ════════════════════════════════════════
   DICE SETTINGS PANEL (Three.js + Cannon-ES)
   DiceEngine is loaded from dice-engine.js as ES module
   ════════════════════════════════════════ */
var DICE_PRESETS = {
  realistic: { friction: 60, bounce: 25, weight: 55 },
  light:     { friction: 20, bounce: 55, weight: 20 },
  heavy:     { friction: 90, bounce: 10, weight: 85 },
};

// ── Slider-to-physics mapping for Cannon-ES engine ──
function sliderToCannonPhysics(friction, bounce, weight) {
  return {
    friction: 0.1 + (friction / 100) * 0.6,
    restitution: 0.05 + (bounce / 100) * 0.65,
    density: 0.3 + (weight / 100) * 2.0,
    linearDamping: 0.1 + (friction / 100) * 0.4,
    angularDamping: 0.1 + (friction / 100) * 0.4,
  };
}

function initDiceSettings() {
  // Wait for DiceEngine to be available (loaded async as module)
  if (typeof window.DiceEngine === 'undefined') {
    setTimeout(initDiceSettings, 100);
    return;
  }

  // Initialize the engine
  DiceEngine.init();

  var panel     = document.getElementById('dice-settings');
  var btnOpen   = document.getElementById('btn-dice-settings');
  var btnClose  = document.getElementById('dice-settings-close');
  var sFriction = document.getElementById('dice-slider-friction');
  var sBounce   = document.getElementById('dice-slider-bounce');
  var sWeight   = document.getElementById('dice-slider-weight');
  var vFriction = document.getElementById('dice-val-friction');
  var vBounce   = document.getElementById('dice-val-bounce');
  var vWeight   = document.getElementById('dice-val-weight');

  // Skin controls
  var skinColor    = document.getElementById('dice-skin-color');
  var skinPip      = document.getElementById('dice-skin-pip');
  var skinMaterial = document.getElementById('dice-skin-material');

  // Load saved settings
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem('bladesDS')); } catch(e) {}
  if (saved) {
    if (saved.friction !== undefined) sFriction.value = saved.friction;
    if (saved.bounce !== undefined) sBounce.value = saved.bounce;
    if (saved.weight !== undefined) sWeight.value = saved.weight;
    if (saved.preset) highlightPreset(saved.preset);
    if (saved.diceColor) skinColor.value = saved.diceColor;
    if (saved.pipColor) skinPip.value = saved.pipColor;
    if (saved.material) skinMaterial.value = saved.material;
  }

  applySliders();
  applySkinControls();

  function applySliders() {
    var f = parseInt(sFriction.value);
    var b = parseInt(sBounce.value);
    var w = parseInt(sWeight.value);
    vFriction.textContent = f;
    vBounce.textContent   = b;
    vWeight.textContent   = w;
    DiceEngine.applySettings(sliderToCannonPhysics(f, b, w));
  }

  function applySkinControls() {
    DiceEngine.applySkin({
      diceColor: skinColor.value,
      pipColor: skinPip.value,
      material: skinMaterial.value,
    });
  }

  function saveSettings(presetName) {
    localStorage.setItem('bladesDS', JSON.stringify({
      friction: parseInt(sFriction.value),
      bounce:   parseInt(sBounce.value),
      weight:   parseInt(sWeight.value),
      preset:   presetName || '',
      diceColor: skinColor.value,
      pipColor:  skinPip.value,
      material:  skinMaterial.value,
    }));
  }

  function highlightPreset(name) {
    panel.querySelectorAll('.dice-preset-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.preset === name);
    });
  }

  function clearPresetHighlight() {
    panel.querySelectorAll('.dice-preset-btn').forEach(function(btn) {
      btn.classList.remove('active');
    });
  }

  sFriction.addEventListener('input', function() { applySliders(); clearPresetHighlight(); saveSettings(); });
  sBounce.addEventListener('input',   function() { applySliders(); clearPresetHighlight(); saveSettings(); });
  sWeight.addEventListener('input',   function() { applySliders(); clearPresetHighlight(); saveSettings(); });

  // Skin change handlers
  skinColor.addEventListener('input', function() { applySkinControls(); saveSettings(); });
  skinPip.addEventListener('input', function() { applySkinControls(); saveSettings(); });
  skinMaterial.addEventListener('change', function() { applySkinControls(); saveSettings(); });

  panel.querySelectorAll('.dice-preset-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var p = DICE_PRESETS[btn.dataset.preset];
      if (!p) return;
      sFriction.value = p.friction;
      sBounce.value   = p.bounce;
      sWeight.value   = p.weight;
      applySliders();
      highlightPreset(btn.dataset.preset);
      saveSettings(btn.dataset.preset);
    });
  });

  function togglePanel() {
    if (panel.classList.contains('open')) {
      if (typeof gsap !== 'undefined') {
        gsap.to(panel, { opacity: 0, y: 10, scale: 0.95, duration: 0.25, ease: 'power2.in', onComplete: function() { panel.classList.remove('open'); } });
      } else {
        panel.classList.remove('open');
        panel.style.opacity = '0';
      }
    } else {
      panel.classList.add('open');
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(panel, { opacity: 0, y: 10, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'back.out(1.7)' });
      } else {
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0) scale(1)';
      }
    }
  }

  btnOpen.addEventListener('click', togglePanel);
  btnClose.addEventListener('click', togglePanel);
}

/* ════════════════════════════════════════
   GSAP ANIMATIONS — PAGE JUICE
   ════════════════════════════════════════ */

function initAnimations() {
  if (typeof gsap === 'undefined') return;

  // ── Page load entrance ──
  var tl = gsap.timeline({ defaults: { ease: 'power3.out' }});
  tl.from('.sheet-header', { opacity: 0, y: -20, duration: 0.5 })
    .from('.tab-bar .tab', { opacity: 0, y: -10, duration: 0.3, stagger: 0.07 }, '-=0.25')
    .from('.tab-panel.active', { opacity: 0, duration: 0.4 }, '-=0.1')
    .from('.toolbar', { opacity: 0, y: 10, duration: 0.3 }, '-=0.2')
    .from('.dice-toolbar', { opacity: 0, y: 20, duration: 0.3 }, '-=0.25');

  // Stagger sections within active tab
  gsap.from('.tab-panel.active .section, .tab-panel.active .crew-trackers, .tab-panel.active .character-info', {
    opacity: 0, y: 15, duration: 0.35, stagger: 0.05, delay: 0.35, ease: 'power2.out'
  });

  // Stagger action rows
  gsap.from('.tab-panel.active .action-row', {
    opacity: 0, x: -8, duration: 0.25, stagger: 0.02, delay: 0.5, ease: 'power2.out'
  });
}

// ── GSAP-enhanced tab switching ──
function switchTabAnimated(tabName) {
  if (typeof gsap === 'undefined') { switchTab(tabName); return; }

  var currentPanel = document.querySelector('.tab-panel.active');
  var newPanel = document.querySelector('.tab-panel[data-tab="' + tabName + '"]');
  if (!newPanel || currentPanel === newPanel) return;

  document.querySelectorAll('.tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.tab === tabName);
  });

  gsap.to(currentPanel, {
    opacity: 0, y: 8, duration: 0.18, ease: 'power2.in',
    onComplete: function() {
      currentPanel.classList.remove('active');
      currentPanel.style.opacity = '';
      currentPanel.style.transform = '';
      newPanel.classList.add('active');

      gsap.fromTo(newPanel,
        { opacity: 0, y: -8 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );

      var targets = newPanel.querySelectorAll('.section, .crew-trackers, .factions-header, .crew-section-header, .character-info');
      if (targets.length) {
        gsap.from(targets, { opacity: 0, y: 12, duration: 0.3, stagger: 0.04, ease: 'power2.out' });
      }
    }
  });
}

// ── GSAP-enhanced section collapse ──
function toggleCollapseAnimated(section) {
  var body = section.querySelector('.section-body');
  if (!body) return;

  if (typeof gsap === 'undefined') {
    section.classList.toggle('collapsed');
    return;
  }

  var toggle = section.querySelector('.collapse-toggle');

  if (section.classList.contains('collapsed')) {
    section.classList.remove('collapsed');
    var h = body.scrollHeight;
    gsap.fromTo(body,
      { height: 0, opacity: 0, overflow: 'hidden' },
      { height: h, opacity: 1, duration: 0.3, ease: 'power2.out', clearProps: 'all' }
    );
    if (toggle) gsap.to(toggle, { rotation: 0, duration: 0.25, ease: 'power2.out' });
  } else {
    var startH = body.offsetHeight;
    if (toggle) gsap.to(toggle, { rotation: -90, duration: 0.25, ease: 'power2.in' });
    gsap.fromTo(body,
      { height: startH, overflow: 'hidden' },
      { height: 0, opacity: 0, duration: 0.25, ease: 'power2.in',
        onComplete: function() {
          section.classList.add('collapsed');
          gsap.set(body, { clearProps: 'all' });
        }
      }
    );
  }
}

// ── Start ──────────────────────────────
document.addEventListener('DOMContentLoaded', init);
