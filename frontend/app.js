const API_BASE = '';
const state = {
  page: 'login',
  user: null,
  token: localStorage.getItem('sentinel_token') || null,
  players: [], alerts: [], bans: [], actions: [], config: {},
  alertCount: 0,
  license: null,
  siteConfig: { discordInviteUrl: null, licensePurchaseUrl: null, discordOAuthConfigured: false }
};

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') e.className = v;
    else if (k === 'innerHTML') e.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return e;
}

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  const r = await fetch(API_BASE + path, { ...opts, headers });
  if (!r.ok) { const t = await r.text(); throw new Error(t || r.statusText); }
  return r.json();
}

async function loadPublicConfig() {
  try {
    state.siteConfig = await api('/api/public/site-config');
  } catch (error) {
    state.siteConfig = { discordInviteUrl: null, licensePurchaseUrl: null, discordOAuthConfigured: false };
    console.warn('Public site config unavailable:', error);
  }
}

function decodeDiscordSessionFromHash() {
  const raw = window.location.hash.replace(/^#discord=/, '');
  if (!window.location.hash.startsWith('#discord=') || !raw) return null;
  try {
    const decoded = JSON.parse(atob(decodeURIComponent(raw)));
    window.location.hash = '';
    return decoded;
  } catch (error) {
    console.warn('Invalid Discord session hash:', error);
    window.location.hash = '';
    return null;
  }
}

async function handleDiscordLogin() {
  try {
    const result = await api('/api/auth/discord/url');
    window.location.href = result.url;
  } catch (error) {
    alert('Discord login is not configured yet. Add Discord OAuth env vars first.');
  }
}

function renderPublicCTA(title, description, buttonLabel, onClick, secondaryLabel, secondaryClick) {
  return el('div', { className: 'public-cta-card' },
    el('div', { className: 'public-cta-copy' },
      el('div', { className: 'public-cta-title' }, title),
      el('div', { className: 'public-cta-desc' }, description)
    ),
    el('div', { className: 'public-cta-actions' },
      el('button', { className: 'btn btn-primary', onclick: onClick }, buttonLabel),
      secondaryLabel ? el('button', { className: 'btn btn-ghost', onclick: secondaryClick }, secondaryLabel) : null
    )
  );
}

function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000) return 'just now';
  if (d < 3600000) return Math.floor(d/60000) + 'm ago';
  if (d < 86400000) return Math.floor(d/3600000) + 'h ago';
  return new Date(ts).toLocaleDateString();
}

function suspicionLevel(n) {
  if (n >= 80) return 'high';
  if (n >= 40) return 'med';
  return 'low';
}

function alertSeverity(pts) {
  if (pts >= 45) return 'high';
  if (pts >= 25) return 'med';
  return 'low';
}

