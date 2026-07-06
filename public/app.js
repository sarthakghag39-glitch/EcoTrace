// API Base URL (relative since frontend is served by Express)
const API_URL = '';

// APPLICATION STATE
let state = {
  token: localStorage.getItem('ecotrace_token') || null,
  user: null,
  history: [],
  quests: [],
  leaderboard: [],
  activeWizardStep: 1,
  activeChartTab: 'breakdown', // 'breakdown' or 'history'
  breakdownChartInstance: null,
  historyChartInstance: null
};

// DOM ELEMENTS - NAVIGATION
const logoLink = document.getElementById('logo-link');
const mainNav = document.getElementById('main-nav');
const navDashboardLink = document.getElementById('nav-dashboard-link');
const navCalcLink = document.getElementById('nav-calc-link');
const navQuestsLink = document.getElementById('nav-quests-link');
const navLeaderboardLink = document.getElementById('nav-leaderboard-link');
const headerGetStartedBtn = document.getElementById('header-get-started-btn');
const userProfileBadge = document.getElementById('user-profile-badge');
const userAvatarInitial = document.getElementById('user-avatar-initial');
const userDisplayName = document.getElementById('user-display-name');
const userDisplayLevel = document.getElementById('user-display-level');
const logoutBtn = document.getElementById('logout-btn');

// DOM ELEMENTS - SECTIONS
const landingSection = document.getElementById('landing-section');
const aboutSdg13Section = document.getElementById('about-sdg13');
const appDashboardSection = document.getElementById('app-dashboard-section');
const authSection = document.getElementById('auth-section');

// DOM ELEMENTS - AUTH
const tabLoginBtn = document.getElementById('tab-login-btn');
const tabRegisterBtn = document.getElementById('tab-register-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const heroCtaBtn = document.getElementById('hero-cta-btn');

// DOM ELEMENTS - DASHBOARD WIDGETS
const dashStreak = document.getElementById('dash-streak');
const dashCarbonSaved = document.getElementById('dash-carbon-saved');
const dashPoints = document.getElementById('dash-points');
const dashLevel = document.getElementById('dash-level');

// DOM ELEMENTS - CALCULATOR WIZARD
const footprintWizardForm = document.getElementById('footprint-wizard-form');
const wizardPrevBtn = document.getElementById('wizard-prev-btn');
const wizardNextBtn = document.getElementById('wizard-next-btn');
const wizardSubmitBtn = document.getElementById('wizard-submit-btn');
const recycleSlider = document.getElementById('recycle-rate');
const recycleValue = document.getElementById('recycle-value');

// DOM ELEMENTS - QUESTS & LEADERBOARD
const questsList = document.getElementById('quests-list');
const leaderboardBody = document.getElementById('leaderboard-body');
const recommendationPanel = document.getElementById('recommendation-panel');
const recText = document.getElementById('rec-text');
const recSavingEst = document.getElementById('rec-saving-est');

// DOM ELEMENTS - CHART TABS
const btnChartBreakdown = document.getElementById('btn-chart-breakdown');
const btnChartHistory = document.getElementById('btn-chart-history');
const chartBreakdownPanel = document.getElementById('chart-breakdown-panel');
const chartHistoryPanel = document.getElementById('chart-history-panel');
const chartNoData = document.getElementById('chart-no-data');

// DOM ELEMENTS - TOAST
const notificationToast = document.getElementById('notification-toast');
const toastTitle = document.getElementById('toast-title');
const toastBody = document.getElementById('toast-body');


// ---------------- UTILITIES & HELPERS ----------------

// Helper for making API calls
async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }
    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error.message);
    throw error;
  }
}

// Show Alert Toast
function showToast(title, message, type = 'success') {
  toastTitle.textContent = title;
  toastBody.textContent = message;
  
  notificationToast.className = 'notification-toast';
  notificationToast.classList.add(type === 'success' ? 'toast-success' : 'toast-error');
  notificationToast.classList.remove('hidden');

  setTimeout(() => {
    notificationToast.classList.add('hidden');
  }, 4000);
}

