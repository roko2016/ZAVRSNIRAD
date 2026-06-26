/* ══════════════════════════════════════
   OUT AND ABOUT — Glavna logika aplikacije
   ══════════════════════════════════════ */

// ─── STANJE ───
let currentSlide = 0;
const totalSlides = 5;
let userPrefs = {
  interests: [],
  genres: [],
  when: null,
  age: null,
  gender: null
};
let currentUser = null;
let calendarEvents = [];
let favoriteEvents = [];
var rezervacije = []; // popunjava se kad korisnik rezervira stol
let currentEventId = null;
let selectedTable = null;
let currentClubFilter = 'sve';
let currentCatFilter = 'sve';
let editAvatar = '😊';

// za navigaciju po kalendarskim mjesecima
let calViewYear = new Date().getFullYear();
let calViewMonth = new Date().getMonth();

// ovo pamti koji klub/event je otvoren u modalu
let currentReserveEventId = null;
let currentReserveClubName = '';

// stanje chata
let chatPoruke = {};       // poruke po chatovima { chatId: [poruka, ...] }
let chatRedoslijed = [];   // ID-evi sortirani od najnovijeg razgovora
let aktivniChatId = null;  // koji chat je trenutno otvoren
let odabraniKontaktId = null; // za share modal
var chatReplyTimer = null;    // timeout za auto-odgovor
let neprocitane = {};      // { chatId: brojNeprocitanih }

// ─── PODACI CHATA ───
const CHAT_DATA = [
  {
    id: 1,
    ime: 'Luka Horvat',
    avatar: '👨',
    poruke: [
      { tekst: 'Ej brate, jesi vidio za Ultramarathon Festival?', od: 'drug', vrijeme: '14:23' },
      { tekst: 'Jesam! Prošle godine smo bili, fenomenalno je bilo', od: 'ja', vrijeme: '14:25' },
      { tekst: 'Da, idemo opet? Uzmi karte čim prije, brzo se rasprodaju', od: 'drug', vrijeme: '14:26' },
      { tekst: 'Već sam gledao, ima još mjesta. Uzimam sutra ujutro! 🔥', od: 'ja', vrijeme: '14:28' }
    ]
  },
  {
    id: 2,
    ime: 'Ana Kovač',
    avatar: '👩',
    poruke: [
      { tekst: 'Jakov Jozinović u Areni?! Idem sigurno!!!', od: 'drug', vrijeme: '11:05' },
      { tekst: 'Ma znaš da sam već ubačen u kalendar 😄', od: 'ja', vrijeme: '11:10' },
      { tekst: 'Haha, brzo si. Možeš li uzeti i meni kartu?', od: 'drug', vrijeme: '11:11' },
      { tekst: 'Naravno, javljam ti kad kupim!', od: 'ja', vrijeme: '11:15' }
    ]
  },
  {
    id: 3,
    ime: 'Matej Blažević',
    avatar: '🧔',
    poruke: [
      { tekst: 'Ovo subotu smo u Aquariusu, besplatan ulaz do ponoći', od: 'drug', vrijeme: '09:30' },
      { tekst: 'Savršeno, baš trebam izaći malo', od: 'ja', vrijeme: '09:45' },
      { tekst: 'Dođi malo ranije, oko 22h — ne čekaj u redu kasno', od: 'drug', vrijeme: '09:47' }
    ]
  },
  // novi kontakti — bez prethodnih poruka
  { id: 4, ime: 'Petra Novak',     avatar: '👩‍🦰', poruke: [] },
  { id: 5, ime: 'Ivan Perić',      avatar: '🧑',   poruke: [] },
  { id: 6, ime: 'Sara Jurić',      avatar: '👧',   poruke: [] },
  { id: 7, ime: 'Tomislav Babić',  avatar: '👨‍🦱', poruke: [] }
];

// ─── INICIJALIZACIJA ───
document.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  loadFromStorage();
  setTimeout(startApp, 2200);
});

function loadFromStorage() {
  const saved = localStorage.getItem('oab_prefs');
  if (saved) userPrefs = JSON.parse(saved);

  const user = localStorage.getItem('oab_user');
  if (user) currentUser = JSON.parse(user);

  const cal = localStorage.getItem('oab_calendar');
  if (cal) calendarEvents = JSON.parse(cal);

  const favs = localStorage.getItem('oab_favs');
  if (favs) favoriteEvents = JSON.parse(favs);

  const rez = localStorage.getItem('oab_rezervacije');
  if (rez) rezervacije = JSON.parse(rez);

  // chat poruke — ako nema u storageu, napuni defaultnima
  const chats = localStorage.getItem('oab_chats');
  if (chats) {
    chatPoruke = JSON.parse(chats);
  } else {
    CHAT_DATA.forEach(c => {
      chatPoruke[c.id] = c.poruke.map(p => ({ ...p }));
    });
  }

  // redoslijed razgovora (od najnovijeg)
  const redoslijed = localStorage.getItem('oab_chat_redoslijed');
  if (redoslijed) {
    chatRedoslijed = JSON.parse(redoslijed);
  } else {
    chatRedoslijed = CHAT_DATA.map(c => c.id);
  }

  // neprocitane poruke — inicijalno svaki od 3 chata ima 1
  const nepr = localStorage.getItem('oab_neprocitane');
  if (nepr) {
    neprocitane = JSON.parse(nepr);
  } else {
    neprocitane = { 1: 1, 2: 1, 3: 1 };
  }
}

function saveToStorage() {
  localStorage.setItem('oab_prefs', JSON.stringify(userPrefs));
  if (currentUser) localStorage.setItem('oab_user', JSON.stringify(currentUser));
  localStorage.setItem('oab_calendar', JSON.stringify(calendarEvents));
  localStorage.setItem('oab_favs', JSON.stringify(favoriteEvents));
  localStorage.setItem('oab_rezervacije', JSON.stringify(rezervacije));
  localStorage.setItem('oab_chats', JSON.stringify(chatPoruke));
  localStorage.setItem('oab_chat_redoslijed', JSON.stringify(chatRedoslijed));
  localStorage.setItem('oab_neprocitane', JSON.stringify(neprocitane));
}