// ── AUTH PAGES ──
function renderLogin() {
  document.getElementById('app').innerHTML = '';
  const page = el('div', { className: 'public-landing' },
    el('section', { className: 'public-hero' },
      el('div', { className: 'public-hero-copy' },
        el('div', { className: 'eyebrow-pill' }, 'Discord-first licensing for FiveM servers'),
        el('h1', {}, 'Launch a premium anti-cheat portal with Discord login and license checkout.'),
        el('p', {}, 'Sentinel AC now has a real public experience: Discord authentication, licensing controls, module coverage, and a dashboard that feels like a product instead of a toy.'),
        el('div', { className: 'public-hero-actions' },
          el('button', { className: 'btn btn-primary btn-xl', onclick: handleDiscordLogin }, 'Continue with Discord'),
          el('button', { className: 'btn btn-ghost btn-xl', onclick: () => window.scrollTo({ top: document.getElementById('pricing').offsetTop - 20, behavior: 'smooth' }) }, 'View License Plans')
        ),
        el('div', { className: 'public-meta-row' },
          el('div', { className: 'public-meta-card' }, el('strong', {}, 'OAuth'), el('span', {}, state.siteConfig.discordOAuthConfigured ? 'Configured' : 'Needs setup')),
          el('div', { className: 'public-meta-card' }, el('strong', {}, 'Licensing'), el('span', {}, state.siteConfig.licensePurchaseUrl ? 'Checkout ready' : 'Invite or checkout URL missing')),
          el('div', { className: 'public-meta-card' }, el('strong', {}, 'Modules'), el('span', {}, '5 active detections'))
        )
      ),
      el('div', { className: 'public-hero-side' },
        el('div', { className: 'public-hero-preview' },
          el('div', { className: 'preview-top' },
            el('span', { className: 'preview-dot' }), el('span', { className: 'preview-dot' }), el('span', { className: 'preview-dot' }),
            el('span', { className: 'preview-label' }, 'Live preview')
          ),
          el('div', { className: 'preview-metric' }, '247'),
          el('div', { className: 'preview-caption' }, 'Players protected today'),
          el('div', { className: 'preview-grid' },
            el('div', { className: 'preview-tile tile-1' }, el('strong', {}, 'Discord Login'), el('span', {}, 'OAuth flow')),
            el('div', { className: 'preview-tile tile-2' }, el('strong', {}, 'License Gate'), el('span', {}, 'Buy / verify')),
            el('div', { className: 'preview-tile tile-3' }, el('strong', {}, 'Ban Queue'), el('span', {}, 'One-click actions')),
            el('div', { className: 'preview-tile tile-4' }, el('strong', {}, 'Modules'), el('span', {}, '5 detections'))
          )
        )
      )
    ),
    el('section', { className: 'feature-band' },
      el('div', { className: 'feature-band-card' }, el('span', {}, '🛡️'), el('strong', {}, 'Real-time detection'), el('p', {}, 'Teleport, speed, weapon, invisibility, and godmode checks.')),
      el('div', { className: 'feature-band-card' }, el('span', {}, '💬'), el('strong', {}, 'Discord onboarding'), el('p', {}, 'Users log in with Discord and get a guided license flow.')),
      el('div', { className: 'feature-band-card' }, el('span', {}, '💳'), el('strong', {}, 'License checkout'), el('p', {}, 'Connect a purchase URL or Discord storefront for access.')),
      el('div', { className: 'feature-band-card' }, el('span', {}, '📊'), el('strong', {}, 'Admin dashboard'), el('p', {}, 'Review alerts, actions, bans, and server health in one place.'))
    ),
    el('section', { className: 'content-section', id: 'pricing' },
      el('div', { className: 'section-heading' },
        el('span', { className: 'section-kicker' }, 'Plans'),
        el('h2', {}, 'Choose the license tier you want to sell'),
        el('p', {}, 'These cards are built so you can swap the buttons to your Discord checkout, Stripe link, or license portal.')
      ),
      el('div', { className: 'pricing-grid' },
        licenseCard('Starter', '$15', 'For small servers', ['Discord login', 'Basic detection modules', 'Dashboard access'], 'Get Started', handleDiscordLogin),
        licenseCard('Pro', '$35', 'Most popular', ['Advanced alerts', 'Ban / kick tools', 'License verification'], 'Buy Pro', () => openLicenseUrl()),
        licenseCard('Enterprise', '$79', 'For larger communities', ['Priority support', 'Custom rules', 'Multi-server setup'], 'Contact Sales', () => openDiscordInvite())
      )
    ),
    el('section', { className: 'content-section' },
      el('div', { className: 'section-heading' },
        el('span', { className: 'section-kicker' }, 'Why Sentinel'),
        el('h2', {}, 'A bigger product page, not a plain login form'),
        el('p', {}, 'This layout gives you a marketing site, a Discord sign-in path, and a license wall before the dashboard opens.')
      ),
      el('div', { className: 'feature-gallery' },
        galleryCard('01', 'Discord identity', 'Your customers authenticate with their Discord account and land in a branded onboarding flow.', 'discord-bg'),
        galleryCard('02', 'License purchase', 'Send buyers to a checkout link or Discord storefront, then verify access inside the app.', 'license-bg'),
        galleryCard('03', 'Admin controls', 'After access is granted, the moderation dashboard appears with ban, kick, logs, and detections.', 'dashboard-bg')
      )
    )
  );

  document.getElementById('app').appendChild(page);
}

const renderLanding = renderLogin;

function licenseCard(title, price, subtitle, bullets, buttonText, buttonAction) {
  return el('div', { className: 'pricing-card' },
    el('div', { className: 'pricing-top' },
      el('h3', {}, title),
      el('div', { className: 'pricing-price' }, price),
      el('p', {}, subtitle)
    ),
    el('ul', { className: 'pricing-list' }, ...bullets.map((item) => el('li', {}, item))),
    el('button', { className: 'btn btn-primary', onclick: buttonAction }, buttonText)
  );
}

function galleryCard(index, title, description, themeClass) {
  return el('div', { className: `gallery-card ${themeClass}` },
    el('div', { className: 'gallery-index' }, index),
    el('h3', {}, title),
    el('p', {}, description)
  );
}