// Update UI Page state (SPA view toggle)
function toggleAppState() {
  if (state.token) {
    // Logged In
    landingSection.classList.add('hidden');
    aboutSdg13Section.classList.add('hidden');
    appDashboardSection.classList.remove('hidden');
    mainNav.classList.remove('hidden');
    headerGetStartedBtn.classList.add('hidden');
    userProfileBadge.classList.remove('hidden');
    
    if (state.user) {
      userDisplayName.textContent = state.user.name;
      userAvatarInitial.textContent = state.user.name.charAt(0).toUpperCase();
      userDisplayLevel.textContent = `Level ${state.user.level} Eco-Citizen`;
    }
  } else {
    // Logged Out
    landingSection.classList.remove('hidden');
    aboutSdg13Section.classList.remove('hidden');
    appDashboardSection.classList.add('hidden');
    mainNav.classList.add('hidden');
    headerGetStartedBtn.classList.remove('hidden');
    userProfileBadge.classList.add('hidden');
  }
}

// Reset Wizard Calculator
function resetWizard() {
  state.activeWizardStep = 1;
  updateWizardUI();
  footprintWizardForm.reset();
  
  // Reset custom toggle button groups to defaults
  document.querySelectorAll('#car-type-group .btn-toggle').forEach(btn => btn.classList.remove('active'));
  document.querySelector('#car-type-group .btn-toggle[data-value="petrol"]').classList.add('active');
  document.getElementById('car-type').value = 'petrol';

  document.querySelectorAll('#waste-volume-group .btn-toggle').forEach(btn => btn.classList.remove('active'));
  document.querySelector('#waste-volume-group .btn-toggle[data-value="medium"]').classList.add('active');
  document.getElementById('waste-volume').value = 'medium';

  document.querySelectorAll('.radio-card').forEach(card => card.classList.remove('active'));
  document.querySelector('.radio-card input[value="average-meat"]').closest('.radio-card').classList.add('active');

  recycleSlider.value = 25;
  recycleValue.textContent = '25%';
}


// ---------------- VIEW ROUTING (SCROLLING) ----------------

function handleNavigation() {
  if (!state.token) return;
  
  const hash = window.location.hash || '#dashboard';
  
  // Highlight nav item
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  
  if (hash === '#dashboard') {
    navDashboardLink.classList.add('active');
    document.getElementById('calculator-card').scrollIntoView({ behavior: 'smooth' });
  } else if (hash === '#calculator') {
    navCalcLink.classList.add('active');
    document.getElementById('calculator-card').scrollIntoView({ behavior: 'smooth' });
  } else if (hash === '#quests') {
    navQuestsLink.classList.add('active');
    document.getElementById('quests-card-panel').scrollIntoView({ behavior: 'smooth' });
  } else if (hash === '#leaderboard') {
    navLeaderboardLink.classList.add('active');
    document.querySelector('.leaderboard-card').scrollIntoView({ behavior: 'smooth' });
  }
}

window.addEventListener('hashchange', handleNavigation);


// ---------------- AUTHENTICATION LOGIC ----------------

// Toggle Login / Register forms
tabLoginBtn.addEventListener('click', () => {
  tabLoginBtn.classList.add('active');
  tabRegisterBtn.classList.remove('active');
  loginForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
  loginError.classList.add('hidden');
});

tabRegisterBtn.addEventListener('click', () => {
  tabRegisterBtn.classList.add('active');
  tabLoginBtn.classList.remove('active');
  registerForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
  registerError.classList.add('hidden');
});

// Scroll to auth section on CTA click
[heroCtaBtn, headerGetStartedBtn].forEach(btn => {
  btn.addEventListener('click', () => {
    authSection.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('login-email').focus();
  });
});

