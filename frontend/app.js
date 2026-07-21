const API_BASE = window.SENTINEL_API_BASE || '';

const state = {
  page: 'login',
  user: null,
  token: localStorage.getItem('token') || null,
  players: [],
  alerts: [],
  bans: [],
  actions: [],
  config: {}
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

async function fetchApi(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.querySelector('input[name="username"]').value;
  const password = document.querySelector('input[name="password"]').value;
  
  try {
    const data = await fetchApi('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('token', state.token);
    state.page = 'dashboard';
    loadDashboard();
  } catch (err) {
    alert('Login failed: ' + err.message);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.querySelector('input[name="username"]').value;
  const password = document.querySelector('input[name="password"]').value;
  
  try {
    await fetchApi('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    await handleLogin(e);
  } catch (err) {
    alert('Register failed: ' + err.message);
  }
}

async function handleLogout() {
  localStorage.removeItem('token');
  state.token = null;
  state.user = null;
  state.page = 'login';
  renderLoginPage();
}

async function handleBan(playerId, playerName) {
  const reason = prompt(`Ban ${playerName}? Enter reason:`, 'Cheating');
  if (!reason) return;
  
  try {
    await fetchApi('/api/moderation/ban', {
      method: 'POST',
      body: JSON.stringify({ playerId, playerName, reason })
    });
    loadDashboard();
  } catch (err) {
    alert('Ban failed: ' + err.message);
  }
}

async function handleKick(playerId, playerName) {
  const reason = prompt(`Kick ${playerName}? Enter reason:`, 'Rule violation');
  if (!reason) return;
  
  try {
    await fetchApi('/api/moderation/kick', {
      method: 'POST',
      body: JSON.stringify({ playerId, playerName, reason })
    });
    loadDashboard();
  } catch (err) {
    alert('Kick failed: ' + err.message);
  }
}

async function loadDashboard() {
  try {
    const [players, alerts, bans, actions, config] = await Promise.all([
      fetchApi('/api/players'),
      fetchApi('/api/alerts'),
      fetchApi('/api/bans'),
      fetchApi('/api/actions'),
      fetchApi('/api/config')
    ]);
    state.players = players || [];
    state.alerts = alerts || [];
    state.bans = bans || [];
    state.actions = actions || [];
    state.config = config || {};
    renderDashboard();
  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

function renderLoginPage() {
  state.page = 'login';
  const app = document.getElementById('app');
  app.innerHTML = '';
  
  const container = createElement('div', { className: 'auth-container' },
    createElement('div', { className: 'starfield' }),
    createElement('div', { className: 'auth-box' },
      createElement('div', { className: 'auth-header' },
        createElement('h1', {}, '⚔️ Sentinel AC'),
        createElement('p', {}, 'AntiCheat Portal')
      ),
      createElement('form', { 
        className: 'auth-form',
        onsubmit: handleLogin
      },
        createElement('div', { className: 'form-group' },
          createElement('label', {}, 'Username'),
          createElement('input', {
            className: 'form-input',
            type: 'text',
            name: 'username',
            placeholder: 'admin',
            required: true
          })
        ),
        createElement('div', { className: 'form-group' },
          createElement('label', {}, 'Password'),
          createElement('input', {
            className: 'form-input',
            type: 'password',
            name: 'password',
            placeholder: 'Admin123!',
            required: true
          })
        ),
        createElement('button', {
          className: 'button',
          type: 'submit'
        }, 'Login')
      ),
      createElement('div', { className: 'auth-switch' },
        createElement('p', {}, "Don't have an account? "),
        createElement('a', {
          href: '#',
          onclick: (e) => {
            e.preventDefault();
            renderRegisterPage();
          }
        }, 'Register here')
      ),
      createElement('div', { className: 'demo-info' },
        createElement('strong', {}, '🎮 Demo Account'),
        createElement('p', {}, 'Username: admin'),
        createElement('p', {}, 'Password: Admin123!')
      )
    )
  );
  
  app.appendChild(container);
}

function renderRegisterPage() {
  state.page = 'register';
  const app = document.getElementById('app');
  app.innerHTML = '';
  
  const container = createElement('div', { className: 'auth-container' },
    createElement('div', { className: 'starfield' }),
    createElement('div', { className: 'auth-box' },
      createElement('div', { className: 'auth-header' },
        createElement('h1', {}, '⚔️ Sentinel AC'),
        createElement('p', {}, 'Create Account')
      ),
      createElement('form', { 
        className: 'auth-form',
        onsubmit: async (e) => {
          e.preventDefault();
          const username = document.querySelector('input[name="username"]').value;
          const password = document.querySelector('input[name="password"]').value;
          const confirmPassword = document.querySelector('input[name="confirmPassword"]').value;
          
          if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
          }
          
          try {
            await fetchApi('/api/auth/register', {
              method: 'POST',
              body: JSON.stringify({ username, password })
            });
            alert('Account created! Logging in...');
            const loginForm = document.createElement('form');
            const event = new Event('submit', { cancelable: true });
            loginForm.dispatchEvent(event);
            await handleLogin({ preventDefault: () => {} });
          } catch (err) {
            alert('Registration failed: ' + err.message);
          }
        }
      },
        createElement('div', { className: 'form-group' },
          createElement('label', {}, 'Username'),
          createElement('input', {
            className: 'form-input',
            type: 'text',
            name: 'username',
            placeholder: 'Choose a username',
            required: true
          })
        ),
        createElement('div', { className: 'form-group' },
          createElement('label', {}, 'Password'),
          createElement('input', {
            className: 'form-input',
            type: 'password',
            name: 'password',
            placeholder: 'Create a password',
            required: true
          })
        ),
        createElement('div', { className: 'form-group' },
          createElement('label', {}, 'Confirm Password'),
          createElement('input', {
            className: 'form-input',
            type: 'password',
            name: 'confirmPassword',
            placeholder: 'Confirm your password',
            required: true
          })
        ),
        createElement('button', {
          className: 'button',
          type: 'submit'
        }, 'Create Account')
      ),
      createElement('div', { className: 'auth-switch' },
        createElement('p', {}, 'Already have an account? '),
        createElement('a', {
          href: '#',
          onclick: (e) => {
            e.preventDefault();
            renderLoginPage();
          }
        }, 'Login here')
      )
    )
  );
  
  app.appendChild(container);
}

function renderDashboard() {
  state.page = 'dashboard';
  const app = document.getElementById('app');
  app.innerHTML = '';
  
  const totalAlerts = state.alerts.length;
  const totalBans = state.bans.length;
  const onlinePlayers = state.players.filter(p => p.status === 'online').length;
  
  const dashboard = createElement('div', { className: 'dashboard' },
    createElement('div', { className: 'starfield' }),
    
    createElement('div', { className: 'navbar' },
      createElement('div', { className: 'nav-brand' },
        createElement('h2', {}, '⚔️ Sentinel AC')
      ),
      createElement('div', { className: 'nav-user' },
        createElement('span', {}, `Hello, ${state.user?.username || 'Admin'}`),
        createElement('button', {
          className: 'button outline-small',
          onclick: handleLogout
        }, 'Logout')
      )
    ),
    
    createElement('div', { className: 'dash-container' },
      createElement('div', { className: 'metrics' },
        createElement('div', { className: 'metric-card' },
          createElement('div', { className: 'metric-label' }, 'Online Players'),
          createElement('div', { className: 'metric-value' }, onlinePlayers)
        ),
        createElement('div', { className: 'metric-card' },
          createElement('div', { className: 'metric-label' }, 'Total Alerts'),
          createElement('div', { className: 'metric-value' }, totalAlerts)
        ),
        createElement('div', { className: 'metric-card' },
          createElement('div', { className: 'metric-label' }, 'Banned Players'),
          createElement('div', { className: 'metric-value' }, totalBans)
        ),
        createElement('div', { className: 'metric-card' },
          createElement('div', { className: 'metric-label' }, 'Actions'),
          createElement('div', { className: 'metric-value' }, state.actions.length)
        )
      ),
      
      createElement('div', { className: 'content-grid' },
        createElement('div', { className: 'panel' },
          createElement('h2', {}, '👥 Players'),
          state.players.length === 0 
            ? createElement('div', { className: 'empty' }, 'No players online')
            : createElement('table', { className: 'data-table' },
                createElement('thead', {},
                  createElement('tr', {},
                    createElement('th', {}, 'Name'),
                    createElement('th', {}, 'Status'),
                    createElement('th', {}, 'Actions')
                  )
                ),
                createElement('tbody', {},
                  ...state.players.map(p =>
                    createElement('tr', {},
                      createElement('td', {}, p.name),
                      createElement('td', {},
                        createElement('span', {
                          className: `status-${p.status || 'offline'}`
                        }, p.status?.toUpperCase() || 'OFFLINE')
                      ),
                      createElement('td', {},
                        createElement('div', { className: 'action-buttons' },
                          createElement('button', {
                            className: 'button-small danger',
                            onclick: () => handleBan(p.id, p.name)
                          }, 'BAN'),
                          createElement('button', {
                            className: 'button-small warning',
                            onclick: () => handleKick(p.id, p.name)
                          }, 'KICK')
                        )
                      )
                    )
                  )
                )
              )
        ),
        
        createElement('div', { className: 'panel' },
          createElement('h2', {}, '🚨 Recent Alerts'),
          state.alerts.length === 0
            ? createElement('div', { className: 'empty' }, 'No alerts')
            : createElement('ul', { className: 'alert-list' },
                ...state.alerts.slice(0, 10).map(a =>
                  createElement('li', { className: 'alert-item' },
                    createElement('div', {},
                      createElement('div', { className: 'alert-reason' }, a.reason || 'Unknown'),
                      createElement('div', { className: 'alert-points' }, `${a.points} pts`)
                    )
                  )
                )
              )
        ),
        
        createElement('div', { className: 'panel' },
          createElement('h2', {}, '📋 Recent Actions'),
          state.actions.length === 0
            ? createElement('div', { className: 'empty' }, 'No actions')
            : createElement('ul', { className: 'action-list' },
                ...state.actions.slice(0, 10).map(act =>
                  createElement('li', { className: 'action-item' },
                    createElement('span', { className: `action-type-${act.type}` }, act.type?.toUpperCase()),
                    createElement('span', { className: 'action-actor' }, act.actor || 'System')
                  )
                )
              )
        )
      )
    )
  );
  
  app.appendChild(dashboard);
}

async function init() {
  if (state.token) {
    state.page = 'dashboard';
    await loadDashboard();
  } else {
    renderLoginPage();
  }
}

document.addEventListener('DOMContentLoaded', init);