function openLicenseUrl() {
  if (state.siteConfig.licensePurchaseUrl) {
    window.open(state.siteConfig.licensePurchaseUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  alert('No license purchase URL is configured yet. Set LICENSE_PURCHASE_URL on the server.');
}

function openDiscordInvite() {
  if (state.siteConfig.discordInviteUrl) {
    window.open(state.siteConfig.discordInviteUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  alert('No Discord invite URL is configured yet. Set DISCORD_INVITE_URL on the server.');
}

function renderRegister() {
  document.getElementById('app').innerHTML = '';
  const page = el('div', { className: 'auth-page' },
    el('div', { className: 'auth-left' },
      el('div', { className: 'auth-left-logo' },
        el('div', { className: 'logo-icon' }, '⚔️'),
        el('h2', {}, 'Sentinel AC')
      ),
      el('h1', {}, 'Create your admin account'),
      el('p', {}, 'Set up your Sentinel AC control panel. Get instant access to real-time cheat detection and player management tools.'),
      el('div', { className: 'feature-list' },
        el('div', { className: 'feature-item' }, el('span', { className: 'feature-icon' }, '📊'), 'Live dashboard with metrics'),
        el('div', { className: 'feature-item' }, el('span', { className: 'feature-icon' }, '🚨'), 'Instant cheat alerts'),
        el('div', { className: 'feature-item' }, el('span', { className: 'feature-icon' }, '📋'), 'Full audit log of all actions'),
        el('div', { className: 'feature-item' }, el('span', { className: 'feature-icon' }, '⚙️'), 'Configurable detection settings')
      )
    ),
    el('div', { className: 'auth-right' },
      el('h2', { className: 'auth-title' }, 'Create account'),
      el('p', { className: 'auth-subtitle' }, 'Fill in your details below'),
      el('form', { onsubmit: doRegister },
        el('div', { className: 'form-field' }, el('label', {}, 'Username'), el('input', { type: 'text', name: 'username', placeholder: 'Choose a username', required: true })),
        el('div', { className: 'form-field' }, el('label', {}, 'Password'), el('input', { type: 'password', name: 'password', placeholder: 'Create a password', required: true })),
        el('div', { className: 'form-field' }, el('label', {}, 'Confirm Password'), el('input', { type: 'password', name: 'confirm', placeholder: 'Repeat your password', required: true })),
        el('button', { type: 'submit', className: 'btn btn-primary' }, '🚀 Create Account')
      ),
      el('div', { className: 'auth-switch' }, 'Already have an account? ', el('a', { href: '#', onclick: (e) => { e.preventDefault(); renderLogin(); } }, 'Sign in'))
    )
  );
  document.getElementById('app').appendChild(page);
}

async function doLogin(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.textContent = 'Signing in...'; btn.disabled = true;
  try {
    const d = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: e.target.username.value, password: e.target.password.value }) });
    await applySession(d);
  } catch(err) { alert('Login failed: ' + err.message); btn.textContent = '🔑 Sign In'; btn.disabled = false; }
}

async function doRegister(e) {
  e.preventDefault();
  if (e.target.password.value !== e.target.confirm.value) { alert('Passwords do not match'); return; }
  const btn = e.target.querySelector('button[type=submit]');
  btn.textContent = 'Creating...'; btn.disabled = true;
  try {
    const d = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ username: e.target.username.value, password: e.target.password.value }) });
    await applySession(d);
  } catch(err) { alert('Registration failed: ' + err.message); btn.textContent = '🚀 Create Account'; btn.disabled = false; }
}

async function applySession(session) {
  state.token = session.token;
  state.user = session.user;
  state.license = { licenseStatus: session.user?.licenseStatus || 'pending' };
  localStorage.setItem('sentinel_token', session.token);
  await loadAll();
  renderAuthenticatedView();
}

async function loadAll() {
  try {
    const [players, alerts, bans, actions, config] = await Promise.all([
      api('/api/players'), api('/api/alerts'), api('/api/bans'), api('/api/actions'), api('/api/config')
    ]);
    state.players = players || []; state.alerts = alerts || [];
    state.bans = bans || []; state.actions = actions || []; state.config = config || {};
    try {
      state.license = await api('/api/license');
    } catch (licenseError) {
      state.license = { licenseStatus: 'pending' };
    }
  } catch(e) { console.error('loadAll error:', e); }
}

async function renderAuthenticatedView() {
  if ((state.license?.licenseStatus || 'pending') !== 'active' && state.user?.authProvider === 'discord') {
    renderLicenseWall();
    return;
  }
  renderApp();
}

// ── APP SHELL ──
function renderApp() {
  document.getElementById('app').innerHTML = '';
  const shell = el('div', { className: 'app-shell' },
    renderSidebar(),
    el('div', { className: 'main-content', id: 'main-content' })
  );
  document.getElementById('app').appendChild(shell);
  navigateTo(state.page === 'login' ? 'overview' : state.page);
}