function startApp() {
  const hasOnboarded = localStorage.getItem('oab_onboarded');
  const hasUser = localStorage.getItem('oab_user');

  if (hasUser) {
    goToMain();
  } else if (hasOnboarded) {
    showScreen('auth');
  } else {
    showScreen('onboarding');
  }
}

// ─── NAVIGACIJA EKRANA ───
function showScreen(id) {
  const current = document.querySelector('.screen.active');
  const next = document.getElementById(id);
  if (!next) return;

  if (current && current !== next) {
    current.classList.remove('active');
    current.classList.add('exit-left');
    setTimeout(() => current.classList.remove('exit-left'), 400);
  }

  next.classList.add('active');
  next.scrollTop = 0;

  if (id === 'edit-profile') openEditProfileScreen();
}

// ─── ONBOARDING (uvodni koraci) ───
function toggleInterest(el) {
  el.classList.toggle('selected');
  const interest = el.dataset.interest;
  if (el.classList.contains('selected')) {
    userPrefs.interests.push(interest);
  } else {
    userPrefs.interests = userPrefs.interests.filter(i => i !== interest);
  }
}

function selectOption(el, type) {
  const siblings = el.parentElement.querySelectorAll('.option-item');
  siblings.forEach(s => s.classList.remove('selected'));
  el.classList.add('selected');
  userPrefs[type] = el.dataset.value;
}

function nextSlide() {
  if (currentSlide < totalSlides - 1) {
    currentSlide++;
    updateSlider();
  } else {
    finishOnboarding();
  }
}

function prevSlide() {
  if (currentSlide > 0) {
    currentSlide--;
    updateSlider();
  }
}

function updateSlider() {
  const slides = document.getElementById('onboardingSlides');
  slides.style.transform = `translateX(-${currentSlide * 20}%)`;

  const dots = document.querySelectorAll('.progress-dot');
  dots.forEach((d, i) => {
    d.classList.toggle('active', i === currentSlide);
  });

  const btn = document.getElementById('nextBtn');
  if (currentSlide === totalSlides - 1) {
    btn.textContent = 'Kreni!';
  } else {
    btn.textContent = 'Dalje';
  }

  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.classList.toggle('hidden', currentSlide === 0);
  }
}

function skipOnboarding() {
  finishOnboarding();
}

function finishOnboarding() {
  localStorage.setItem('oab_onboarded', '1');
  saveToStorage();
  showScreen('auth');
}

// ─── AUTENTIFIKACIJA ───
function switchTab(tab) {
  document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
  document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
}

function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const name = email.split('@')[0];
  loginUser({ name: capitalizeFirst(name), email });
}

function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  loginUser({ name, email });
}

function quickLogin() {
  loginUser({ name: 'Gost', email: 'gost@outandabout.hr' });
}

function loginUser(user) {
  currentUser = user;
  saveToStorage();
  goToMain();
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ─── GLAVNA APLIKACIJA ───
function goToMain() {
  const mainApp = document.getElementById('main-app');
  mainApp.classList.add('active');

  // sakrij sve ostalo
  ['splash', 'onboarding', 'auth'].forEach(id => {
    document.getElementById(id).classList.remove('active');
  });

  // pokazi bottom nav — sada je vidljiv na svim ekranima
  const nav = document.getElementById('mainNav');
  if (nav) nav.classList.remove('hidden');
  azurirajBadge();

  initHome();
  initSearch();
  initClubs();
  initProfile();

  // pocni na home tabu
  showTab('home');
}

// ─── POČETNA ───
function initHome() {
  if (currentUser) {
    const firstName = currentUser.name.split(' ')[0];
    document.getElementById('homeGreetingName').textContent =
      firstName !== 'Gost' ? `Dobrodošao, ${firstName}!` : 'Spreman za večeras?';
    const avatarBtn = document.querySelector('.avatar-btn');
    if (avatarBtn) avatarBtn.textContent = currentUser.avatar || '😊';
  }

  renderSuggested();
  renderHomeCalStrip();
  renderTop10();
}

function renderSuggested() {
  const row = document.getElementById('suggestedRow');
  // filtriraj prema interesima korisnika ili prikaži sve
  const interests = [...(userPrefs.interests || []), ...(userPrefs.genres || [])];
  let toShow = EVENTS_DATA.filter(e => !e.isBig);
  if (interests.length > 0) {
    const filtr = toShow.filter(e => e.tags && e.tags.some(t =>
      interests.some(i => t.toLowerCase().includes(i.toLowerCase().replace('-', '')))
    ));
    if (filtr.length > 0) toShow = filtr;
  }
  row.innerHTML = toShow.slice(0, 6).map(e => eventCard(e)).join('');
}

function renderTop10() {
  const row = document.getElementById('topRow');
  // malo shuffle za dojam da se mijenja
  const top = [...EVENTS_DATA].sort(() => Math.random() - 0.5).slice(0, 8);
  row.innerHTML = top.map(e => eventCard(e)).join('');
}

function eventCard(event) {
  const isFav = favoriteEvents.includes(event.id);
  const dateStr = formatDate(event.date);
  return `
    <div class="event-card" onclick="openEvent(${event.id})">
      <button class="heart-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFav(${event.id}, this)">
        ${isFav ? '❤️' : '🤍'}
      </button>
      <img class="event-card-img" src="${event.image}" alt="${event.title}" loading="lazy" onerror="imgError(this, this.alt)">
      <div class="event-card-body">
        <div class="event-cat-tag">${catLabel(event.category)}</div>
        <div class="event-card-title">${event.title}</div>
        <div class="event-card-meta">
          <span class="event-card-date">📅 ${dateStr}</span>
          <span>📍 ${event.location}</span>
        </div>
      </div>
    </div>`;
}

// ─── PRETRAGA ───
function initSearch() {
  renderSearchResults(EVENTS_DATA);
}

function onSearch(val) {
  const q = val.toLowerCase().trim();
  let results = q
    ? EVENTS_DATA.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        (e.tags && e.tags.some(t => t.includes(q)))
      )
    : EVENTS_DATA;

  if (currentCatFilter !== 'sve') {
    results = results.filter(e => e.category === currentCatFilter);
  }

  renderSearchResults(results);
}

function filterCat(el) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  currentCatFilter = el.dataset.cat;

  const q = document.getElementById('searchInput').value;
  onSearch(q);
}

