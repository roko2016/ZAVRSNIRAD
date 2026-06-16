/* ══════════════════════════════════════
   OUT AND ABOUT — Main App Logic
   ══════════════════════════════════════ */

// ─── STATE ───
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

// ─── INIT ───
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

  // ovo dohvaca rezervacije iz storagea
  const rez = localStorage.getItem('oab_rezervacije');
  if (rez) rezervacije = JSON.parse(rez);
}

function saveToStorage() {
  localStorage.setItem('oab_prefs', JSON.stringify(userPrefs));
  if (currentUser) localStorage.setItem('oab_user', JSON.stringify(currentUser));
  localStorage.setItem('oab_calendar', JSON.stringify(calendarEvents));
  localStorage.setItem('oab_favs', JSON.stringify(favoriteEvents));
  localStorage.setItem('oab_rezervacije', JSON.stringify(rezervacije));
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

// ─── SCREEN NAVIGATION ───
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

// ─── ONBOARDING ───
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

function updateSlider() {
  const slides = document.getElementById('onboardingSlides');
  slides.style.transform = `translateX(-${currentSlide * 20}%)`;

  const dots = document.querySelectorAll('.progress-dot');
  dots.forEach((d, i) => {
    d.classList.toggle('active', i === currentSlide);
  });

  const btn = document.getElementById('nextBtn');
  if (currentSlide === totalSlides - 1) {
    btn.textContent = 'Kreni! 🚀';
  } else {
    btn.textContent = 'Dalje →';
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

// ─── AUTH ───
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

// ─── MAIN APP ───
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

  initHome();
  initSearch();
  initClubs();
  initProfile();

  // pocni na home tabu
  showTab('home');
}

// ─── HOME ───
function initHome() {
  if (currentUser) {
    const firstName = currentUser.name.split(' ')[0];
    document.getElementById('homeGreetingName').textContent =
      firstName !== 'Gost' ? `Dobrodošao, ${firstName}!` : 'Otkrij što se događa';
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

// ─── SEARCH ───
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

// ─── CLUBS ───
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

// ─── EVENT DETAIL ───
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

// ─── PROFILE ───
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
      <div class="empty-title">Kalendar je prazan</div>
      <div class="empty-sub">Dodaj događanja iz sekcije Istraži Zagreb</div>
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
        <button class="my-event-remove" onclick="event.stopPropagation(); ukloniDogađanje(${ev.id})" title="Ukloni">✕</button>
      </div>`;
  }).join('');
}

// ukloni događanje iz kalendara direktno s profila
function ukloniDogađanje(id) {
  calendarEvents = calendarEvents.filter(e => e.id !== id);
  saveToStorage();
  updateStats();
  renderCalendar();
  renderMyEvents();
  renderHomeCalStrip();
  showToast('Uklonjeno iz kalendara');
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

// ovo renderira moje rezervacije u profilu
function renderMojeRezervacije() {
  const lista = document.getElementById('mojeRezervacije');
  if (!lista) return;

  if (rezervacije.length === 0) {
    lista.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🪑</div>
      <div class="empty-title">Nema rezervacija</div>
      <div class="empty-sub">Rezerviraj stol u nekom klubu</div>
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
      📅 Dodaj događanja u kalendar — bit će prikazana ovdje
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
      📅 Nema nadolazećih događanja — istraži Zagreb!
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

// ─── EDIT PROFILE ───
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

// ─── RESERVATION ───
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

// ─── TAB NAVIGATION ───
function showTab(name) {
  document.querySelectorAll('.app-tab').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const tabMap = {
    'home': 'tab-home',
    'pretraga': 'tab-pretraga',
    'klubovi': 'tab-klubovi',
    'profil': 'tab-profil'
  };

  const navIdx = { 'home': 0, 'pretraga': 1, 'klubovi': 2, 'profil': 3 };

  const tab = document.getElementById(tabMap[name]);
  if (tab) tab.style.display = 'block';

  const navItems = document.querySelectorAll('.nav-item');
  if (navItems[navIdx[name]]) navItems[navIdx[name]].classList.add('active');

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

  const mainApp = document.getElementById('main-app');
  if (mainApp) mainApp.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── TOAST ───
var toastTimer = null; // var je tu ostao od nekad

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ─── HELPERS ───
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
    kultura: 'Kultura'
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
    content.innerHTML = '<div class="cal-popup-empty">📭 Nema događanja ovaj dan</div>';
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

// ─── YEAR VIEW ───
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

// ─── IMAGE FALLBACK ───
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

console.log('app.js ucitan');