// Submit Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const data = await apiRequest('/api/auth/login', 'POST', { email, password });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('ecotrace_token', data.token);
    
    showToast('Welcome back!', `Logged in as ${data.user.name}`, 'success');
    toggleAppState();
    await loadDashboardData();
    resetWizard();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.classList.remove('hidden');
  }
});

// Submit Register
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerError.classList.add('hidden');

  const name = document.getElementById('register-name').value;
  const email = document.getElementById('register-email').value;
  const password = document.getElementById('register-password').value;

  if (password.length < 6) {
    registerError.textContent = 'Password must be at least 6 characters.';
    registerError.classList.remove('hidden');
    return;
  }

  try {
    const data = await apiRequest('/api/auth/register', 'POST', { name, email, password });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('ecotrace_token', data.token);

    showToast('Success!', 'Account registered successfully!', 'success');
    toggleAppState();
    await loadDashboardData();
    resetWizard();
  } catch (err) {
    registerError.textContent = err.message;
    registerError.classList.remove('hidden');
  }
});

// Logout
logoutBtn.addEventListener('click', () => {
  state.token = null;
  state.user = null;
  state.history = [];
  state.quests = [];
  localStorage.removeItem('ecotrace_token');
  
  // Clear charts
  if (state.breakdownChartInstance) state.breakdownChartInstance.destroy();
  if (state.historyChartInstance) state.historyChartInstance.destroy();
  state.breakdownChartInstance = null;
  state.historyChartInstance = null;

  showToast('Logged Out', 'Successfully logged out of your account.', 'success');
  toggleAppState();
  window.location.hash = '';
});


// ---------------- CALCULATOR WIZARD LOGIC ----------------

// Setup custom toggles
function setupToggleButtons(groupId, hiddenInputId) {
  const container = document.getElementById(groupId);
  const hiddenInput = document.getElementById(hiddenInputId);
  const buttons = container.querySelectorAll('.btn-toggle');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      hiddenInput.value = btn.dataset.value;
    });
  });
}

setupToggleButtons('car-type-group', 'car-type');
setupToggleButtons('waste-volume-group', 'waste-volume');

// Radio cards selection for diet
document.querySelectorAll('.radio-card').forEach(card => {
  const radio = card.querySelector('input[type="radio"]');
  card.addEventListener('click', () => {
    document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
    radio.checked = true;
  });
});

// Slider value binding
recycleSlider.addEventListener('input', (e) => {
  recycleValue.textContent = `${e.target.value}%`;
});

// Wizard steps forward/backward navigation
function updateWizardUI() {
  // Hide all step panels
  for (let i = 1; i <= 4; i++) {
    document.getElementById(`step-panel-${i}`).classList.add('hidden');
    document.getElementById(`step-ind-${i}`).className = 'step-indicator';
    if (i < state.activeWizardStep) {
      document.getElementById(`step-ind-${i}`).classList.add('completed');
    } else if (i === state.activeWizardStep) {
      document.getElementById(`step-ind-${i}`).classList.add('active');
    }
  }

  // Show active step panel
  document.getElementById(`step-panel-${state.activeWizardStep}`).classList.remove('hidden');

  // Toggle button visibilities
  if (state.activeWizardStep === 1) {
    wizardPrevBtn.classList.add('hidden');
    wizardNextBtn.classList.remove('hidden');
    wizardSubmitBtn.classList.add('hidden');
  } else if (state.activeWizardStep === 4) {
    wizardPrevBtn.classList.remove('hidden');
    wizardNextBtn.classList.add('hidden');
    wizardSubmitBtn.classList.remove('hidden');
  } else {
    wizardPrevBtn.classList.remove('hidden');
    wizardNextBtn.classList.remove('hidden');
    wizardSubmitBtn.classList.add('hidden');
  }
}