function renderSearchResults(eventList) {
  const grid = document.getElementById('searchResults');
  if (eventList.length === 0) {
    grid.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🔍</div>
      <div class="empty-title">Nema rezultata</div>
      <div class="empty-sub">Pokušaj s drugim pojmom ili kategorijom</div>
    </div>`;
    return;
  }
  grid.innerHTML = eventList.map(e => eventCardGrid(e)).join('');
}

function eventCardGrid(event) {
  const isFav = favoriteEvents.includes(event.id);
  return `
    <div class="event-card-grid" onclick="openEvent(${event.id})">
      <button class="heart-btn ${isFav ? 'active' : ''}"
        onclick="event.stopPropagation(); toggleFav(${event.id}, this)">
        ${isFav ? '❤️' : '🤍'}
      </button>
      <img src="${event.image}" alt="${event.title}" loading="lazy" onerror="imgError(this, this.alt)">
      <div class="event-card-grid-body">
        <div class="event-cat-tag">${catLabel(event.category)}</div>
        <div class="event-card-grid-title">${event.title}</div>
        <div class="event-card-meta">
          <span class="event-card-date">${formatDate(event.date)}</span>
          <span class="event-card-grid-meta">📍 ${event.location}</span>
        </div>
      </div>
    </div>`;
}

// ─── KLUBOVI ───
function initClubs() {
  renderClubs('sve');
}

function filterClubs(el) {
  document.querySelectorAll('.club-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  currentClubFilter = el.dataset.filter;
  renderClubs(currentClubFilter);
}

function renderClubs(filter) {
  const list = document.getElementById('clubsList');
  let events = EVENTS_DATA.filter(e => e.category === 'klub');

  if (filter !== 'sve') {
    events = events.filter(e => e.clubType === filter);
  }

  if (events.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🎉</div>
      <div class="empty-title">Nema dostupnih večeri</div>
      <div class="empty-sub">Provjeri drugi filter</div>
    </div>`;
    return;
  }

  list.innerHTML = events.map(e => clubCard(e)).join('');
}

function clubCard(event) {
  const club = CLUBS_DATA.find(c => c.upcomingEvents && c.upcomingEvents.includes(event.id));
  const freeSpots = club ? club.freeSpots : Math.floor(Math.random() * 100) + 10;
  const totalSpots = club ? club.totalSpots : 200;
  const pct = Math.round((1 - freeSpots / totalSpots) * 100);

  // badge za tip kluba
  const badgeLabels = {
    'ludi-petak': 'LUDI PETAK',
    'studentska-srijeda': 'STUDENTSKA SRIJEDA',
    'vip-subota': 'VIP SUBOTA'
  };
  const tipBadge = event.clubType
    ? `<span class="club-type-badge ${event.clubType}">${badgeLabels[event.clubType]}</span>`
    : '';

  return `
    <div class="club-card" onclick="openEvent(${event.id})">
      <div class="club-card-img-wrap">
        <img class="club-card-img" src="${event.image}" alt="${event.title}" onerror="imgError(this, this.alt)">
        ${tipBadge}
      </div>
      <div class="club-card-body">
        <div class="club-card-top">
          <div class="club-card-name">${event.title.split(' — ')[1] || event.title.split(',')[0]}</div>
          <div class="club-rating">⭐ ${club ? club.rating : '4.5'}</div>
        </div>
        <div class="club-location">📍 ${event.location}</div>
        <div class="club-availability">
          <div class="spots-bar-wrap">
            <div class="spots-label">
              <span>Slobodna mjesta</span>
              <span class="spots-label-free">${freeSpots} slobodno</span>
            </div>
            <div class="spots-bar">
              <div class="spots-fill" style="width:${pct}%"></div>
            </div>
          </div>
          <button class="btn-reserve" onclick="event.stopPropagation(); openReserve('${event.title}', ${event.id})">
            Rezerviraj
          </button>
        </div>
      </div>
    </div>`;
}

// ─── DETALJ DOGAĐAJA ───
function openEvent(id) {
  const podaci = EVENTS_DATA.find(e => e.id === id);
  if (!podaci) return;
  currentEventId = id;

  document.getElementById('detailImg').src = podaci.image;
  document.getElementById('detailImg').alt = podaci.title;
  document.getElementById('detailCat').textContent = catLabel(podaci.category);
  document.getElementById('detailTitle').textContent = podaci.title;
  document.getElementById('detailDesc').textContent = podaci.description;

  document.getElementById('detailInfoRow').innerHTML = `
    <div class="detail-info-item">
      <div class="detail-info-icon">📅</div>
      <div class="detail-info-text">
        <div class="detail-info-label">Datum i vrijeme</div>
        <div class="detail-info-value">${formatDate(podaci.date)} u ${podaci.time}</div>
      </div>
    </div>
    <div class="detail-info-item">
      <div class="detail-info-icon">📍</div>
      <div class="detail-info-text">
        <div class="detail-info-label">Lokacija</div>
        <div class="detail-info-value">${podaci.location}</div>
      </div>
    </div>
    <div class="detail-info-item">
      <div class="detail-info-icon">🎟️</div>
      <div class="detail-info-text">
        <div class="detail-info-label">Cijena</div>
        <div class="detail-info-value">${podaci.price}</div>
      </div>
    </div>`;

  const inCal = calendarEvents.some(e => e.id === id);
  const btn = document.getElementById('addCalBtn');
  const btnText = document.getElementById('addCalText');
  btn.classList.toggle('added', inCal);
  btnText.textContent = inCal ? 'Dodano u kalendar ✓' : 'Dodaj u kalendar';

  const isFav = favoriteEvents.includes(id);
  document.getElementById('detailHeartBtn').textContent = isFav ? '❤️' : '🤍';

  // pokazi gumb za rezervaciju samo za klubove
  const reserveBtn = document.getElementById('detailReserveBtn');
  if (podaci.category === 'klub') {
    reserveBtn.classList.remove('hidden');
  } else {
    reserveBtn.classList.add('hidden');
  }

  document.getElementById('event-detail').classList.add('active');
}

function closeEventDetail() {
  document.getElementById('event-detail').classList.remove('active');
}

