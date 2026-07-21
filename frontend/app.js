const API_BASE = window.SENTINEL_API_BASE || '';

const routes = [
  { id: 'overview', label: 'Overview' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'players', label: 'Players' },
  { id: 'settings', label: 'Settings' },
  { id: 'about', label: 'About' }
];

const state = {
  alerts: [],
  players: [],
  bans: [],
  config: null,
  polling: null,
  page: 'overview',
  status: 'Connecting...',
  lastUpdated: null
};

const dom = {
  content: document.getElementById('app')
};

function createElement(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') el.className = value;
    else if (key === 'innerHTML') el.innerHTML = value;
    else if (key === 'checked') el.checked = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value);
    }
  });
  children.flat().forEach(child => {
    if (typeof child === 'string') child = document.createTextNode(child);
    if (child) el.appendChild(child);
  });
  return el;
}

async function fetchJson(path, options) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function loadData() {
  const [config, alerts, players, bans] = await Promise.all([
    fetchJson('/config'),
    fetchJson('/alerts'),
    fetchJson('/players'),
    fetchJson('/bans')
  ]);
  state.config = config;
  state.alerts = alerts;
  state.players = players;
  state.bans = bans;
  state.status = 'Live';
  state.lastUpdated = Date.now();
}

function setPage(page) {
  state.page = page;
  window.location.hash = page;
  renderApp();
}

function initializeRoute() {
  const page = window.location.hash.replace('#', '') || 'overview';
  state.page = routes.some(route => route.id === page) ? page : 'overview';
}

function renderNav() {
  const links = routes.map(route => createElement('a', {
    href: `#${route.id}`,
    className: `nav-link${state.page === route.id ? ' active' : ''}`,
    onClick: (event) => {
      event.preventDefault();
      setPage(route.id);
    }
  }, route.label));

  return createElement('header', { className: 'topbar' },
    createElement('div', { className: 'brand' },
      createElement('span', { className: 'brand-mark' }, 'S'),
      createElement('div', { className: 'brand-details' },
        createElement('strong', {}, 'Sentinel'),
        createElement('span', { className: 'brand-subtitle' }, 'AntiCheat Portal')
      )
    ),
    createElement('div', { className: 'nav-links' }, links),
    createElement('button', {
      className: 'button outline',
      onClick: () => setPage('settings')
    }, 'Launch Guard')
  );
}

function renderHero() {
  return createElement('section', { className: 'hero-panel' },
    createElement('div', { className: 'hero-copy' },
      createElement('span', { className: 'hero-tag' }, 'Reseller-ready FiveM anticheat'),
      createElement('h1', {}, 'Sell a beautiful security dashboard your clients will love.'),
      createElement('p', {}, 'Sentinel AC delivers live protection, alert tracking, and a premium interface that feels like a real SaaS product.'),
      createElement('div', { className: 'hero-actions' },
        createElement('button', { className: 'button primary', onClick: () => setPage('alerts') }, 'See Alerts'),
        createElement('button', { className: 'button secondary', onClick: () => setPage('about') }, 'Product Tour')
      )
    ),
    createElement('div', { className: 'hero-card' },
      createElement('div', { className: 'hero-card-title' }, 'Live Security Snapshot'),
      createElement('div', { className: 'hero-stats-grid' },
        createElement('div', { className: 'hero-stat' },
          createElement('span', {}, 'Alerts'),
          createElement('strong', {}, `${state.alerts.length}`)
        ),
        createElement('div', { className: 'hero-stat' },
          createElement('span', {}, 'Players'),
          createElement('strong', {}, `${state.players.length}`)
        ),
        createElement('div', { className: 'hero-stat' },
          createElement('span', {}, 'Bans'),
          createElement('strong', {}, `${state.bans.length}`)
        ),
        createElement('div', { className: 'hero-stat' },
          createElement('span', {}, 'Backend'),
          createElement('strong', {}, state.status)
        )
      )
    )
  );
}

function renderCard(title, value, small) {
  return createElement('div', { className: 'card' },
    createElement('h3', {}, title),
    createElement('p', { className: small ? 'muted' : '' }, value)
  );
}