wizardNextBtn.addEventListener('click', () => {
  // Validate current step inputs
  if (state.activeWizardStep === 1) {
    const carD = parseFloat(document.getElementById('car-distance').value);
    const transitD = parseFloat(document.getElementById('transit-distance').value);
    const flightH = parseFloat(document.getElementById('flight-hours').value);

    if (isNaN(carD) || carD < 0 || isNaN(transitD) || transitD < 0 || isNaN(flightH) || flightH < 0) {
      showToast('Validation Error', 'Please enter valid non-negative values.', 'error');
      return;
    }
  } else if (state.activeWizardStep === 2) {
    const elec = parseFloat(document.getElementById('electricity-kwh').value);
    const gas = parseFloat(document.getElementById('gas-kwh').value);

    if (isNaN(elec) || elec < 0 || isNaN(gas) || gas < 0) {
      showToast('Validation Error', 'Please enter valid non-negative values.', 'error');
      return;
    }
  }

  state.activeWizardStep++;
  updateWizardUI();
});

wizardPrevBtn.addEventListener('click', () => {
  state.activeWizardStep--;
  updateWizardUI();
});

// Submit footprint calculator
footprintWizardForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const carDistance = parseFloat(document.getElementById('car-distance').value);
  const carType = document.getElementById('car-type').value;
  const transitDistance = parseFloat(document.getElementById('transit-distance').value);
  const flightHours = parseFloat(document.getElementById('flight-hours').value);
  const electricityKwh = parseFloat(document.getElementById('electricity-kwh').value);
  const gasKwh = parseFloat(document.getElementById('gas-kwh').value);
  const dietType = document.querySelector('input[name="diet-select"]:checked').value;
  const wasteVolume = document.getElementById('waste-volume').value;
  const recycleRate = parseInt(recycleSlider.value);

  const payload = {
    carDistance, carType, transitDistance, flightHours,
    electricityKwh, gasKwh, dietType, wasteVolume, recycleRate
  };

  try {
    const res = await apiRequest('/api/footprint/log', 'POST', payload);
    
    let msg = `Gained ${res.pointsEarned} XP!`;
    if (res.leveledUp) {
      msg = `Level Up! You are now Level ${res.newLevel}! (+${res.pointsEarned} XP)`;
    }
    
    showToast('Footprint Logged!', msg, 'success');
    
    // Update local profile representation
    state.user.points = res.newPoints;
    state.user.level = res.newLevel;
    
    await loadDashboardData();
    resetWizard();
    
    // Scroll to charts top to see immediate result
    document.querySelector('.analytics-card').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    showToast('Failed to log footprint', err.message, 'error');
  }
});


// ---------------- QUESTS LOGIC ----------------

// Render Quests list
function renderQuests() {
  questsList.innerHTML = '';
  
  if (state.quests.length === 0) {
    questsList.innerHTML = `<div class="quest-item"><p style="color: var(--text-muted); width: 100%; text-align: center;">No quests active at this moment.</p></div>`;
    return;
  }

  state.quests.forEach(quest => {
    const item = document.createElement('div');
    item.className = 'quest-item';
    if (quest.completedToday) {
      item.classList.add('completed');
    }

    item.innerHTML = `
      <div class="quest-left">
        <div class="quest-circle-icon qc-${quest.category}">
          <i class="${getQuestIcon(quest.category)}"></i>
        </div>
        <div class="quest-text">
          <h4>${quest.title}</h4>
          <p>${quest.description}</p>
          <div class="quest-meta">
            <span class="quest-co2-badge"><i class="fa-solid fa-cloud"></i> Saves ${quest.carbonSaved} kg CO2</span>
            <span class="quest-xp-reward"><i class="fa-solid fa-star"></i> +${quest.points} XP</span>
          </div>
        </div>
      </div>
      <button class="quest-action-btn" data-id="${quest.id}" ${quest.completedToday ? 'disabled' : ''}>
        ${quest.completedToday ? '<i class="fa-solid fa-circle-check"></i> Done' : 'Complete'}
      </button>
    `;

    // Attach complete click action
    if (!quest.completedToday) {
      const button = item.querySelector('.quest-action-btn');
      button.addEventListener('click', () => completeQuest(quest.id));
    }

    questsList.appendChild(item);
  });
}