function toggleDetailFav() {
  if (!currentEventId) return;
  const btn = document.getElementById('detailHeartBtn');
  const idx = favoriteEvents.indexOf(currentEventId);
  if (idx === -1) {
    favoriteEvents.push(currentEventId);
    btn.textContent = '❤️';
    showToast('Dodano u favorite ❤️');
  } else {
    favoriteEvents.splice(idx, 1);
    btn.textContent = '🤍';
    showToast('Uklonjeno iz favorita');
  }
  saveToStorage();
  updateStats();
}

function toggleFav(id, btn) {
  const idx = favoriteEvents.indexOf(id);
  if (idx === -1) {
    favoriteEvents.push(id);
    btn.textContent = '❤️';
    btn.classList.add('active');
    showToast('Dodano u favorite ❤️');
  } else {
    favoriteEvents.splice(idx, 1);
    btn.textContent = '🤍';
    btn.classList.remove('active');
    showToast('Uklonjeno iz favorita');
  }
  saveToStorage();
  updateStats();
}

function toggleCalendar() {
  if (!currentEventId) return;
  const ev = EVENTS_DATA.find(e => e.id === currentEventId);
  const inCal = calendarEvents.some(e => e.id === currentEventId);
  const btn = document.getElementById('addCalBtn');
  const btnText = document.getElementById('addCalText');

  if (!inCal) {
    calendarEvents.push({ id: currentEventId, date: ev.date });
    btn.classList.add('added');
    btnText.textContent = 'Dodano u kalendar ✓';
    showToast('📅 Dodano u tvoj kalendar!');
  } else {
    calendarEvents = calendarEvents.filter(e => e.id !== currentEventId);
    btn.classList.remove('added');
    btnText.textContent = 'Dodaj u kalendar';
    showToast('Uklonjeno iz kalendara');
  }

  saveToStorage();
  updateStats();
  renderCalendar();
  renderMyEvents();
  renderHomeCalStrip(); // osvjezi i home strip
}

// ─── PROFIL ───
function initProfile() {
  if (currentUser) {
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileAvatar').textContent = currentUser.avatar || '😊';
    document.getElementById('profileSub').textContent = currentUser.city || 'Zagreb, Hrvatska';
  }
  updateStats();
  renderCalendar();
  renderMyEvents();
  renderTopClubs();
  renderMojeRezervacije();
}

function updateStats() {
  document.getElementById('statEvents').textContent = calendarEvents.length;
  document.getElementById('statFavs').textContent = favoriteEvents.length;
  renderFavoriti();
}

