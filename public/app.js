const state = {
  profiles: [],
  profileId: '',
  summary: null
};

const $ = (selector) => document.querySelector(selector);
const api = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
};

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 3600);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function averageRating(attributes) {
  if (!attributes.length) return 0;
  return Math.round(attributes.reduce((sum, attr) => sum + Number(attr.rating), 0) / attributes.length);
}

function setProfiles(profiles) {
  state.profiles = profiles;
  const select = $('#profileSelect');
  select.innerHTML = profiles.map((profile) => `<option value="${profile.id}">${profile.name}</option>`).join('');
  const saved = localStorage.getItem('at2kProfileId');
  state.profileId = profiles.some((profile) => profile.id === saved) ? saved : profiles[0]?.id;
  if (state.profileId) select.value = state.profileId;
}

async function loadProfiles() {
  const profiles = await api('/api/profiles');
  setProfiles(profiles);
  if (state.profileId) await loadSummary();
}

async function loadSummary() {
  state.summary = await api(`/api/profiles/${state.profileId}/summary`);
  localStorage.setItem('at2kProfileId', state.profileId);
  render();
}

function render() {
  const { summary } = state;
  if (!summary) return;
  renderOverview(summary);
  renderAttributes(summary.attributes);
  renderSkills(summary.skills);
  renderCheckinForm(summary);
  renderBadges(summary.badges);
  renderQuests(summary.quests);
  renderTrends(summary.trends);
}

function renderOverview(summary) {
  const overall = averageRating(summary.attributes);
  $('#overallRating').textContent = overall;
  $('#archetypeName').textContent = summary.archetype.name;
  $('#archetypeDescription').textContent = summary.archetype.description;
  $('#levelLabel').textContent = `Level ${summary.xp.level}`;
  $('#totalXp').textContent = `${summary.xp.totalXp.toLocaleString()} XP`;
  $('#xpFill').style.width = `${summary.xp.progress}%`;
  $('#xpNext').textContent = `${Math.max(0, summary.xp.nextLevelXp - summary.xp.totalXp).toLocaleString()} XP to next level`;
  $('#xpFormula').textContent = summary.formula;
  $('#currentStreak').textContent = summary.streaks.current;
  $('#bestStreak').textContent = summary.streaks.best;
  $('#weeklyXp').textContent = summary.trends.weekly.xp;
  $('#capList').innerHTML = summary.archetype.boosts.map((boost) => `<span class="pill">${boost}</span>`).join('');
}

function renderAttributes(attributes) {
  $('#attributeGrid').innerHTML = attributes.map((attr) => `
    <article class="attribute-card">
      <div class="meter" style="--value:${attr.rating}">
        <strong>${attr.rating}</strong>
      </div>
      <div>
        <h3>${attr.name}</h3>
        <small>Cap ${attr.cap}</small>
      </div>
    </article>
  `).join('');
}

function renderSkills(skills) {
  $('#skillList').innerHTML = skills.length ? skills.map((skill) => `
    <article class="skill-item">
      <div class="quest-meta">
        <h3>${skill.name}</h3>
        <strong>${skill.rating}</strong>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${skill.rating}%"></div></div>
      <small>Cap ${skill.cap}</small>
    </article>
  `).join('') : '<p class="muted">No custom skills yet.</p>';
}

function sliderCard(name, value, group) {
  const id = `${group}-${name.replace(/\W+/g, '-')}`;
  return `
    <label class="slider-card" data-group="${group}" data-name="${name}">
      <div><span>${name}</span><strong id="${id}-value">${value}</strong></div>
      <input id="${id}" type="range" min="1" max="99" value="${value}">
    </label>
  `;
}

function wireSliders(container) {
  container.querySelectorAll('input[type="range"]').forEach((input) => {
    const value = document.getElementById(`${input.id}-value`);
    input.addEventListener('input', () => {
      value.textContent = input.value;
    });
  });
}

function renderCheckinForm(summary) {
  $('#checkinDate').value = today();
  const attrContainer = $('#checkinAttributes');
  attrContainer.innerHTML = summary.attributes.map((attr) => sliderCard(attr.name, attr.rating, 'attributes')).join('');
  wireSliders(attrContainer);

  const skillContainer = $('#checkinSkills');
  skillContainer.innerHTML = summary.skills.length
    ? `<p class="eyebrow">Skill Updates</p>${summary.skills.map((skill) => sliderCard(skill.name, skill.rating, 'skills')).join('')}`
    : '';
  wireSliders(skillContainer);
}