function renderSidebar() {
  const onlinePlayers = state.players.filter(p => p.status === 'online').length;
  const newAlerts = state.alerts.filter(a => !a.handled).length;

  const navItems = [
    { id: 'overview',   icon: '📊', label: 'Overview' },
    { id: 'players',    icon: '👥', label: 'Players', badge: onlinePlayers > 0 ? onlinePlayers : null },
    { id: 'alerts',     icon: '🚨', label: 'Alerts',  badge: newAlerts > 0 ? newAlerts : null, badgeRed: true },
    { id: 'bans',       icon: '🔨', label: 'Ban List' },
    { id: 'detections', icon: '🛡️', label: 'Detections' },
    { id: 'logs',       icon: '📋', label: 'Action Logs' },
    { id: 'settings',   icon: '⚙️', label: 'Settings' }
  ];

  return el('aside', { className: 'sidebar' },
    el('div', { className: 'sidebar-logo' },
      el('div', { className: 'sidebar-logo-icon' }, '⚔️'),
      el('div', { className: 'sidebar-logo-text' },
        el('strong', {}, 'Sentinel AC'),
        el('span', {}, 'AntiCheat Panel')
      )
    ),
    el('div', { className: 'sidebar-server-status' },
      el('div', { className: 'server-status-row' },
        el('span', { style: { display:'flex', alignItems:'center', gap:'7px' } },
          el('span', { className: 'status-dot online' }),
          el('span', { style: { fontSize:'0.8rem', fontWeight:'600' } }, 'Backend Online')
        ),
        el('span', { style: { fontSize:'0.75rem', color:'#94a3b8' } }, 'Live')
      ),
      el('div', { className: 'server-status-row' },
        el('span', { style: { fontSize:'0.75rem', color:'#94a3b8' } }, `${state.players.length} players tracked`),
        el('span', { style: { fontSize:'0.75rem', color:'#94a3b8' } }, `${state.bans.length} bans`)
      )
    ),
    el('nav', { className: 'sidebar-nav' },
      el('div', { className: 'nav-section-label' }, 'Main'),
      ...navItems.slice(0,3).map(item => navBtn(item)),
      el('div', { className: 'nav-section-label' }, 'Moderation'),
      ...navItems.slice(3,6).map(item => navBtn(item)),
      el('div', { className: 'nav-section-label' }, 'System'),
      navBtn(navItems[6])
    ),
    el('div', { className: 'sidebar-footer' },
      el('button', { className: 'sidebar-user', onclick: doLogout },
        el('div', { className: 'user-avatar' }, (state.user?.username || 'A')[0].toUpperCase()),
        el('div', { className: 'user-info' },
          el('div', { className: 'user-name' }, state.user?.username || 'Admin'),
          el('div', { className: 'user-role' }, 'Administrator')
        ),
        el('span', { style: { fontSize:'0.9rem', color:'#475569' } }, '🚪')
      )
    )
  );
}

function navBtn(item) {
  const b = el('button', {
    className: 'nav-item' + (state.page === item.id ? ' active' : ''),
    onclick: () => navigateTo(item.id)
  },
    el('span', { className: 'nav-icon' }, item.icon),
    item.label,
    item.badge != null ? el('span', { className: 'nav-badge' + (item.badgeRed ? ' red' : '') }, item.badge) : null
  );
  return b;
}

function navigateTo(page) {
  state.page = page;
  const mc = document.getElementById('main-content');
  if (!mc) return;
  mc.innerHTML = '';
  const pages = { overview: pageOverview, players: pagePlayers, alerts: pageAlerts, bans: pageBans, detections: pageDetections, logs: pageLogs, settings: pageSettings };
  const titles = { overview: ['Overview', 'Live server activity and metrics'], players: ['Players', 'Track and manage all players'], alerts: ['Alerts', 'Real-time cheat detection alerts'], bans: ['Ban List', 'Manage banned players'], detections: ['Detections', 'Active cheat detection modules'], logs: ['Action Logs', 'History of all moderation actions'], settings: ['Settings', 'Configure detection thresholds'] };

  const [title, sub] = titles[page] || ['Page', ''];
  mc.appendChild(
    el('div', {},
      el('div', { className: 'topbar' },
        el('div', { className: 'topbar-title' },
          el('h1', {}, title),
          el('p', {}, sub)
        ),
        el('div', { className: 'topbar-actions' },
          el('button', { className: 'refresh-btn', onclick: async () => { await loadAll(); navigateTo(state.page); } }, '🔄 Refresh')
        )
      ),
      el('div', { className: 'page', id: 'page-content' })
    )
  );
  const render = pages[page];
  if (render) document.getElementById('page-content').appendChild(render());
  // Re-render sidebar to update active state
  const oldSidebar = document.querySelector('.sidebar');
  if (oldSidebar) oldSidebar.replaceWith(renderSidebar());
}

function doLogout() {
  localStorage.removeItem('sentinel_token');
  state.token = null; state.user = null; state.page = 'login';
  renderLogin();
}

function renderLicenseWall() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  const inviteText = state.siteConfig.discordInviteUrl ? 'Join Discord' : 'Configure Discord Invite';
  const purchaseText = state.siteConfig.licensePurchaseUrl ? 'Buy License' : 'Configure Purchase Link';

  const wall = el('div', { className: 'license-wall' },
    el('div', { className: 'license-wall-card' },
      el('div', { className: 'license-wall-badge' }, 'License required'),
      el('h1', {}, 'Your Discord account is connected, but access is still locked.'),
      el('p', {}, 'This is the license gate. Connect your payment link or Discord storefront so new users can buy access before entering the dashboard.'),
      el('div', { className: 'license-status-grid' },
        el('div', { className: 'license-status-item' }, el('strong', {}, 'Auth'), el('span', {}, state.user?.authProvider || 'discord')),
        el('div', { className: 'license-status-item' }, el('strong', {}, 'License'), el('span', {}, state.license?.licenseStatus || 'pending')),
        el('div', { className: 'license-status-item' }, el('strong', {}, 'Discord'), el('span', {}, state.license?.discordUsername || state.user?.username || 'Connected'))
      ),
      el('div', { className: 'license-wall-actions' },
        el('button', { className: 'btn btn-primary btn-xl', onclick: openLicenseUrl }, purchaseText),
        el('button', { className: 'btn btn-ghost btn-xl', onclick: openDiscordInvite }, inviteText),
        el('button', { className: 'btn btn-ghost btn-xl', onclick: async () => { await loadAll(); renderAuthenticatedView(); } }, 'I already bought a license')
      ),
      renderPublicCTA(
        'Need help activating?',
        'If you are testing this locally, configure DISCORD_INVITE_URL and LICENSE_PURCHASE_URL on the server to make these buttons work.',
        'Refresh status',
        async () => { await loadAll(); renderAuthenticatedView(); },
        'Back to landing',
        () => { state.token = null; state.user = null; localStorage.removeItem('sentinel_token'); renderLogin(); }
      )
    )
  );

  app.appendChild(wall);
}