function getQuestIcon(category) {
  switch (category) {
    case 'transport': return 'fa-solid fa-bus';
    case 'food': return 'fa-solid fa-seedling';
    case 'energy': return 'fa-solid fa-plug';
    case 'waste': return 'fa-solid fa-recycle';
    default: return 'fa-solid fa-leaf';
  }
}

// Complete Quest handler
async function completeQuest(questId) {
  try {
    const res = await apiRequest('/api/quests/complete', 'POST', { questId });
    
    let msg = `Quest complete! Saved ${res.carbonSaved} kg of carbon. (+${res.pointsEarned} XP)`;
    if (res.leveledUp) {
      msg = `Level Up to Level ${res.newLevel}! Saved ${res.carbonSaved} kg carbon.`;
    }

    showToast('Challenge Complete!', msg, 'success');
    
    // Update local state points
    state.user.points = res.newPoints;
    state.user.level = res.newLevel;

    await loadDashboardData();
  } catch (err) {
    showToast('Failed to complete challenge', err.message, 'error');
  }
}


// ---------------- LEADERBOARD LOGIC ----------------

// Render Leaderboard
function renderLeaderboard() {
  leaderboardBody.innerHTML = '';

  if (state.leaderboard.length === 0) {
    leaderboardBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">No leaderboard data available.</td></tr>`;
    return;
  }

  state.leaderboard.forEach((record, index) => {
    const isCurrentUser = state.user && record.name.startsWith(state.user.name);
    const row = document.createElement('tr');
    if (isCurrentUser) {
      row.className = 'current-user';
    }

    const rankVal = index + 1;
    let rankBadgeClass = 'rank-other';
    if (rankVal === 1) rankBadgeClass = 'rank-1';
    else if (rankVal === 2) rankBadgeClass = 'rank-2';
    else if (rankVal === 3) rankBadgeClass = 'rank-3';

    row.innerHTML = `
      <td><div class="leader-rank-badge ${rankBadgeClass}">${rankVal}</div></td>
      <td>${record.name} ${isCurrentUser ? '(You)' : ''}</td>
      <td>${record.level}</td>
      <td style="font-weight: 550; color: var(--secondary);">${record.carbonSaved.toFixed(1)} kg</td>
      <td style="font-weight: 600;">${record.points}</td>
    `;
    leaderboardBody.appendChild(row);
  });
}


// ---------------- SMART ECO RECOMMENDATIONS ----------------

