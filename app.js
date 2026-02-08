/* ════════════════════════════════════════
   Blades in the Dark — Character Sheet
   Interactive Logic & Local Storage
   ════════════════════════════════════════ */

const STORAGE_KEY = 'blades-character-sheet';

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
  document.querySelectorAll('.box-track').forEach(track => {
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
  document.querySelectorAll('.clock').forEach(svg => {
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

// ── Event Binding ──────────────────────
function bindEvents() {
  const sheet = document.querySelector('.sheet');

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

    // Box tracks (stress, trauma, stash, coin)
    if (el.matches('.box-track .box')) {
      const track = el.closest('.box-track');
      const field = track.dataset.track;
      const idx = parseInt(el.dataset.index);
      const current = state[field] || 0;
      // Click on the last filled box to decrement, otherwise set to clicked index + 1
      state[field] = (idx + 1 === current) ? current - 1 : idx + 1;
      saveState();
      renderBoxTracks();
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

    // Clock segments
    if (el.matches('.clock-seg')) {
      const svg = el.closest('.clock');
      const field = svg.dataset.clock;
      const segments = parseInt(svg.dataset.segments);
      const idx = parseInt(el.dataset.seg);
      const current = state[field] || 0;
      state[field] = (idx + 1 === current) ? current - 1 : idx + 1;
      saveState();
      renderClock();
      return;
    }

    // Clear XP track
    if (el.matches('[data-clear]')) {
      state[el.dataset.clear] = 0;
      saveState();
      renderXpTracks();
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
    if (el.matches('.claim[data-claim]') || el.closest('.claim[data-claim]')) {
      const claimEl = el.matches('.claim[data-claim]') ? el : el.closest('.claim[data-claim]');
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

    // Add buttons
    if (el.matches('[data-add="ability"]')) {
      state.specialAbilities.push('');
      saveState();
      renderAbilities();
      // Focus the new input
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
  });

  // ── Toolbar ──
  document.getElementById('btn-export').addEventListener('click', exportCharacter);
  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', importCharacter);
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

// ── Utility ────────────────────────────
function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Start ──────────────────────────────
document.addEventListener('DOMContentLoaded', init);