// ── OVERVIEW PAGE ──
function pageOverview() {
  const online = state.players.filter(p => p.status === 'online').length;
  const banned = state.bans.length;
  const alertCount = state.alerts.length;
  const highAlerts = state.alerts.filter(a => alertSeverity(a.points) === 'high').length;

  return el('div', {},
    el('div', { className: 'stats-grid' },
      statCard('👥', 'Online Players', online, 'purple', 'Live on server'),
      statCard('🚨', 'Total Alerts', alertCount, 'red', `${highAlerts} high severity`),
      statCard('🔨', 'Banned Players', banned, 'yellow', 'All time bans'),
      statCard('🛡️', 'Detections Active', 5, 'green', 'All modules running'),
      statCard('⚡', 'Actions Today', state.actions.length, 'blue', 'Bans, kicks, unbans')
    ),
    el('div', { className: 'panels-row wide' },
      el('div', { className: 'panel' },
        el('div', { className: 'panel-header' }, el('h2', {}, '🚨 Recent Alerts'), el('span', { className: 'panel-header-meta' }, `${state.alerts.length} total`)),
        el('div', { className: 'panel-body' },
          state.alerts.length === 0
            ? emptyState('No alerts yet', '🎉', 'Your server looks clean!')
            : el('div', { className: 'alert-feed' },
                ...state.alerts.slice(0,6).map(a => {
                  const sev = alertSeverity(a.points);
                  return el('div', { className: `alert-item ${sev}` },
                    el('span', { className: `alert-dot ${sev}` }),
                    el('div', { className: 'alert-body' },
                      el('div', { className: 'alert-reason' }, a.reason || 'Unknown'),
                      el('div', { className: 'alert-meta' }, `${a.playerName || a.playerId} · ${timeAgo(a.timestamp)}`)
                    ),
                    el('span', { className: 'alert-pts' }, `+${a.points}pts`)
                  );
                })
              )
        )
      ),
      el('div', { className: 'panel' },
        el('div', { className: 'panel-header' }, el('h2', {}, '📋 Recent Actions')),
        el('div', { className: 'panel-body' },
          state.actions.length === 0
            ? emptyState('No actions yet', '📋', 'Actions will appear here')
            : el('div', {},
                ...state.actions.slice(0,8).map(a =>
                  el('div', { className: 'activity-item' },
                    el('div', { className: `activity-icon ${a.type}` }, a.type === 'ban' ? '🔨' : a.type === 'kick' ? '👢' : a.type === 'unban' ? '✅' : '⚠️'),
                    el('div', { className: 'activity-text' },
                      el('strong', {}, a.actor || 'System'), ` ${a.type === 'ban' ? 'banned' : a.type === 'kick' ? 'kicked' : 'unbanned'} `, el('strong', {}, a.playerName || a.playerId)
                    ),
                    el('span', { className: 'activity-time' }, timeAgo(a.timestamp))
                  )
                )
              )
        )
      )
    ),
    el('div', { className: 'panels-row' },
      el('div', { className: 'panel' },
        el('div', { className: 'panel-header' }, el('h2', {}, '📡 Server Health')),
        el('div', { className: 'panel-body' },
          el('div', { className: 'server-health' },
            el('div', { className: 'health-item' }, el('div', { className: 'health-label' }, 'Backend'), el('div', { className: 'health-value green' }, '● Online')),
            el('div', { className: 'health-item' }, el('div', { className: 'health-label' }, 'Detections'), el('div', { className: 'health-value green' }, '5/5 Active')),
            el('div', { className: 'health-item' }, el('div', { className: 'health-label' }, 'Database'), el('div', { className: 'health-value green' }, '● Healthy')),
            el('div', { className: 'health-item' }, el('div', { className: 'health-label' }, 'Players Tracked'), el('div', { className: 'health-value' }, state.players.length))
          )
        )
      ),
      el('div', { className: 'panel' },
        el('div', { className: 'panel-header' }, el('h2', {}, '🏆 Most Suspicious')),
        el('div', { className: 'panel-body' },
          state.players.length === 0
            ? emptyState('No players', '👥', 'Players appear when detected')
            : el('div', {},
                ...state.players.sort((a,b)=>(b.suspicion||0)-(a.suspicion||0)).slice(0,5).map(p =>
                  el('div', { className: 'activity-item' },
                    el('div', { className: 'activity-icon alert' }, '🎮'),
                    el('div', { className: 'activity-text' }, el('strong', {}, p.name)),
                    el('span', { className: `badge badge-${suspicionLevel(p.suspicion||0)}` }, `${p.suspicion||0} pts`)
                  )
                )
              )
        )
      )
    )
  );
}