function computeRecommendations(latestLog) {
  if (!latestLog) {
    recommendationPanel.classList.add('hidden');
    return;
  }

  // Find max category between transport, energy, diet, waste
  const categories = [
    { name: 'transport', val: latestLog.transport, icon: 'fa-solid fa-car', recText: 'Transportation makes up the bulk of your carbon footprint. Try walking or cycling for trips under 3 miles, map errand drives together, or swap two driving commutes for public transit weekly.', saving: '32.5 kg' },
    { name: 'energy', val: latestLog.energy, icon: 'fa-solid fa-plug', recText: 'Home heating and electricity is your largest carbon driver. Consider washing laundry in cold water only, air-drying clothes, switching lightbulbs to high-efficiency LEDs, and turning down your thermostat by 2°C.', saving: '24.0 kg' },
    { name: 'diet', val: latestLog.diet, icon: 'fa-solid fa-utensils', recText: 'Food production emissions dominate your footprint. Shifting to vegetarian meals even three days a week or swapping red meat for poultry and beans makes a dramatic footprint reduction.', saving: '41.2 kg' },
    { name: 'waste', val: latestLog.waste, icon: 'fa-solid fa-recycle', recText: 'Landfill waste and plastics are producing significant carbon footprint. Try setting up a home compost system for food leftovers, buying staples in bulk, and carrying reusable bags and bottles.', saving: '15.8 kg' }
  ];

  // Sort descending
  categories.sort((a, b) => b.val - a.val);
  const highest = categories[0];

  recText.textContent = highest.recText;
  recSavingEst.textContent = highest.saving;
  
  // Update recommendation icon color matching category
  const iconDiv = recommendationPanel.querySelector('.rec-icon');
  iconDiv.innerHTML = `<i class="${highest.icon}"></i>`;
  iconDiv.className = 'rec-icon';
  if (highest.name === 'transport') iconDiv.style.color = 'var(--secondary)';
  else if (highest.name === 'energy') iconDiv.style.color = 'var(--accent)';
  else if (highest.name === 'diet') iconDiv.style.color = 'var(--primary)';
  else if (highest.name === 'waste') iconDiv.style.color = '#a78bfa';

  recommendationPanel.classList.remove('hidden');
}


// ---------------- DATA VISUALIZATION (CHART.JS) ----------------

btnChartBreakdown.addEventListener('click', () => {
  btnChartBreakdown.classList.add('active');
  btnChartHistory.classList.remove('active');
  chartBreakdownPanel.classList.remove('hidden');
  chartHistoryPanel.classList.add('hidden');
  state.activeChartTab = 'breakdown';
  
  // trigger breakdown chart redraw to fit
  if (state.breakdownChartInstance) {
    state.breakdownChartInstance.resize();
  }
});

btnChartHistory.addEventListener('click', () => {
  btnChartHistory.classList.add('active');
  btnChartBreakdown.classList.remove('active');
  chartHistoryPanel.classList.remove('hidden');
  chartBreakdownPanel.classList.add('hidden');
  state.activeChartTab = 'history';
  
  // trigger history chart redraw to fit
  if (state.historyChartInstance) {
    state.historyChartInstance.resize();
  }
});

function drawBreakdownChart(latestLog) {
  const ctx = document.getElementById('breakdownChart').getContext('2d');
  
  // Destroy old instance
  if (state.breakdownChartInstance) {
    state.breakdownChartInstance.destroy();
  }

  if (!latestLog) {
    chartNoData.classList.remove('hidden');
    document.getElementById('breakdownChart').style.display = 'none';
    return;
  }

  chartNoData.classList.add('hidden');
  document.getElementById('breakdownChart').style.display = 'block';

  state.breakdownChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Transport', 'Home Energy', 'Food & Diet', 'Waste & Composting'],
      datasets: [{
        data: [latestLog.transport, latestLog.energy, latestLog.diet, latestLog.waste],
        backgroundColor: [
          'rgba(6, 182, 212, 0.65)',  // Cyan
          'rgba(245, 158, 11, 0.65)',  // Gold
          'rgba(16, 185, 129, 0.65)',  // Emerald
          'rgba(139, 92, 246, 0.65)'   // Purple
        ],
        borderColor: [
          '#06b6d4',
          '#f59e0b',
          '#10b981',
          '#8b5cf6'
        ],
        borderWidth: 1.5,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#0f172a',
            font: {
              family: 'Outfit',
              size: 11
            },
            padding: 15
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f8fafc',
          bodyColor: '#e2e8f0',
          titleFont: { family: 'Outfit', weight: 'bold' },
          bodyFont: { family: 'Inter' },
          callbacks: {
            label: function(context) {
              return ` ${context.label}: ${context.raw.toFixed(1)} kg CO2e`;
            }
          }
        }
      },
      cutout: '65%'
    }
  });
}