function renderCalendar() {
  const grid = document.getElementById('calendarGrid');
  const now = new Date();
  const year = calViewYear;
  const month = calViewMonth;
  const todayY = now.getFullYear();
  const todayM = now.getMonth();
  const todayD = now.getDate();

  const monthNames = ['Siječanj','Veljača','Ožujak','Travanj','Svibanj','Lipanj',
                      'Srpanj','Kolovoz','Rujan','Listopad','Studeni','Prosinac'];
  document.getElementById('calMonthLabel').textContent = `${monthNames[month]} ${year}`;

  const dayLabels = ['Pon','Uto','Sri','Čet','Pet','Sub','Ned'];
  const firstDay = new Date(year, month, 1).getDay();
  const offset = (firstDay === 0 ? 6 : firstDay - 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // koji dani imaju event — bez timezone problema, samo string parse
  const eventDays = new Set(
    calendarEvents
      .filter(ce => {
        const [y, m] = ce.date.split('-').map(Number);
        return y === year && (m - 1) === month;
      })
      .map(ce => parseInt(ce.date.split('-')[2]))
  );

  let html = dayLabels.map(d => `<div class="cal-day-label">${d}</div>`).join('');

  for (let i = 0; i < offset; i++) {
    html += `<div class="cal-day empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = (d === todayD && year === todayY && month === todayM);
    const hasEvent = eventDays.has(d);
    html += `<div class="cal-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}" onclick="prikaziDanPopup(${year}, ${month}, ${d})">${d}</div>`;
  }

  grid.innerHTML = html;
}

function renderMyEvents() {
  const list = document.getElementById('myEventsList');
  if (calendarEvents.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">📅</div>
      <div class="empty-title">Još nisi dodao nijedan događaj</div>
      <div class="empty-sub">Istraži Zagreb i spremi što te zanima</div>
      <button class="empty-btn" onclick="showTab('pretraga')">Istraži događaje</button>
    </div>`;
    return;
  }

  const sorted = [...calendarEvents].sort((a, b) => new Date(a.date) - new Date(b.date));

  list.innerHTML = sorted.map(ce => {
    const ev = EVENTS_DATA.find(e => e.id === ce.id);
    if (!ev) return '';
    return `
      <div class="my-event-item" onclick="openEvent(${ev.id})">
        <img class="my-event-img" src="${ev.image}" alt="${ev.title}" onerror="imgError(this, this.alt)">
        <div class="my-event-info">
          <div class="my-event-title">${ev.title}</div>
          <div class="my-event-date">📅 ${formatDate(ev.date)} u ${ev.time}</div>
          <div class="my-event-loc">📍 ${ev.location}</div>
        </div>
        <button class="my-event-remove" onclick="event.stopPropagation(); ukloniDogađaj(${ev.id})" title="Ukloni">✕</button>
      </div>`;
  }).join('');
}

// ukloni događaj iz kalendara direktno s profila
function ukloniDogađaj(id) {
  calendarEvents = calendarEvents.filter(e => e.id !== id);
  saveToStorage();
  updateStats();
  renderCalendar();
  renderMyEvents();
  renderHomeCalStrip();
  showToast('Uklonjeno iz kalendara');
}

function renderFavoriti() {
  const lista = document.getElementById('favoritiList');
  if (!lista) return;

  if (favoriteEvents.length === 0) {
    lista.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🤍</div>
      <div class="empty-title">Još nemaš favorita</div>
      <div class="empty-sub">Tapni srce na događaju da ga spremiš ovdje</div>
    </div>`;
    return;
  }

  lista.innerHTML = favoriteEvents.map(id => {
    const ev = EVENTS_DATA.find(e => e.id === id);
    if (!ev) return '';
    return `
      <div class="my-event-item" onclick="openEvent(${ev.id})">
        <img class="my-event-img" src="${ev.image}" alt="${ev.title}" onerror="imgError(this, this.alt)">
        <div class="my-event-info">
          <div class="my-event-title">${ev.title}</div>
          <div class="my-event-date">📅 ${formatDate(ev.date)} u ${ev.time}</div>
          <div class="my-event-loc">📍 ${ev.location}</div>
        </div>
        <button class="fav-heart-btn" onclick="event.stopPropagation(); ukloniIzFavorita(${ev.id})" title="Ukloni">❤️</button>
      </div>`;
  }).join('');
}

function ukloniIzFavorita(id) {
  favoriteEvents = favoriteEvents.filter(x => x !== id);
  saveToStorage();
  updateStats();
  showToast('Uklonjeno iz favorita');
}

function renderTopClubs() {
  const row = document.getElementById('topClubsRow');
  if (!row) return;
  const topKlubovi = [...CLUBS_DATA].sort((a, b) => b.rating - a.rating).slice(0, 5);
  row.innerHTML = topKlubovi.map(club => `
    <div class="club-mini-card" onclick="showTab('klubovi')">
      <img class="club-mini-img" src="${club.image}" alt="${club.name}" loading="lazy" onerror="imgError(this, this.alt)">
      <div class="club-mini-body">
        <div class="club-mini-name">${club.name}</div>
        <div class="club-mini-rating">⭐ ${club.rating}</div>
      </div>
    </div>`).join('');
}

function renderMojeRezervacije() {
  const lista = document.getElementById('mojeRezervacije');
  if (!lista) return;

  if (rezervacije.length === 0) {
    lista.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🪑</div>
      <div class="empty-title">Još nemaš rezervacija</div>
      <div class="empty-sub">Pronađi klub i rezerviraj stol</div>
      <button class="empty-btn" onclick="showTab('klubovi')">Istraži klubove</button>
    </div>`;
    return;
  }

  lista.innerHTML = rezervacije.map(rez => `
    <div class="rezervacija-item">
      <div class="rezervacija-icon">🪑</div>
      <div class="rezervacija-details">
        <div class="rezervacija-name">${rez.klubIme}</div>
        <div class="rezervacija-meta">Stol ${rez.stol} · ${formatDate(rez.datum)}</div>
      </div>
      <button class="btn-otkazati" onclick="otkaziRezervaciju(${rez.id})">Otkaži</button>
    </div>`).join('');
}

function otkaziRezervaciju(id) {
  rezervacije = rezervacije.filter(r => r.id !== id);
  saveToStorage();
  renderMojeRezervacije();
  showToast('Rezervacija otkazana');
}

function renderHomeCalStrip() {
  const strip = document.getElementById('homeCalStrip');
  if (!strip) return;

  if (calendarEvents.length === 0) {
    strip.innerHTML = `<div class="home-cal-empty" onclick="showTab('pretraga')">
      📅 Dodaj događaje u kalendar — bit će prikazani ovdje
    </div>`;
    return;
  }

  const now = new Date();
  // string usporedba radi savrseno za ISO datume (YYYY-MM-DD)
  const todayStr = now.toISOString().split('T')[0];

  const upcoming = [...calendarEvents]
    .filter(ce => ce.date >= todayStr)
    .map(ce => ({ ...ce, dateObj: new Date(ce.date) }))
    .sort((a, b) => a.dateObj - b.dateObj)
    .slice(0, 3);

  if (upcoming.length === 0) {
    strip.innerHTML = `<div class="home-cal-empty" onclick="showTab('pretraga')">
      📅 Nema nadolazećih događaja — istraži Zagreb!
    </div>`;
    return;
  }

  const months = ['sij','velj','ožu','tra','svi','lip','srp','kol','ruj','lis','stu','pro'];
  strip.innerHTML = `<div class="home-cal-list">` + upcoming.map(ce => {
    const ev = EVENTS_DATA.find(e => e.id === ce.id);
    if (!ev) return '';
    // parse direktno iz stringa da izbjegnemo timezone problem
    const [, mo, dy] = ce.date.split('-').map(Number);
    return `
      <div class="home-cal-item" onclick="openEvent(${ev.id})">
        <div class="home-cal-date">
          <div class="home-cal-day">${dy}</div>
          <div class="home-cal-month">${months[mo - 1]}</div>
        </div>
        <div class="home-cal-info">
          <div class="home-cal-title">${ev.title}</div>
          <div class="home-cal-loc">📍 ${ev.location} · ${ev.time}</div>
        </div>
      </div>`;
  }).join('') + `</div>`;
}

// ─── UREĐIVANJE PROFILA ───
function openEditProfileScreen() {
  if (currentUser) {
    document.getElementById('editName').value = currentUser.name || '';
    document.getElementById('editCity').value = currentUser.city || 'Zagreb';
    editAvatar = currentUser.avatar || '😊';
    document.getElementById('editAvatar').textContent = editAvatar;

    if (currentUser.age) {
      document.querySelectorAll('#editAgeRow .opt-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.val === currentUser.age);
      });
    }
    if (currentUser.gender) {
      document.querySelectorAll('#editGenderRow .opt-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.val === currentUser.gender);
      });
    }

    document.querySelectorAll('#edit-profile .interest-card').forEach(card => {
      const active = (userPrefs.interests || []).includes(card.dataset.interest);
      card.classList.toggle('selected', active);
    });
  }
}

function pickAvatar(emoji) {
  editAvatar = emoji;
  document.getElementById('editAvatar').textContent = emoji;
  document.querySelectorAll('.avatar-emoji-row span').forEach(s => {
    s.classList.toggle('picked', s.textContent === emoji);
  });
}