function statCard(icon, label, value, color, sub) {
  return el('div', { className: `stat-card ${color}` },
    el('div', { className: `stat-icon ${color}` }, icon),
    el('div', { className: 'stat-value' }, String(value)),
    el('div', { className: 'stat-label' }, label),
    el('div', { className: 'stat-change' }, sub)
  );
}

function emptyState(title, icon, desc) {
  return el('div', { className: 'empty-state' },
    el('div', { className: 'empty-icon' }, icon),
    el('h3', {}, title),
    el('p', {}, desc)
  );
}

// ── PLAYERS PAGE ──
function pagePlayers() {
  const search = el('div', { style: { marginBottom: '16px', display:'flex', gap:'12px', alignItems:'center' } },
    el('div', { className: 'search-bar', style: { flex:'1' } },
      el('span', {}, '🔍'),
      el('input', { type:'text', placeholder:'Search players by name or ID...', oninput: (e) => filterPlayers(e.target.value) })
    )
  );

  const tableWrap = el('div', { id: 'players-table' });
  tableWrap.appendChild(buildPlayersTable(state.players));

  return el('div', { className: 'panel' },
    el('div', { className: 'panel-header' },
      el('h2', {}, '👥 All Players'),
      el('span', { className: 'panel-header-meta' }, `${state.players.length} tracked`)
    ),
    el('div', { className: 'panel-body' },
      search,
      tableWrap
    )
  );
}

function filterPlayers(q) {
  const filtered = state.players.filter(p => p.name?.toLowerCase().includes(q.toLowerCase()) || p.id?.includes(q));
  const wrap = document.getElementById('players-table');
  if (wrap) { wrap.innerHTML = ''; wrap.appendChild(buildPlayersTable(filtered)); }
}

function buildPlayersTable(players) {
  if (players.length === 0) return emptyState('No players found', '👥', 'Players will appear once detected in-game');
  return el('table', { className: 'data-table' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'Player'), el('th', {}, 'Status'), el('th', {}, 'Suspicion'), el('th', {}, 'Flags'), el('th', {}, 'Last Seen'), el('th', {}, 'Actions')
    )),
    el('tbody', {}, ...players.map(p => {
      const sus = p.suspicion || 0;
      const level = suspicionLevel(sus);
      return el('tr', {},
        el('td', {}, el('strong', {}, p.name || 'Unknown')),
        el('td', {}, el('span', { className: `badge badge-${p.status || 'offline'}` }, p.status || 'offline')),
        el('td', { style: { minWidth: '140px' } },
          el('div', { className: 'suspicion-bar' },
            el('div', { className: 'bar-track' }, el('div', { className: `bar-fill ${level}`, style: { width: Math.min(sus, 100) + '%' } })),
            el('span', { className: `bar-value` }, sus)
          )
        ),
        el('td', {}, (p.flags || []).length),
        el('td', {}, timeAgo(p.lastSeen || Date.now())),
        el('td', {},
          el('div', { style: { display:'flex', gap:'6px' } },
            p.status !== 'banned'
              ? el('button', { className: 'btn btn-sm btn-danger', onclick: () => doBan(p) }, '🔨 Ban')
              : el('button', { className: 'btn btn-sm btn-success', onclick: () => doUnban(p) }, '✅ Unban'),
            p.status !== 'banned'
              ? el('button', { className: 'btn btn-sm btn-warn', onclick: () => doKick(p) }, '👢 Kick')
              : null
          )
        )
      );
    }))
  );
}

// ── ALERTS PAGE ──
function pageAlerts() {
  if (state.alerts.length === 0) {
    return el('div', { className: 'panel' },
      el('div', { className: 'panel-header' }, el('h2', {}, '🚨 Cheat Alerts')),
      el('div', { className: 'panel-body' }, emptyState('No alerts yet', '🎉', 'Your server is clean! Alerts appear when the FiveM resource detects cheating.'))
    );
  }
  return el('div', { className: 'panel' },
    el('div', { className: 'panel-header' },
      el('h2', {}, '🚨 Cheat Alerts'),
      el('span', { className: 'panel-header-meta' }, `${state.alerts.length} total alerts`)
    ),
    el('div', { className: 'panel-body' },
      el('table', { className: 'data-table' },
        el('thead', {}, el('tr', {},
          el('th', {}, 'Severity'), el('th', {}, 'Player'), el('th', {}, 'Reason'), el('th', {}, 'Points'), el('th', {}, 'Time')
        )),
        el('tbody', {}, ...state.alerts.map(a => {
          const sev = alertSeverity(a.points);
          return el('tr', {},
            el('td', {}, el('span', { className: `badge badge-${sev === 'high' ? 'banned' : sev === 'med' ? 'kicked' : 'online'}` }, sev.toUpperCase())),
            el('td', {}, a.playerName || a.playerId || 'Unknown'),
            el('td', {}, a.reason || 'Unknown'),
            el('td', {}, el('strong', { style: { color: sev === 'high' ? 'var(--red)' : sev === 'med' ? 'var(--yellow)' : 'var(--green)' } }, `+${a.points}`)),
            el('td', {}, timeAgo(a.timestamp))
          );
        }))
      )
    )
  );
}

