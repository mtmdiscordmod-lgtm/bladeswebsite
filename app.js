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
  initDice();
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

  // Tab clicks
  document.querySelectorAll('.tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
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

    // Collapse toggle
    if (el.matches('.collapse-toggle')) {
      const section = el.closest('.section');
      if (section) section.classList.toggle('collapsed');
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
   DICE PHYSICS SYSTEM — TRUE 3D CUBE
   ════════════════════════════════════════ */

const DICE = {
  dice: [],
  container: null,
  animFrame: null,
  friction: 0.982,
  bounce: 0.6,
  minVelocity: 0.4,
  dieSize: 54,
  maxDice: 10,
};

const DIE_PATTERNS = {
  1: [5],
  2: [3, 7],
  3: [3, 5, 7],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

function initDice() {
  DICE.container = document.getElementById('dice-container');
  document.getElementById('btn-add-die').addEventListener('click', addDie);
  document.getElementById('btn-remove-die').addEventListener('click', removeLastDie);
}

function addDie() {
  if (DICE.dice.length >= DICE.maxDice) return;

  const die = {
    x: window.innerWidth / 2 - DICE.dieSize / 2 + (Math.random() - 0.5) * 80,
    y: window.innerHeight / 2 - DICE.dieSize / 2 + (Math.random() - 0.5) * 80,
    vx: 0,
    vy: 0,
    rotX: Math.floor(Math.random() * 4) * 90,
    rotY: Math.floor(Math.random() * 4) * 90,
    rotZ: 0,
    rotSpeedX: 0,
    rotSpeedY: 0,
    rotSpeedZ: 0,
    settled: true,
    dragging: false,
    el: null,
    cubeEl: null,
    shadowEl: null,
  };

  const el = document.createElement('div');
  el.className = 'die';

  const shadowEl = document.createElement('div');
  shadowEl.className = 'die-shadow';
  el.appendChild(shadowEl);

  const cubeEl = document.createElement('div');
  cubeEl.className = 'die-cube';

  // Build all 6 faces once
  for (let face = 1; face <= 6; face++) {
    const faceEl = document.createElement('div');
    faceEl.className = 'die-face die-face--' + face;
    faceEl.innerHTML = renderDieDots(face);
    cubeEl.appendChild(faceEl);
  }

  el.appendChild(cubeEl);

  el.style.left = die.x + 'px';
  el.style.top = die.y + 'px';
  DICE.container.appendChild(el);
  die.el = el;
  die.cubeEl = cubeEl;
  die.shadowEl = shadowEl;

  updateDie3D(die);
  setupDieDrag(die);
  DICE.dice.push(die);
}

function removeLastDie() {
  if (DICE.dice.length === 0) return;
  const die = DICE.dice.pop();
  die.el.remove();
  if (DICE.dice.length === 0 && DICE.animFrame) {
    cancelAnimationFrame(DICE.animFrame);
    DICE.animFrame = null;
  }
}

function renderDieDots(value) {
  const dots = DIE_PATTERNS[value] || [];
  let html = '';
  for (let i = 1; i <= 9; i++) {
    html += dots.includes(i)
      ? '<span class="die-dot"></span>'
      : '<span></span>';
  }
  return html;
}

function updateDie3D(die, speed) {
  if (speed === undefined) {
    speed = Math.sqrt(die.vx * die.vx + die.vy * die.vy);
  }

  let height;
  if (die.dragging) {
    height = 0.5;
  } else if (die.settled) {
    height = 0;
  } else {
    height = Math.min(speed / 20, 1);
  }

  // Lift and scale the cube based on "height"
  const lift = height * 14;
  const scale = 1 + height * 0.06;
  die.cubeEl.style.transform =
    'translateY(' + (-lift) + 'px) scale(' + scale + ') ' +
    'rotateX(' + die.rotX + 'deg) rotateY(' + die.rotY + 'deg) rotateZ(' + die.rotZ + 'deg)';

  // Shadow grows larger and more diffuse when higher
  const sw = 40 + height * 20;
  const sh = 10 + height * 8;
  const blur = height * 5;
  const opacity = 0.4 - height * 0.15;

  die.shadowEl.style.width = sw + 'px';
  die.shadowEl.style.height = sh + 'px';
  die.shadowEl.style.filter = 'blur(' + blur + 'px)';
  die.shadowEl.style.opacity = opacity;
  die.shadowEl.style.bottom = (-6 - height * 6) + 'px';
}

function setupDieDrag(die) {
  let history = [];

  function onDown(e) {
    e.preventDefault();
    die.dragging = true;
    die.settled = false;
    die.vx = 0;
    die.vy = 0;
    die.rotSpeedX = 0;
    die.rotSpeedY = 0;
    die.rotSpeedZ = 0;
    history = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
    die.el.setPointerCapture(e.pointerId);
    die.el.classList.add('grabbing');
    updateDie3D(die);
  }

  function onMove(e) {
    if (!die.dragging) return;
    e.preventDefault();
    die.x = e.clientX - DICE.dieSize / 2;
    die.y = e.clientY - DICE.dieSize / 2;
    die.el.style.left = die.x + 'px';
    die.el.style.top = die.y + 'px';

    history.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (history.length > 6) history.shift();
  }

  function onUp(e) {
    if (!die.dragging) return;
    die.dragging = false;
    die.el.classList.remove('grabbing');

    // Calculate throw velocity from recent movement
    if (history.length >= 2) {
      const first = history[0];
      const last = history[history.length - 1];
      const dt = (last.t - first.t) / 1000;
      if (dt > 0.001) {
        const throwScale = 0.018;
        const rawVx = (last.x - first.x) / dt;
        const rawVy = (last.y - first.y) / dt;
        die.vx = rawVx * throwScale;
        die.vy = rawVy * throwScale;
        // 3D tumble from throw direction
        die.rotSpeedX = die.vy * 3;
        die.rotSpeedY = -die.vx * 3;
        die.rotSpeedZ = (die.vx - die.vy) * 0.8;
        die.settled = false;
      }
    }

    startPhysicsLoop();
  }

  die.el.addEventListener('pointerdown', onDown);
  die.el.addEventListener('pointermove', onMove);
  die.el.addEventListener('pointerup', onUp);
  die.el.addEventListener('pointercancel', onUp);
}

let diceLastTime = 0;

function dicePhysicsLoop(timestamp) {
  if (!diceLastTime) diceLastTime = timestamp;
  const rawDt = (timestamp - diceLastTime) / 16.67;
  const dt = Math.min(rawDt, 3);
  diceLastTime = timestamp;

  let anyMoving = false;

  const maxX = window.innerWidth - DICE.dieSize;
  const maxY = window.innerHeight - DICE.dieSize;

  for (const die of DICE.dice) {
    if (die.dragging || die.settled) continue;

    // Apply friction
    const f = Math.pow(DICE.friction, dt);
    die.vx *= f;
    die.vy *= f;
    die.rotSpeedX *= f;
    die.rotSpeedY *= f;
    die.rotSpeedZ *= f;

    // Update position
    die.x += die.vx * dt;
    die.y += die.vy * dt;

    // Update 3D rotation
    die.rotX += die.rotSpeedX * dt;
    die.rotY += die.rotSpeedY * dt;
    die.rotZ += die.rotSpeedZ * dt;

    // Bounce off edges
    let bounced = false;
    if (die.x < 0) {
      die.x = 0;
      die.vx *= -DICE.bounce;
      die.rotSpeedY *= -0.6;
      bounced = true;
    } else if (die.x > maxX) {
      die.x = maxX;
      die.vx *= -DICE.bounce;
      die.rotSpeedY *= -0.6;
      bounced = true;
    }

    if (die.y < 0) {
      die.y = 0;
      die.vy *= -DICE.bounce;
      die.rotSpeedX *= -0.6;
      bounced = true;
    } else if (die.y > maxY) {
      die.y = maxY;
      die.vy *= -DICE.bounce;
      die.rotSpeedX *= -0.6;
      bounced = true;
    }

    // Add random spin nudge on bounce
    if (bounced) {
      die.rotSpeedZ += (Math.random() - 0.5) * 4;
    }

    // Update DOM position
    die.el.style.left = die.x + 'px';
    die.el.style.top = die.y + 'px';

    // Check speed (both linear and rotational)
    const speed = Math.sqrt(die.vx * die.vx + die.vy * die.vy);
    const rotSpeed = Math.sqrt(
      die.rotSpeedX * die.rotSpeedX +
      die.rotSpeedY * die.rotSpeedY +
      die.rotSpeedZ * die.rotSpeedZ
    );

    if (speed < DICE.minVelocity && rotSpeed < 1) {
      // Settle — snap rotation so a clean face shows
      die.vx = 0;
      die.vy = 0;
      die.rotSpeedX = 0;
      die.rotSpeedY = 0;
      die.rotSpeedZ = 0;
      die.settled = true;
      die.rotX = Math.round(die.rotX / 90) * 90;
      die.rotY = Math.round(die.rotY / 90) * 90;
      die.rotZ = Math.round(die.rotZ / 90) * 90;
      updateDie3D(die, 0);
    } else {
      anyMoving = true;
      updateDie3D(die, speed);
    }
  }

  if (anyMoving || DICE.dice.some(d => d.dragging)) {
    DICE.animFrame = requestAnimationFrame(dicePhysicsLoop);
  } else {
    DICE.animFrame = null;
    diceLastTime = 0;
  }
}

function startPhysicsLoop() {
  if (!DICE.animFrame) {
    diceLastTime = 0;
    DICE.animFrame = requestAnimationFrame(dicePhysicsLoop);
  }
}

// ── Start ──────────────────────────────
document.addEventListener('DOMContentLoaded', init);