function renderBadges(badges) {
  $('#badgeGrid').innerHTML = badges.map((badge) => `
    <article class="badge ${badge.unlocked ? 'unlocked' : ''}">
      <strong>${badge.name}<span>${badge.unlocked ? 'Unlocked' : `${badge.progress}%`}</span></strong>
      <small>${badge.detail}</small>
      <div class="bar-track"><div class="bar-fill" style="width:${badge.progress}%"></div></div>
    </article>
  `).join('');
}

function renderQuests(quests) {
  $('#questList').innerHTML = quests.map((quest) => `
    <article class="quest-card ${quest.status === 'complete' ? 'complete' : ''}">
      <div class="quest-meta">
        <h3>${quest.title}</h3>
        <span class="pill">${quest.type}</span>
      </div>
      <small>${quest.xpReward} XP reward · ${quest.date}</small>
      <button class="secondary" data-quest-id="${quest.id}" ${quest.status === 'complete' ? 'disabled' : ''}>
        ${quest.status === 'complete' ? 'Complete' : 'Mark Complete'}
      </button>
    </article>
  `).join('');

  $('#questList').querySelectorAll('button[data-quest-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        state.summary = await api(`/api/profiles/${state.profileId}/quests/${button.dataset.questId}/complete`, { method: 'POST' });
        render();
        toast('Quest completed. XP added to progression.');
      } catch (error) {
        toast(error.message);
      }
    });
  });
}

function renderTrends(trends) {
  $('#weeklySummary').textContent = `${trends.weekly.activeDays} active days · ${trends.weekly.averageXp} avg XP`;
  const maxXp = Math.max(100, ...trends.recent.map((item) => item.xpGained));
  $('#trendBars').innerHTML = trends.recent.slice().reverse().map((item) => `
    <div class="trend-item">
      <header><small>${item.date}</small><strong>${item.xpGained} XP</strong></header>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round((item.xpGained / maxXp) * 100)}%"></div></div>
    </div>
  `).join('');

  $('#activityList').innerHTML = trends.recent.map((item) => {
    const changed = Object.entries(item.updates.attributes || {}).slice(0, 4).map(([name, value]) => `${name} ${value}`).join(' · ');
    return `
      <article class="activity-card">
        <header><strong>${item.date}</strong><span class="pill">${item.xpGained} XP</span></header>
        <p>${changed || 'Check-in logged'}</p>
        ${item.notes ? `<p>${item.notes}</p>` : ''}
      </article>
    `;
  }).join('');
}

function collectSliderValues(group) {
  const values = {};
  document.querySelectorAll(`.slider-card[data-group="${group}"]`).forEach((card) => {
    const input = card.querySelector('input');
    values[card.dataset.name] = Number(input.value);
  });
  return values;
}

function bindEvents() {
  $('#profileSelect').addEventListener('change', async (event) => {
    state.profileId = event.target.value;
    await loadSummary();
  });

  $('#profileForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = $('#profileName').value.trim();
    if (!name) return;
    try {
      const profile = await api('/api/profiles', {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      $('#profileName').value = '';
      const profiles = await api('/api/profiles');
      setProfiles(profiles);
      state.profileId = profile.id;
      $('#profileSelect').value = profile.id;
      await loadSummary();
      toast('Profile created.');
    } catch (error) {
      toast(error.message);
    }
  });

  $('#skillForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api(`/api/profiles/${state.profileId}/skills`, {
        method: 'POST',
        body: JSON.stringify({
          name: $('#skillName').value,
          rating: $('#skillRating').value
        })
      });
      $('#skillName').value = '';
      $('#skillRating').value = 50;
      await loadSummary();
      toast('Skill added.');
    } catch (error) {
      toast(error.message);
    }
  });

  $('#checkinForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      state.summary = await api(`/api/profiles/${state.profileId}/checkins`, {
        method: 'POST',
        body: JSON.stringify({
          date: $('#checkinDate').value || today(),
          xpGained: $('#xpGained').value,
          notes: $('#notes').value,
          updates: {
            attributes: collectSliderValues('attributes'),
            skills: collectSliderValues('skills'),
            signals: {
              sleepHours: $('#sleepHours').value,
              learningMinutes: $('#learningMinutes').value,
              fitnessActivity: $('#fitnessActivity').checked,
              noSpend: $('#noSpend').checked
            }
          }
        })
      });
      $('#notes').value = '';
      $('#fitnessActivity').checked = false;
      $('#noSpend').checked = false;
      render();
      toast('Check-in saved. Attribute ratings and XP updated.');
    } catch (error) {
      toast(error.message);
    }
  });
}

bindEvents();
loadProfiles().catch((error) => toast(error.message));