// ── BANS PAGE ──
function pageBans() {
  return el('div', { className: 'panel' },
    el('div', { className: 'panel-header' },
      el('h2', {}, '🔨 Ban List'),
      el('span', { className: 'panel-header-meta' }, `${state.bans.length} bans`)
    ),
    el('div', { className: 'panel-body' },
      state.bans.length === 0
        ? emptyState('No bans yet', '✅', 'Banned players will appear here')
        : el('table', { className: 'data-table' },
            el('thead', {}, el('tr', {},
              el('th', {}, 'Player'), el('th', {}, 'Reason'), el('th', {}, 'Banned By'), el('th', {}, 'Date'), el('th', {}, 'Actions')
            )),
            el('tbody', {}, ...state.bans.map(b =>
              el('tr', {},
                el('td', {}, el('strong', {}, b.playerName || b.playerId)),
                el('td', {}, b.reason || 'No reason'),
                el('td', {}, b.bannedBy || 'System'),
                el('td', {}, timeAgo(b.timestamp)),
                el('td', {},
                  el('button', { className: 'btn btn-sm btn-success', onclick: () => doUnbanById(b) }, '✅ Unban')
                )
              )
            ))
          )
    )
  );
}

// ── DETECTIONS PAGE ──
function pageDetections() {
  const dets = [
    { icon: '⚡', name: 'Teleport Detection', pts: 40, desc: 'Detects instant position changes over threshold distance' },
    { icon: '🔫', name: 'Weapon Detection', pts: 30, desc: 'Monitors for illegal or spawned weapons' },
    { icon: '🏎️', name: 'Speed Detection', pts: 25, desc: 'Flags vehicles and players moving too fast' },
    { icon: '👁️', name: 'Invisibility Check', pts: 45, desc: 'Detects when a player is invisible to others' },
    { icon: '☠️', name: 'Godmode Detection', pts: 50, desc: 'Checks player invincibility flags' }
  ];

  return el('div', {},
    el('div', { className: 'panel', style: { marginBottom: '20px' } },
      el('div', { className: 'panel-header' }, el('h2', {}, '🛡️ Active Detection Modules'), el('span', { className: 'panel-header-meta' }, '5/5 Active')),
      el('div', { className: 'panel-body' },
        el('div', { className: 'detection-grid' },
          ...dets.map(d =>
            el('div', { className: 'detection-card' },
              el('div', { className: 'det-icon' }, d.icon),
              el('div', { className: 'det-name' }, d.name),
              el('div', { className: 'det-pts' }, `+${d.pts} pts on detect`),
              el('div', { className: 'det-status active' }, '● Active')
            )
          )
        )
      )
    ),
    el('div', { className: 'panel' },
      el('div', { className: 'panel-header' }, el('h2', {}, '📖 How Detections Work')),
      el('div', { className: 'panel-body' },
        el('table', { className: 'data-table' },
          el('thead', {}, el('tr', {}, el('th', {}, 'Module'), el('th', {}, 'Points'), el('th', {}, 'Description'), el('th', {}, 'Status'))),
          el('tbody', {}, ...dets.map(d =>
            el('tr', {},
              el('td', {}, el('strong', {}, d.icon + ' ' + d.name)),
              el('td', {}, el('span', { style: { color: 'var(--accent3)', fontWeight: '700' } }, `+${d.pts}`)),
              el('td', {}, d.desc),
              el('td', {}, el('span', { className: 'badge badge-online' }, 'Active'))
            )
          ))
        )
      )
    )
  );
}

// ── LOGS PAGE ──
function pageLogs() {
  return el('div', { className: 'panel' },
    el('div', { className: 'panel-header' },
      el('h2', {}, '📋 Action Logs'),
      el('span', { className: 'panel-header-meta' }, `${state.actions.length} total`)
    ),
    el('div', { className: 'panel-body' },
      state.actions.length === 0
        ? emptyState('No actions logged', '📋', 'Ban and kick actions will appear here')
        : el('table', { className: 'data-table' },
            el('thead', {}, el('tr', {},
              el('th', {}, 'Action'), el('th', {}, 'Player'), el('th', {}, 'Reason'), el('th', {}, 'By'), el('th', {}, 'Time')
            )),
            el('tbody', {}, ...state.actions.map(a =>
              el('tr', {},
                el('td', {}, el('span', { className: `badge ${a.type === 'ban' ? 'badge-banned' : a.type === 'kick' ? 'badge-kicked' : 'badge-online'}` }, a.type?.toUpperCase())),
                el('td', {}, a.playerName || a.playerId),
                el('td', {}, a.reason || 'No reason'),
                el('td', {}, a.actor || 'System'),
                el('td', {}, timeAgo(a.timestamp))
              )
            ))
          )
    )
  );
}