function renderOverview() {
  const metrics = createElement('div', { className: 'dashboard-grid' },
    renderCard('Active Alerts', state.alerts.length),
    renderCard('Tracked Players', state.players.length),
    renderCard('Total Bans', state.bans.length),
    renderCard('Last refresh', state.lastUpdated ? new Date(state.lastUpdated).toLocaleTimeString() : 'Loading...', true)
  );

  return createElement('main', {},
    renderHero(),
    createElement('section', { className: 'panel features-panel' },
      createElement('h2', {}, 'Why sell Sentinel AC?'),
      createElement('div', { className: 'features-grid' },
        createElement('div', { className: 'feature-card' },
          createElement('h3', {}, 'Premium design'),
          createElement('p', {}, 'A polished SaaS-style interface that looks professional and trustworthy.')
        ),
        createElement('div', { className: 'feature-card' },
          createElement('h3', {}, 'Live anti-cheat monitoring'),
          createElement('p', {}, 'View alerts and ban history in real time, with fast refresh every five seconds.')
        ),
        createElement('div', { className: 'feature-card' },
          createElement('h3', {}, 'Client-ready dashboard'),
          createElement('p', {}, 'Give your customers a real website experience instead of a simple localhost tool.')
        ),
        createElement('div', { className: 'feature-card' },
          createElement('h3', {}, 'Configurable controls'),
          createElement('p', {}, 'Let server operators change detection thresholds and ban behavior from the UI.')
        )
      )
    ),
    metrics
  );
}

function renderAlertsPage() {
  const rows = state.alerts.map(alert => createElement('tr', {},
    createElement('td', {}, alert.playerName || alert.playerId),
    createElement('td', {}, alert.reason),
    createElement('td', {}, `${alert.points}`),
    createElement('td', {}, new Date(alert.timestamp).toLocaleString())
  ));

  return createElement('main', {},
    createElement('section', { className: 'panel' },
      createElement('div', { className: 'page-header' },
        createElement('div', {},
          createElement('h2', {}, 'Recent Alerts'),
          createElement('p', {}, 'Track suspicious behavior, weapon violations, speed exploits, and player bans.')
        )
      ),
      state.alerts.length === 0
        ? createElement('p', { className: 'empty-state' }, 'No alerts yet. Activity will show up here when the anticheat resource reports it.')
        : createElement('table', {},
          createElement('thead', {},
            createElement('tr', {},
              createElement('th', {}, 'Player'),
              createElement('th', {}, 'Reason'),
              createElement('th', {}, 'Points'),
              createElement('th', {}, 'Time')
            )
          ),
          createElement('tbody', {}, rows)
        )
    )
  );
}

function renderPlayersPage() {
  const rows = state.players.map(player => createElement('tr', {},
    createElement('td', {}, player.name),
    createElement('td', {}, player.id),
    createElement('td', {}, `${player.suspicion}`),
    createElement('td', {}, player.flags.length),
    createElement('td', {}, new Date(player.lastSeen).toLocaleTimeString())
  ));

  return createElement('main', {},
    createElement('section', { className: 'panel' },
      createElement('div', { className: 'page-header' },
        createElement('div', {},
          createElement('h2', {}, 'Tracked Players'),
          createElement('p', {}, 'Analyze the current player pool and investigation history for each tracked user.')
        )
      ),
      state.players.length === 0
        ? createElement('p', { className: 'empty-state' }, 'No players tracked yet. Players will begin appearing when the dashboard receives data.')
        : createElement('table', {},
          createElement('thead', {},
            createElement('tr', {},
              createElement('th', {}, 'Name'),
              createElement('th', {}, 'ID'),
              createElement('th', {}, 'Suspicion'),
              createElement('th', {}, 'Flags'),
              createElement('th', {}, 'Last Seen')
            )
          ),
          createElement('tbody', {}, rows)
        )
    )
  );
}

