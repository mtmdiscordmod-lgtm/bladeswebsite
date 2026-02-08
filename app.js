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
  DiceEngine.init();
  initDiceSettings();
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
   DICE PHYSICS — MATTER.JS ENGINE
   ════════════════════════════════════════ */

var DiceEngine = (function() {
  // Matter.js aliases
  var Engine, Bodies, Body, Composite, Events, Mouse, MouseConstraint, Runner, Render;
  var engine, runner, mConstraint;
  var walls = [];
  var dice = [];
  var container;
  var animFrame = null;
  var maxDice = 10;
  var dieSize = 54;
  var wallThickness = 60;
  var selectedDice = [];

  // Physics settings (mapped from sliders)
  var settings = {
    restitution: 0.25,
    frictionAir: 0.06,
    density: 0.004,
    friction: 0.3,
  };

  // Each die object: { body, el, cubeEl, shadowEl, resultEl, rotX, rotY, rotZ, rotVX, rotVY, rotVZ, settled, selected }

  var DIE_PATTERNS = {
    1: [5],
    2: [3, 7],
    3: [3, 5, 7],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9],
  };

  function init() {
    if (typeof Matter === 'undefined') {
      console.warn('Matter.js not loaded — dice disabled');
      return;
    }

    Engine = Matter.Engine;
    Bodies = Matter.Bodies;
    Body = Matter.Body;
    Composite = Matter.Composite;
    Events = Matter.Events;
    Mouse = Matter.Mouse;
    MouseConstraint = Matter.MouseConstraint;
    Runner = Matter.Runner;

    container = document.getElementById('dice-container');

    // Create engine with zero gravity (top-down perspective)
    engine = Engine.create({
      gravity: { x: 0, y: 0 },
    });

    // Create walls
    buildWalls();
    window.addEventListener('resize', buildWalls);

    // Set up mouse constraint for grab & throw
    setupMouseConstraint();

    // Collision events for visual feedback
    Events.on(engine, 'collisionStart', onCollision);

    // Set up selection box
    setupSelectionBox();

    // Toolbar buttons
    document.getElementById('btn-add-die').addEventListener('click', addDie);
    document.getElementById('btn-remove-die').addEventListener('click', removeLastDie);

    // Start the engine and render loop
    runner = Runner.create();
    Runner.run(runner, engine);
    startRenderLoop();
  }

  function buildWalls() {
    // Remove old walls
    if (walls.length) {
      Composite.remove(engine.world, walls);
      walls = [];
    }

    var w = window.innerWidth;
    var h = window.innerHeight;
    var t = wallThickness;

    walls = [
      Bodies.rectangle(w / 2, -t / 2, w + t * 2, t, { isStatic: true }),       // top
      Bodies.rectangle(w / 2, h + t / 2, w + t * 2, t, { isStatic: true }),     // bottom
      Bodies.rectangle(-t / 2, h / 2, t, h + t * 2, { isStatic: true }),        // left
      Bodies.rectangle(w + t / 2, h / 2, t, h + t * 2, { isStatic: true }),     // right
    ];

    walls.forEach(function(wall) {
      wall.restitution = 0.3;
      wall.friction = 0.5;
    });

    Composite.add(engine.world, walls);
  }

  function setupMouseConstraint() {
    var mouse = Mouse.create(document.body);

    // Prevent Matter's mouse from capturing scroll events
    mouse.element.removeEventListener('mousewheel', mouse.mousewheel);
    mouse.element.removeEventListener('DOMMouseScroll', mouse.mousewheel);

    mConstraint = MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.6,
        damping: 0.1,
        render: { visible: false },
      },
    });

    Composite.add(engine.world, mConstraint);

    // Track drag state for tilt
    Events.on(mConstraint, 'startdrag', function(e) {
      var die = getDieByBody(e.body);
      if (die) {
        die.settled = false;
        die.el.classList.add('grabbing');
        // Clear result label when grabbed
        if (die.resultEl) {
          die.resultEl.style.opacity = '0';
        }
      }
    });

    Events.on(mConstraint, 'enddrag', function(e) {
      var die = getDieByBody(e.body);
      if (die) {
        die.el.classList.remove('grabbing');

        // Transfer velocity into tumble
        var vel = e.body.velocity;
        var speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
        die.rotVX += vel.y * 0.8;
        die.rotVY += -vel.x * 0.8;
        die.rotVZ += (vel.x - vel.y) * 0.3;

        // If this die is selected and part of a group, fan-out throw the others
        if (die.selected && selectedDice.length > 1) {
          fanOutThrow(die, vel);
        }
      }
    });
  }

  function addDie() {
    if (dice.length >= maxDice) return;

    var cx = window.innerWidth / 2 + (Math.random() - 0.5) * 80;
    var cy = window.innerHeight / 2 + (Math.random() - 0.5) * 80;

    var body = Bodies.rectangle(cx, cy, dieSize - 4, dieSize - 4, {
      chamfer: { radius: 5 },
      restitution: settings.restitution,
      frictionAir: settings.frictionAir,
      density: settings.density,
      friction: settings.friction,
    });

    Composite.add(engine.world, body);

    // Create DOM element
    var el = document.createElement('div');
    el.className = 'die';

    var shadowEl = document.createElement('div');
    shadowEl.className = 'die-shadow';
    el.appendChild(shadowEl);

    var cubeEl = document.createElement('div');
    cubeEl.className = 'die-cube';

    for (var face = 1; face <= 6; face++) {
      var faceEl = document.createElement('div');
      faceEl.className = 'die-face die-face--' + face;
      faceEl.innerHTML = renderDieDots(face);
      cubeEl.appendChild(faceEl);
    }

    el.appendChild(cubeEl);

    var resultEl = document.createElement('div');
    resultEl.className = 'die-result';
    el.appendChild(resultEl);

    container.appendChild(el);

    var die = {
      body: body,
      el: el,
      cubeEl: cubeEl,
      shadowEl: shadowEl,
      resultEl: resultEl,
      rotX: Math.floor(Math.random() * 4) * 90,
      rotY: Math.floor(Math.random() * 4) * 90,
      rotZ: 0,
      rotVX: 0,
      rotVY: 0,
      rotVZ: 0,
      settled: true,
      selected: false,
      settleFrames: 0,
    };

    dice.push(die);

    // GSAP spawn animation
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(el,
        { scale: 0, opacity: 0, rotation: -180 },
        { scale: 1, opacity: 1, rotation: 0, duration: 0.4, ease: 'back.out(1.7)' }
      );
    }
  }

  function removeLastDie() {
    if (dice.length === 0) return;
    var die = dice[dice.length - 1];

    // Deselect if needed
    var selIdx = selectedDice.indexOf(die);
    if (selIdx >= 0) selectedDice.splice(selIdx, 1);

    if (typeof gsap !== 'undefined') {
      gsap.to(die.el, {
        scale: 0, opacity: 0, rotation: 180, duration: 0.3, ease: 'power2.in',
        onComplete: function() {
          die.el.remove();
          Composite.remove(engine.world, die.body);
        }
      });
    } else {
      die.el.remove();
      Composite.remove(engine.world, die.body);
    }

    dice.pop();
  }

  function renderDieDots(value) {
    var dots = DIE_PATTERNS[value] || [];
    var html = '';
    for (var i = 1; i <= 9; i++) {
      html += dots.includes(i)
        ? '<span class="die-dot"></span>'
        : '<span></span>';
    }
    return html;
  }

  function getDieByBody(body) {
    for (var i = 0; i < dice.length; i++) {
      if (dice[i].body === body) return dice[i];
    }
    return null;
  }

  // ── Render loop: sync DOM to physics ──
  function startRenderLoop() {
    function loop() {
      for (var i = 0; i < dice.length; i++) {
        syncDie(dice[i]);
      }
      animFrame = requestAnimationFrame(loop);
    }
    animFrame = requestAnimationFrame(loop);
  }

  function syncDie(die) {
    var pos = die.body.position;
    var vel = die.body.velocity;
    var speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
    var angle = die.body.angle;

    // Position DOM element (centered on body)
    die.el.style.left = (pos.x - dieSize / 2) + 'px';
    die.el.style.top = (pos.y - dieSize / 2) + 'px';

    // Determine if being dragged via mouse constraint
    var isDragged = mConstraint.body === die.body;

    // 3D rotation: derive tumble from 2D velocity
    if (isDragged) {
      // Tilt toward movement direction while dragging
      var targetTiltX = Math.max(-18, Math.min(18, -vel.y * 0.04));
      var targetTiltY = Math.max(-18, Math.min(18, vel.x * 0.04));
      die.rotVX = die.rotVX * 0.7 + targetTiltX * 0.3;
      die.rotVY = die.rotVY * 0.7 + targetTiltY * 0.3;
    } else if (!die.settled) {
      // Free rolling: add rotational velocity from linear speed
      die.rotX += die.rotVX;
      die.rotY += die.rotVY;
      die.rotZ += die.rotVZ;

      // Rotational friction (air drag on tumble)
      var rotFriction = 0.94;
      die.rotVX *= rotFriction;
      die.rotVY *= rotFriction;
      die.rotVZ *= rotFriction;

      // Add rotation from linear movement (coupling)
      die.rotVX += vel.y * 0.02;
      die.rotVY -= vel.x * 0.02;

      // Snap spring toward nearest 90° as speed drops
      if (speed < 3) {
        var t = 1 - speed / 3;
        var pull = 0.08 * t * t;
        var targetX = Math.round(die.rotX / 90) * 90;
        var targetY = Math.round(die.rotY / 90) * 90;
        var targetZ = Math.round(die.rotZ / 90) * 90;
        die.rotVX += (targetX - die.rotX) * pull;
        die.rotVY += (targetY - die.rotY) * pull;
        die.rotVZ += (targetZ - die.rotZ) * pull;
        die.rotVX *= (1 - 0.04 * t);
        die.rotVY *= (1 - 0.04 * t);
        die.rotVZ *= (1 - 0.04 * t);
      }
    }

    // Settle detection
    var rotSpeed = Math.sqrt(die.rotVX * die.rotVX + die.rotVY * die.rotVY + die.rotVZ * die.rotVZ);
    if (!isDragged && !die.settled && speed < 0.3 && rotSpeed < 0.4) {
      var distX = Math.abs(die.rotX - Math.round(die.rotX / 90) * 90);
      var distY = Math.abs(die.rotY - Math.round(die.rotY / 90) * 90);
      var distZ = Math.abs(die.rotZ - Math.round(die.rotZ / 90) * 90);
      if (distX < 2 && distY < 2 && distZ < 2) {
        die.settleFrames++;
        if (die.settleFrames > 10) {
          settleDie(die);
        }
      } else {
        die.settleFrames = 0;
      }
    } else {
      die.settleFrames = 0;
    }

    // Visual: height based on speed
    var height;
    if (isDragged) {
      height = 0.5;
    } else if (die.settled) {
      height = 0;
    } else {
      height = Math.min(speed / 15, 1);
    }

    var lift = height * 14;
    var scale = 1 + height * 0.06;

    var rx = die.rotX + (isDragged ? die.rotVX : 0);
    var ry = die.rotY + (isDragged ? die.rotVY : 0);
    var rz = die.rotZ + angle * (180 / Math.PI);

    die.cubeEl.style.transform =
      'translateY(' + (-lift) + 'px) scale(' + scale + ') ' +
      'rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) rotateZ(' + rz + 'deg)';

    // Shadow
    var sw = 40 + height * 20;
    var sh = 10 + height * 8;
    var blur = height * 5;
    var opacity = 0.4 - height * 0.15;
    die.shadowEl.style.width = sw + 'px';
    die.shadowEl.style.height = sh + 'px';
    die.shadowEl.style.filter = 'blur(' + blur + 'px)';
    die.shadowEl.style.opacity = opacity;
    die.shadowEl.style.bottom = (-6 - height * 6) + 'px';
  }

  function settleDie(die) {
    die.settled = true;
    die.rotVX = 0;
    die.rotVY = 0;
    die.rotVZ = 0;
    die.rotX = Math.round(die.rotX / 90) * 90;
    die.rotY = Math.round(die.rotY / 90) * 90;
    die.rotZ = Math.round(die.rotZ / 90) * 90;
    Body.setVelocity(die.body, { x: 0, y: 0 });

    // Determine which face is up
    var result = getTopFace(die);

    // Show result label with GSAP
    if (die.resultEl) {
      die.resultEl.textContent = result;
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(die.resultEl,
          { opacity: 0, y: 5, scale: 0.8 },
          { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: 'back.out(1.7)' }
        );
        // Settle pulse on the die itself
        gsap.fromTo(die.cubeEl,
          { scale: 1 },
          { scale: 1.08, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' }
        );
      } else {
        die.resultEl.style.opacity = '1';
      }
    }
  }

  function getTopFace(die) {
    // Normalize rotations to 0-360 range
    var rx = ((die.rotX % 360) + 360) % 360;
    var ry = ((die.rotY % 360) + 360) % 360;

    // Round to nearest 90
    rx = Math.round(rx / 90) * 90 % 360;
    ry = Math.round(ry / 90) * 90 % 360;

    // Map rotation state to face number
    // Face 1 is front (rotY=0), Face 6 is back (rotY=180)
    // Face 2 is right (rotY=90), Face 5 is left (rotY=270)
    // Face 3 is bottom (rotX=90), Face 4 is top (rotX=270)
    if (rx === 0 || rx === 360) {
      if (ry === 0 || ry === 360) return 1;
      if (ry === 90) return 2;
      if (ry === 180) return 6;
      if (ry === 270) return 5;
    }
    if (rx === 90) return 4;
    if (rx === 270) return 3;
    if (rx === 180) {
      if (ry === 0 || ry === 360) return 6;
      if (ry === 90) return 5;
      if (ry === 180) return 1;
      if (ry === 270) return 2;
    }
    return 1; // fallback
  }

  // ── Collision visual feedback ──
  function onCollision(event) {
    var pairs = event.pairs;
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i];
      var dieA = getDieByBody(pair.bodyA);
      var dieB = getDieByBody(pair.bodyB);

      if (dieA) flashDie(dieA);
      if (dieB) flashDie(dieB);

      // Add rotational kick on collision
      if (dieA && !dieA.settled) {
        var velA = pair.bodyA.velocity;
        dieA.rotVX += (Math.random() - 0.5) * 3;
        dieA.rotVY += (Math.random() - 0.5) * 3;
      }
      if (dieB && !dieB.settled) {
        dieB.rotVX += (Math.random() - 0.5) * 3;
        dieB.rotVY += (Math.random() - 0.5) * 3;
      }
    }
  }

  function flashDie(die) {
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(die.el,
        { filter: 'brightness(1.6)' },
        { filter: 'brightness(1)', duration: 0.2, ease: 'power2.out', overwrite: true }
      );
    }
  }

  // ── Fan-out throw for selected dice ──
  function fanOutThrow(originDie, baseVel) {
    var speed = Math.sqrt(baseVel.x * baseVel.x + baseVel.y * baseVel.y);
    if (speed < 1) return;

    var baseAngle = Math.atan2(baseVel.y, baseVel.x);
    var spreadAngle = Math.PI / 6; // 30° total spread
    var count = selectedDice.length;

    selectedDice.forEach(function(die, idx) {
      if (die === originDie) return;

      var angleOffset = (idx / (count - 1) - 0.5) * spreadAngle;
      var throwAngle = baseAngle + angleOffset;
      var throwSpeed = speed * (0.7 + Math.random() * 0.3);

      Body.setVelocity(die.body, {
        x: Math.cos(throwAngle) * throwSpeed,
        y: Math.sin(throwAngle) * throwSpeed,
      });

      die.settled = false;
      die.settleFrames = 0;
      die.rotVX += (Math.random() - 0.5) * 8;
      die.rotVY += (Math.random() - 0.5) * 8;
      die.rotVZ += (Math.random() - 0.5) * 4;

      if (die.resultEl) {
        die.resultEl.style.opacity = '0';
      }
    });
  }

  // ── Ctrl+Click+Drag selection box ──
  function setupSelectionBox() {
    var selBox = document.getElementById('selection-box');
    var selStart = null;
    var isSelecting = false;

    document.addEventListener('pointerdown', function(e) {
      if (!e.ctrlKey && !e.metaKey) return;
      // Don't start selection if clicking on a die
      if (e.target.closest('.die')) return;

      isSelecting = true;
      selStart = { x: e.clientX, y: e.clientY };
      selBox.style.left = e.clientX + 'px';
      selBox.style.top = e.clientY + 'px';
      selBox.style.width = '0';
      selBox.style.height = '0';
      selBox.style.display = 'block';
      e.preventDefault();
    });

    document.addEventListener('pointermove', function(e) {
      if (!isSelecting) return;

      var x = Math.min(e.clientX, selStart.x);
      var y = Math.min(e.clientY, selStart.y);
      var w = Math.abs(e.clientX - selStart.x);
      var h = Math.abs(e.clientY - selStart.y);

      selBox.style.left = x + 'px';
      selBox.style.top = y + 'px';
      selBox.style.width = w + 'px';
      selBox.style.height = h + 'px';
    });

    document.addEventListener('pointerup', function(e) {
      if (!isSelecting) return;
      isSelecting = false;
      selBox.style.display = 'none';

      var rect = {
        left: Math.min(e.clientX, selStart.x),
        top: Math.min(e.clientY, selStart.y),
        right: Math.max(e.clientX, selStart.x),
        bottom: Math.max(e.clientY, selStart.y),
      };

      // Clear previous selection
      clearSelection();

      // Select dice within the box
      dice.forEach(function(die) {
        var pos = die.body.position;
        if (pos.x >= rect.left && pos.x <= rect.right &&
            pos.y >= rect.top && pos.y <= rect.bottom) {
          die.selected = true;
          die.el.classList.add('selected');
          selectedDice.push(die);
        }
      });

      // GSAP bounce on newly selected dice
      if (typeof gsap !== 'undefined') {
        selectedDice.forEach(function(die) {
          gsap.fromTo(die.cubeEl,
            { scale: 1.12 },
            { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' }
          );
        });
      }
    });

    // Click on empty space to deselect
    document.addEventListener('click', function(e) {
      if (e.ctrlKey || e.metaKey) return;
      if (e.target.closest('.die') || e.target.closest('.dice-toolbar') || e.target.closest('.dice-settings')) return;
      clearSelection();
    });
  }

  function clearSelection() {
    selectedDice.forEach(function(die) {
      die.selected = false;
      die.el.classList.remove('selected');
    });
    selectedDice = [];
  }

  // ── Apply slider settings to all dice bodies ──
  function applySettings(newSettings) {
    settings = Object.assign(settings, newSettings);
    dice.forEach(function(die) {
      die.body.restitution = settings.restitution;
      die.body.frictionAir = settings.frictionAir;
      die.body.density = settings.density;
      die.body.friction = settings.friction;
    });
  }

  return {
    init: init,
    addDie: addDie,
    removeLastDie: removeLastDie,
    applySettings: applySettings,
    getSettings: function() { return settings; },
  };
})();