function pickOpt(el, field) {
  const row = el.parentElement;
  row.querySelectorAll('.opt-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function toggleInterestEdit(el) {
  el.classList.toggle('selected');
}

function saveProfile() {
  const name = document.getElementById('editName').value.trim() || currentUser.name;
  const city = document.getElementById('editCity').value.trim() || 'Zagreb';
  const ageEl = document.querySelector('#editAgeRow .opt-chip.active');
  const genderEl = document.querySelector('#editGenderRow .opt-chip.active');

  const newInterests = [];
  document.querySelectorAll('#edit-profile .interest-card.selected').forEach(c => {
    newInterests.push(c.dataset.interest);
  });

  currentUser = {
    ...currentUser,
    name,
    city,
    avatar: editAvatar,
    age: ageEl ? ageEl.dataset.val : currentUser.age,
    gender: genderEl ? genderEl.dataset.val : currentUser.gender,
  };

  if (newInterests.length > 0) userPrefs.interests = newInterests;

  saveToStorage();

  document.getElementById('profileName').textContent = name;
  document.getElementById('profileAvatar').textContent = editAvatar;
  document.getElementById('profileSub').textContent = `${city}, Hrvatska`;
  const avatarBtn = document.querySelector('.avatar-btn');
  if (avatarBtn) avatarBtn.textContent = editAvatar;

  showScreen('main-app');
  showToast('✅ Profil spremljen!');
}

function logOut() {
  if (!confirm('Sigurno se želiš odjaviti?')) return;
  localStorage.removeItem('oab_user');
  currentUser = null;
  location.reload();
}

// ─── REZERVACIJA ───
function openReserve(name, eventId) {
  currentReserveClubName = name.split('—')[0].trim();
  currentReserveEventId = eventId;
  selectedTable = null;

  // resetiraj modal na odabir stola
  document.getElementById('modalPickView').style.display = 'block';
  document.getElementById('modalPotvrda').classList.remove('visible');

  document.getElementById('modalClubName').textContent = currentReserveClubName;

  const grid = document.getElementById('tableGrid');
  const tables = 12;
  const takenTables = [2, 5, 8, 11];
  let html = '';

  for (let i = 1; i <= tables; i++) {
    const taken = takenTables.includes(i);
    html += `
      <button class="table-btn ${taken ? 'taken' : 'free'}"
        ${taken ? 'disabled' : `onclick="selectTable(this, ${i})"`}>
        <span class="table-icon">${taken ? '⬛' : '🟡'}</span>
        <span>Stol ${i}</span>
      </button>`;
  }
  grid.innerHTML = html;

  document.getElementById('reserveModal').classList.add('open');
}

function selectTable(btn, num) {
  document.querySelectorAll('.table-btn:not(.taken)').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedTable = num;
}

function closeModal() {
  document.getElementById('reserveModal').classList.remove('open');
  selectedTable = null;
  // resetiraj views
  setTimeout(() => {
    document.getElementById('modalPickView').style.display = 'block';
    document.getElementById('modalPotvrda').classList.remove('visible');
  }, 400);
}

function closeModalOnBg(e) {
  if (e.target === document.getElementById('reserveModal')) closeModal();
}

function confirmReservation() {
  if (!selectedTable) {
    showToast('⚠️ Odaberi stol za rezervaciju!');
    return;
  }

  // dohvati podatke o eventu za datum
  const ev = EVENTS_DATA.find(e => e.id === currentReserveEventId);
  const datum = ev ? ev.date : new Date().toISOString().split('T')[0];

  // spremi rezervaciju
  const novaRezervacija = {
    id: Date.now(),
    klubIme: currentReserveClubName,
    stol: selectedTable,
    datum: datum,
    eventId: currentReserveEventId
  };
  rezervacije.push(novaRezervacija);
  saveToStorage();

  // pokazi potvrdu unutar modala
  document.getElementById('modalPickView').style.display = 'none';
  document.getElementById('potvrdaDetalji').innerHTML = `
    <strong>${currentReserveClubName}</strong><br>
    Datum: ${formatDate(datum)}<br>
    Stol broj: <strong>${selectedTable}</strong>
  `;
  document.getElementById('modalPotvrda').classList.add('visible');

  // osvjezi profil ako je otvoren
  renderMojeRezervacije();
  showToast(`✅ Stol ${selectedTable} uspješno rezerviran!`);
}

function openReserveFromDetail() {
  if (!currentEventId) return;
  const ev = EVENTS_DATA.find(e => e.id === currentEventId);
  if (ev) openReserve(ev.title, ev.id);
}

// ─── NAVIGACIJA TABOVA ───
function showTab(name) {
  // zatvori event detail i chat screen ako su otvoreni
  document.getElementById('event-detail').classList.remove('active');
  const chatScr = document.getElementById('chat-screen');
  if (chatScr.classList.contains('active')) {
    if (chatReplyTimer) clearTimeout(chatReplyTimer);
    chatScr.classList.remove('active');
    aktivniChatId = null;
  }

  document.querySelectorAll('.app-tab').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const tabMap = {
    'home':     'tab-home',
    'pretraga': 'tab-pretraga',
    'klubovi':  'tab-klubovi',
    'poruke':   'tab-poruke',
    'profil':   'tab-profil'
  };

  // poruke je na indeksu 3, profil na 4
  const navIdx = { 'home': 0, 'pretraga': 1, 'klubovi': 2, 'poruke': 3, 'profil': 4 };

  const tab = document.getElementById(tabMap[name]);
  if (tab) tab.style.display = 'block';

  const navItems = document.querySelectorAll('.nav-item');
  if (navItems[navIdx[name]] !== undefined) navItems[navIdx[name]].classList.add('active');

  if (name === 'profil') {
    updateStats();
    renderCalendar();
    renderMyEvents();
    renderTopClubs();
    renderMojeRezervacije();
  }

  if (name === 'home') {
    renderHomeCalStrip();
  }

  if (name === 'poruke') {
    // ocisti neprocitane kad korisnik otvori listu poruka
    Object.keys(neprocitane).forEach(k => { neprocitane[k] = 0; });
    azurirajBadge();
    saveToStorage();
    renderChatList();
  }

  const mainApp = document.getElementById('main-app');
  if (mainApp) mainApp.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── OBAVIJESTI ───
var toastTimer = null;

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

function getRandomReply() {
  const odgovori = [
    'Oke, hvala na informaciji!',
    'Super, vidimo se!',
    'Odlično, jedva čekam!',
    'Savršeno, hvala!',
    'Jasno, hvala na javljanju!'
  ];
  return odgovori[Math.floor(Math.random() * odgovori.length)];
}

// ─── POMOĆNE FUNKCIJE ───
function formatDate(dateStr) {
  const d = new Date(dateStr);
  const months = ['sij','velj','ožu','tra','svi','lip','srp','kol','ruj','lis','stu','pro'];
  return `${d.getDate()}. ${months[d.getMonth()]}`;
}

function catLabel(cat) {
  const map = {
    concert: 'Koncert',
    klub: 'Klub',
    festival: 'Festival',
    sport: 'Sport',
    kultura: 'Kultura',
    live: 'Live svirka'
  };
  return map[cat] || cat;
}

// ─── KALENDAR POPUP ───
function prikaziDanPopup(year, month, day) {
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const dayEvents = calendarEvents
    .filter(ce => ce.date === dateStr)
    .map(ce => EVENTS_DATA.find(e => e.id === ce.id))
    .filter(Boolean);

  const meseci = ['siječnja','veljače','ožujka','travnja','svibnja','lipnja',
                  'srpnja','kolovoza','rujna','listopada','studenog','prosinca'];
  document.getElementById('calDayTitle').textContent = `${day}. ${meseci[month]}`;

  const content = document.getElementById('calDayContent');
  if (dayEvents.length === 0) {
    content.innerHTML = '<div class="cal-popup-empty">📭 Nema događaja ovaj dan</div>';
  } else {
    content.innerHTML = dayEvents.map(ev => `
      <div class="cal-popup-event" onclick="closeCalDayModal(); openEvent(${ev.id})">
        <div class="cal-popup-time">🕐 ${ev.time}</div>
        <div class="cal-popup-title">${ev.title}</div>
        <div class="cal-popup-loc">📍 ${ev.location}</div>
      </div>`).join('');
  }

  document.getElementById('calDayModal').classList.add('open');
}

function closeCalDayModal(e) {
  if (!e || e.target === document.getElementById('calDayModal')) {
    document.getElementById('calDayModal').classList.remove('open');
  }
}

// ─── GODIŠNJI PRIKAZ ───
function prikaziGodinuView() {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();

  const names = ['Siječanj','Veljača','Ožujak','Travanj','Svibanj','Lipanj',
                 'Srpanj','Kolovoz','Rujan','Listopad','Studeni','Prosinac'];

  let html = '';
  for (let m = thisMonth; m < 12; m++) {
    const isActive = (m === calViewMonth && thisYear === calViewYear);
    html += `<button class="year-month-btn${isActive ? ' active' : ''}" onclick="navigirajNaMjesec(${thisYear}, ${m})">${names[m]}</button>`;
  }
  document.getElementById('yearGrid').innerHTML = html;
  document.getElementById('yearViewModal').classList.add('open');
}

function closeYearModal(e) {
  if (!e || e.target === document.getElementById('yearViewModal')) {
    document.getElementById('yearViewModal').classList.remove('open');
  }
}

function navigirajNaMjesec(year, month) {
  calViewYear = year;
  calViewMonth = month;
  renderCalendar();
  closeYearModal();
}

// ─── PORUKE ───
function pomakniChatNaVrh(id) {
  chatRedoslijed = [id, ...chatRedoslijed.filter(x => x !== id)];
}

function azurirajBadge() {
  const ukupno = Object.values(neprocitane).reduce((a, b) => a + b, 0);
  const badge = document.getElementById('navBadgePoruke');
  if (!badge) return;
  if (ukupno > 0) {
    badge.textContent = ukupno > 9 ? '9+' : ukupno;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function renderChatList() {
  const lista = document.getElementById('chatList');
  if (!lista) return;

  lista.innerHTML = chatRedoslijed.map(id => {
    const chat = CHAT_DATA.find(c => c.id === id);
    if (!chat) return '';
    const poruke = chatPoruke[chat.id] || chat.poruke;
    const zadnja = poruke[poruke.length - 1];
    let pregled = '';
    if (zadnja) {
      pregled = zadnja.od === 'ja' ? `Ti: ${zadnja.tekst}` : zadnja.tekst;
      // za dijeljene eventove
      if (zadnja.tip === 'dijeljenje') pregled = zadnja.od === 'ja' ? 'Ti: 📤 Događaj' : '📤 Događaj';
    }
    const kratki = pregled.length === 0
      ? `Pozdravi ${chat.ime.split(' ')[0]} i dogovorite izlazak 👋`
      : (pregled.length > 36 ? pregled.slice(0, 36) + '…' : pregled);

    return `
      <div class="chat-item" onclick="openChat(${chat.id})">
        <div class="chat-item-avatar">${chat.avatar}</div>
        <div class="chat-item-info">
          <div class="chat-item-name">${chat.ime}</div>
          <div class="chat-item-preview">${kratki}</div>
        </div>
        <div class="chat-item-time">${zadnja ? zadnja.vrijeme : ''}</div>
      </div>`;
  }).join('');
}

function openChat(id) {
  aktivniChatId = id;
  const chat = CHAT_DATA.find(c => c.id === id);
  if (!chat) return;

  // oznaci kao procitano
  neprocitane[id] = 0;
  azurirajBadge();

  document.getElementById('chatScreenName').textContent = chat.ime;
  document.getElementById('chatScreenAvatar').textContent = chat.avatar;

  renderChatMessages(id);
  document.getElementById('chat-screen').classList.add('active');

  // skrolaj na dno poruka
  setTimeout(() => {
    const msgs = document.getElementById('chatMessages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }, 120);
}

function closeChatScreen() {
  if (chatReplyTimer) clearTimeout(chatReplyTimer);
  document.getElementById('chat-screen').classList.remove('active');
  aktivniChatId = null;
  renderChatList();
}

function renderChatMessages(id) {
  const container = document.getElementById('chatMessages');
  if (!container) return;

  const poruke = chatPoruke[id] || [];
  container.innerHTML = poruke.map(p => {
    if (p.tip === 'dijeljenje') {
      // kartica dijeljenog događaja
      return `
        <div class="chat-bubble-wrap ja">
          <div class="chat-bubble">
            ${p.tekst ? `<div style="margin-bottom:8px">${p.tekst}</div>` : ''}
            <div class="chat-shared-card">
              <div class="chat-shared-label">📤 Dijeljeni događaj</div>
              <div class="chat-shared-title">${p.eventTitle}</div>
              <div class="chat-shared-meta">📅 ${p.eventDate} · 📍 ${p.eventLocation}</div>
            </div>
            <span class="chat-bubble-time">${p.vrijeme}</span>
          </div>
        </div>`;
    }
    return `
      <div class="chat-bubble-wrap ${p.od}">
        <div class="chat-bubble">
          <div>${p.tekst}</div>
          <span class="chat-bubble-time">${p.vrijeme}</span>
        </div>
      </div>`;
  }).join('');

  setTimeout(() => { container.scrollTop = container.scrollHeight; }, 50);
}

function posaljiPoruku() {
  const input = document.getElementById('chatInput');
  const tekst = input.value.trim();
  if (!tekst || !aktivniChatId) return;

  const now = new Date();
  const vrijemeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (!chatPoruke[aktivniChatId]) chatPoruke[aktivniChatId] = [];
  chatPoruke[aktivniChatId].push({ tekst, od: 'ja', vrijeme: vrijemeStr });
  pomakniChatNaVrh(aktivniChatId);

  input.value = '';
  renderChatMessages(aktivniChatId);
  saveToStorage();

  // simuliraj odgovor od prijatelja
  if (chatReplyTimer) clearTimeout(chatReplyTimer);
  const chatIdZaOdgovor = aktivniChatId; // zahvati ID ovdje, jer aktivniChatId moze se promjeniti
  chatReplyTimer = setTimeout(() => {
    if (!chatPoruke[chatIdZaOdgovor]) return;
    const now2 = new Date();
    const v2 = `${now2.getHours()}:${String(now2.getMinutes()).padStart(2, '0')}`;
    chatPoruke[chatIdZaOdgovor].push({ tekst: getRandomReply(), od: 'drug', vrijeme: v2 });
    pomakniChatNaVrh(chatIdZaOdgovor);
    // ako korisnik nije vise u ovom chatu — dodaj neprocitanu
    if (aktivniChatId !== chatIdZaOdgovor) {
      neprocitane[chatIdZaOdgovor] = (neprocitane[chatIdZaOdgovor] || 0) + 1;
      azurirajBadge();
    } else {
      renderChatMessages(chatIdZaOdgovor);
    }
    renderChatList();
    saveToStorage();
  }, 1000);
}

// ─── DIJELJENJE DOGAĐAJA ───
function openShareModal() {
  if (!currentEventId) return;
  odabraniKontaktId = null;

  const lista = document.getElementById('shareContactsList');
  lista.innerHTML = CHAT_DATA.map(chat => `
    <div class="share-contact" id="shareContact-${chat.id}" onclick="odaberiKontakt(${chat.id})">
      <div class="share-contact-avatar">${chat.avatar}</div>
      <div class="share-contact-name">${chat.ime}</div>
    </div>`).join('');

  document.getElementById('shareMsgInput').value = '';
  document.getElementById('shareModal').classList.add('open');
}

function closeShareModal(e) {
  if (!e || e.target === document.getElementById('shareModal')) {
    document.getElementById('shareModal').classList.remove('open');
    odabraniKontaktId = null;
  }
}

function odaberiKontakt(id) {
  odabraniKontaktId = id;
  document.querySelectorAll('.share-contact').forEach(c => c.classList.remove('selected'));
  const el = document.getElementById(`shareContact-${id}`);
  if (el) el.classList.add('selected');
}

// ─── NOVA PORUKA (pretraga kontakata) ───
function openNovaPoruka() {
  document.getElementById('kontaktSearch').value = '';
  renderKontaktLista(CHAT_DATA);
  document.getElementById('novaPorukaMod').classList.add('open');
}

function closeNovaPoruka(e) {
  if (!e || e.target === document.getElementById('novaPorukaMod')) {
    document.getElementById('novaPorukaMod').classList.remove('open');
  }
}

function pretraziKontakte(val) {
  const q = val.toLowerCase().trim();
  const filtrirani = q
    ? CHAT_DATA.filter(c => c.ime.toLowerCase().includes(q))
    : CHAT_DATA;
  renderKontaktLista(filtrirani);
}

function renderKontaktLista(kontakti) {
  const lista = document.getElementById('novaPorukaMista');
  if (!lista) return;
  if (kontakti.length === 0) {
    lista.innerHTML = '<div style="text-align:center;padding:24px;color:var(--purple-sec);font-size:14px">Nema rezultata</div>';
    return;
  }
  lista.innerHTML = kontakti.map(c => {
    const postojiRazgovor = chatRedoslijed.includes(c.id);
    return `
      <div class="np-kontakt" onclick="odaberiNovKontakt(${c.id})">
        <div class="np-avatar">${c.avatar}</div>
        <div class="np-ime">${c.ime}</div>
        ${postojiRazgovor ? '<span class="np-badge">💬</span>' : ''}
      </div>`;
  }).join('');
}

function odaberiNovKontakt(id) {
  // inicijaliziraj prazan chat ako ne postoji
  if (!chatPoruke[id]) chatPoruke[id] = [];
  pomakniChatNaVrh(id);
  saveToStorage();
  closeNovaPoruka();
  openChat(id);
}

function posaljiDogađaj() {
  if (!odabraniKontaktId) {
    showToast('⚠️ Odaberi prijatelja!');
    return;
  }
  if (!currentEventId) return;

  const ev = EVENTS_DATA.find(e => e.id === currentEventId);
  const chat = CHAT_DATA.find(c => c.id === odabraniKontaktId);
  const poruka = document.getElementById('shareMsgInput').value.trim();

  const now = new Date();
  const vrijemeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (!chatPoruke[odabraniKontaktId]) chatPoruke[odabraniKontaktId] = [];
  chatPoruke[odabraniKontaktId].push({
    tip: 'dijeljenje',
    tekst: poruka,
    eventTitle: ev.title,
    eventDate: formatDate(ev.date),
    eventLocation: ev.location,
    od: 'ja',
    vrijeme: vrijemeStr
  });
  pomakniChatNaVrh(odabraniKontaktId);

  saveToStorage();
  closeShareModal();
  showToast(`📤 Događaj podijeljen s ${chat.ime}!`);
}

// ─── ZAMJENA ZA SLIKE (fallback) ───
function imgError(img, naziv) {
  img.onerror = null;
  const div = document.createElement('div');
  div.className = 'img-placeholder';
  div.textContent = naziv || '';
  if (img.parentNode) {
    img.parentNode.insertBefore(div, img);
    img.style.display = 'none';
  }
}