function renderSettingsPage() {
  const form = createElement('form', { id: 'config-form' },
    createElement('div', { className: 'form-grid' },
      createElement('label', {},
        createElement('span', {}, 'Ban enabled'),
        createElement('input', { type: 'checkbox', name: 'enableBan', checked: state.config.enableBan })
      ),
      createElement('label', {},
        createElement('span', {}, 'Ban duration (ms)'),
        createElement('input', { type: 'number', name: 'banDuration', value: state.config.banDuration, min: 0 })
      ),
      createElement('label', {},
        createElement('span', {}, 'Suspicion threshold'),
        createElement('input', { type: 'number', name: 'suspicionThreshold', value: state.config.suspicionThreshold, min: 1 })
      ),
      createElement('label', {},
        createElement('span', {}, 'Check interval (ms)'),
        createElement('input', { type: 'number', name: 'checkInterval', value: state.config.checkInterval, min: 1000 })
      )
    ),
    createElement('label', {},
      createElement('span', {}, 'Allowed weapons (comma-separated)'),
      createElement('textarea', { name: 'allowedWeapons' }, state.config.allowedWeapons.join(', '))
    ),
    createElement('button', { type: 'submit', className: 'button primary' }, 'Save Configuration')
  );

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const payload = {
      enableBan: data.get('enableBan') === 'on' || data.get('enableBan') === 'true',
      banDuration: Number(data.get('banDuration')),
      suspicionThreshold: Number(data.get('suspicionThreshold')),
      checkInterval: Number(data.get('checkInterval')),
      allowedWeapons: data.get('allowedWeapons').split(',').map(item => item.trim()).filter(Boolean)
    };
    await fetchJson('/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    await refresh();
    alert('Configuration saved');
  });

  return createElement('main', {},
    createElement('section', { className: 'panel' },
      createElement('div', { className: 'page-header' },
        createElement('div', {},
          createElement('h2', {}, 'Settings'),
          createElement('p', {}, 'Configure detection thresholds, ban behavior, and allowed weapons for your servers.')
        )
      ),
      form
    )
  );
}

function renderAboutPage() {
  return createElement('main', {},
    createElement('section', { className: 'panel' },
      createElement('div', { className: 'page-header' },
        createElement('div', {},
          createElement('h2', {}, 'About Sentinel AC'),
          createElement('p', {}, 'A reseller-ready FiveM anticheat platform with a premium website-style control panel.')
        )
      ),
      createElement('div', { className: 'about-grid' },
        createElement('div', { className: 'about-card' },
          createElement('h3', {}, 'Brand Experience'),
          createElement('p', {}, 'Present a clean, modern portal to your clients with strong visual appeal and clear navigation.')
        ),
        createElement('div', { className: 'about-card' },
          createElement('h3', {}, 'Realtime insights'),
          createElement('p', {}, 'Track alerts, player behavior, and ban history with live backend synchronization.')
        ),
        createElement('div', { className: 'about-card' },
          createElement('h3', {}, 'Easy hosting'),
          createElement('p', {}, 'Deploy the backend and frontend together to a hosted domain for a true SaaS experience.')
        ),
        createElement('div', { className: 'about-card' },
          createElement('h3', {}, 'Full control'),
          createElement('p', {}, 'Give operators the ability to tune detection and manage server protection from one panel.')
        )
      )
    )
  );
}

function renderApp() {
  dom.content.innerHTML = '';
  dom.content.appendChild(renderNav());

  if (state.page === 'overview') dom.content.appendChild(renderOverview());
  if (state.page === 'alerts') dom.content.appendChild(renderAlertsPage());
  if (state.page === 'players') dom.content.appendChild(renderPlayersPage());
  if (state.page === 'settings') dom.content.appendChild(renderSettingsPage());
  if (state.page === 'about') dom.content.appendChild(renderAboutPage());
}

async function refresh() {
  try {
    await loadData();
  } catch (error) {
    state.status = 'Offline';
  }
  renderApp();
}

async function init() {
  initializeRoute();
  await refresh();
  state.polling = setInterval(refresh, 5000);
  window.addEventListener('hashchange', () => {
    initializeRoute();
    renderApp();
  });
}

init().catch(error => {
  dom.content.innerHTML = `<div class="error">Failed to load dashboard: ${error.message}</div>`;
});