// ── SETTINGS PAGE ──
function pageSettings() {
  const cfg = state.config;
  return el('div', {},
    el('div', { className: 'panel', style: { marginBottom: '20px' } },
      el('div', { className: 'panel-header' }, el('h2', {}, '⚙️ Detection Settings')),
      el('div', { className: 'panel-body' },
        el('div', { className: 'settings-grid' },
          settingRow('Auto-Ban', 'Automatically ban players that exceed the suspicion threshold', 'toggle', cfg.enableBan),
          settingRow('Suspicion Threshold', 'Points required to trigger auto-ban', 'number', cfg.suspicionThreshold),
          settingRow('Ban Duration (ms)', 'Duration in milliseconds (86400000 = 1 day)', 'number', cfg.banDuration),
          settingRow('Check Interval (ms)', 'How often to run detection checks', 'number', cfg.checkInterval)
        ),
        el('div', { style: { marginTop: '20px' } },
          el('button', { className: 'btn btn-primary', style: { width:'auto', padding:'12px 32px' }, onclick: saveSettings }, '💾 Save Settings')
        )
      )
    ),
    el('div', { className: 'panel' },
      el('div', { className: 'panel-header' }, el('h2', {}, '🔑 Account')),
      el('div', { className: 'panel-body' },
        el('div', { className: 'settings-grid' },
          settingRow('Username', 'Your admin username', 'text', state.user?.username || 'admin')
        ),
        el('div', { style: { marginTop: '20px' } },
          el('button', { className: 'btn btn-ghost', style: { width:'auto' }, onclick: doLogout }, '🚪 Logout')
        )
      )
    )
  );
}

function settingRow(label, desc, type, value) {
  const id = 'setting-' + label.replace(/\s+/g, '-').toLowerCase();
  let control;
  if (type === 'toggle') {
    control = el('div', { className: 'toggle' + (value ? ' on' : ''), id, onclick(e) { this.classList.toggle('on'); } });
  } else {
    control = el('div', { className: 'setting-control' }, el('input', { type, id, value: value || '', step: type === 'number' ? 1 : undefined }));
  }
  return el('div', { className: 'setting-row' },
    el('div', { className: 'setting-info' },
      el('h4', {}, label),
      el('p', {}, desc)
    ),
    control
  );
}

async function saveSettings() {
  const get = id => document.getElementById('setting-' + id);
  const payload = {
    enableBan: get('auto-ban')?.classList.contains('on') ?? state.config.enableBan,
    suspicionThreshold: parseInt(get('suspicion-threshold')?.querySelector('input')?.value || state.config.suspicionThreshold),
    banDuration: parseInt(get('ban-duration-(ms)')?.querySelector('input')?.value || state.config.banDuration),
    checkInterval: parseInt(get('check-interval-(ms)')?.querySelector('input')?.value || state.config.checkInterval)
  };
  try {
    await api('/api/config', { method: 'POST', body: JSON.stringify(payload) });
    state.config = { ...state.config, ...payload };
    alert('✅ Settings saved!');
  } catch(e) { alert('Failed to save: ' + e.message); }
}

// ── MODERATION ACTIONS ──
async function doBan(player) {
  const reason = prompt(`Ban ${player.name}?\nEnter reason:`, 'Cheating');
  if (reason == null) return;
  try {
    await api('/api/moderation/ban', { method: 'POST', body: JSON.stringify({ playerId: player.id, playerName: player.name, reason }) });
    await loadAll(); navigateTo('players');
  } catch(e) { alert('Ban failed: ' + e.message); }
}

async function doKick(player) {
  const reason = prompt(`Kick ${player.name}?\nEnter reason:`, 'Rule violation');
  if (reason == null) return;
  try {
    await api('/api/moderation/kick', { method: 'POST', body: JSON.stringify({ playerId: player.id, playerName: player.name, reason }) });
    await loadAll(); navigateTo('players');
  } catch(e) { alert('Kick failed: ' + e.message); }
}

async function doUnban(player) {
  if (!confirm(`Unban ${player.name}?`)) return;
  const ban = state.bans.find(b => b.playerId === player.id);
  if (ban) await doUnbanById(ban);
}

async function doUnbanById(ban) {
  if (!confirm(`Unban ${ban.playerName}?`)) return;
  try {
    await api('/api/moderation/unban', { method: 'POST', body: JSON.stringify({ banId: ban.id, playerId: ban.playerId, playerName: ban.playerName }) });
    await loadAll(); navigateTo('bans');
  } catch(e) { alert('Unban failed: ' + e.message); }
}

// ── INIT ──
async function init() {
  const discordSession = decodeDiscordSessionFromHash();
  if (discordSession?.token) {
    await applySession(discordSession);
    return;
  }

  if (state.token) {
    try {
      await loadAll();
      state.page = 'overview';
      renderAuthenticatedView();
    } catch(e) {
      localStorage.removeItem('sentinel_token');
      state.token = null;
      renderLogin();
    }
  } else {
    await loadPublicConfig();
    renderLogin();
  }
}

document.addEventListener('DOMContentLoaded', init);