function drawHistoryChart(logs) {
  const ctx = document.getElementById('historyChart').getContext('2d');

  // Destroy old instance
  if (state.historyChartInstance) {
    state.historyChartInstance.destroy();
  }

  if (!logs || logs.length === 0) {
    return;
  }

  // Reverse list to show chronological order (oldest to newest)
  const cronLogs = [...logs].reverse();
  
  // Format labels: "July 5"
  const labels = cronLogs.map(log => {
    const d = new Date(log.createdAt);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const datasetData = cronLogs.map(log => log.totalCarbon);

  state.historyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Carbon Footprint Trend',
        data: datasetData,
        borderColor: '#06b6d4',
        borderWidth: 3,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.35,
        fill: true,
        backgroundColor: function(context) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          if (!chartArea) return null;
          
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
          gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');
          return gradient;
        }
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f8fafc',
          bodyColor: '#e2e8f0',
          titleFont: { family: 'Outfit', weight: 'bold' },
          bodyFont: { family: 'Inter' },
          callbacks: {
            label: function(context) {
              return ` Footprint: ${context.raw.toFixed(1)} kg CO2e`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(15, 23, 42, 0.04)'
          },
          ticks: {
            color: '#475569',
            font: { family: 'Inter', size: 10 }
          }
        },
        y: {
          grid: {
            color: 'rgba(15, 23, 42, 0.05)'
          },
          ticks: {
            color: '#475569',
            font: { family: 'Inter', size: 10 }
          },
          title: {
            display: true,
            text: 'Emissions (kg CO2e)',
            color: '#475569',
            font: { family: 'Outfit', size: 11 }
          }
        }
      }
    }
  });
}


// ---------------- INITIAL DATA LOADING ----------------

// Fetch and load dashboard stats and components
async function loadDashboardData() {
  if (!state.token) return;

  try {
    // 1. Fetch user profile
    const profile = await apiRequest('/api/user/profile');
    state.user = profile;
    
    // Update stats cards
    dashStreak.textContent = `${profile.streak || 0} Day${profile.streak === 1 ? '' : 's'}`;
    dashCarbonSaved.textContent = `${(profile.totalCarbonSaved || 0).toFixed(1)} kg`;
    dashPoints.textContent = `${profile.points} XP`;
    dashLevel.textContent = `Level ${profile.level}`;

    // Update Profile badge
    userDisplayName.textContent = profile.name;
    userDisplayLevel.textContent = `Level ${profile.level} Eco-Citizen`;
    userAvatarInitial.textContent = profile.name.charAt(0).toUpperCase();

    // 2. Fetch footprint history logs
    const history = await apiRequest('/api/footprint/history');
    state.history = history;

    // Render charts
    const latestLog = history.length > 0 ? history[0] : null;
    drawBreakdownChart(latestLog);
    drawHistoryChart(history);
    computeRecommendations(latestLog);

    // 3. Fetch quests
    const quests = await apiRequest('/api/quests');
    state.quests = quests;
    renderQuests();

    // 4. Fetch leaderboard
    const leaderboard = await apiRequest('/api/leaderboard');
    
    // Flag current user in leaderboard array
    const taggedLeaderboard = leaderboard.map(record => {
      if (record.name === profile.name || record.name.startsWith(profile.name)) {
        return { ...record, name: profile.name, points: profile.points, carbonSaved: profile.totalCarbonSaved || 0, level: profile.level };
      }
      return record;
    });

    // Re-sort in case active user score overtook someone
    taggedLeaderboard.sort((a, b) => b.points - a.points);
    state.leaderboard = taggedLeaderboard;
    renderLeaderboard();

  } catch (err) {
    console.error("Dashboard loading error:", err);
    showToast('Data Error', 'Could not refresh some dashboard stats.', 'error');
  }
}

// APP INITIALIZATION
async function initApp() {
  toggleAppState();
  if (state.token) {
    await loadDashboardData();
  }
}

// Run app init on load
window.addEventListener('DOMContentLoaded', initApp);