/* ════════════════════════════════════════
   DICE SETTINGS PANEL (MATTER.JS)
   ════════════════════════════════════════ */

var DICE_PRESETS = {
  realistic: { friction: 60, bounce: 25, weight: 55 },
  light:     { friction: 20, bounce: 55, weight: 20 },
  heavy:     { friction: 90, bounce: 10, weight: 85 },
};

function sliderToMatterPhysics(friction, bounce, weight) {
  return {
    frictionAir: 0.02 + (friction / 100) * 0.10,   // 0.02–0.12 (table drag)
    restitution: 0.05 + (bounce / 100) * 0.65,      // 0.05–0.70 (bounciness)
    density: 0.001 + (weight / 100) * 0.009,         // 0.001–0.010 (mass)
    friction: 0.1 + (friction / 100) * 0.5,          // 0.1–0.6 (surface friction)
  };
}

function initDiceSettings() {
  var panel     = document.getElementById('dice-settings');
  var btnOpen   = document.getElementById('btn-dice-settings');
  var btnClose  = document.getElementById('dice-settings-close');
  var sFriction = document.getElementById('dice-slider-friction');
  var sBounce   = document.getElementById('dice-slider-bounce');
  var sWeight   = document.getElementById('dice-slider-weight');
  var vFriction = document.getElementById('dice-val-friction');
  var vBounce   = document.getElementById('dice-val-bounce');
  var vWeight   = document.getElementById('dice-val-weight');

  // Load saved settings
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem('bladesDS')); } catch(e) {}
  if (saved) {
    sFriction.value = saved.friction;
    sBounce.value   = saved.bounce;
    sWeight.value   = saved.weight;
    if (saved.preset) highlightPreset(saved.preset);
  }
  applySliders();

  function applySliders() {
    var f = parseInt(sFriction.value);
    var b = parseInt(sBounce.value);
    var w = parseInt(sWeight.value);
    vFriction.textContent = f;
    vBounce.textContent   = b;
    vWeight.textContent   = w;
    DiceEngine.applySettings(sliderToMatterPhysics(f, b, w));
  }

  function saveSettings(presetName) {
    localStorage.setItem('bladesDS', JSON.stringify({
      friction: parseInt(sFriction.value),
      bounce:   parseInt(sBounce.value),
      weight:   parseInt(sWeight.value),
      preset:   presetName || '',
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
