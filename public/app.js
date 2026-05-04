const CORE_ATTRIBUTES = ['Fitness', 'Focus', 'Discipline', 'Creativity', 'Social', 'Finance', 'Sleep', 'Learning'];
const XP_RULES = { dailyCheckin: 25, attributePoint: 10, skillPractice: 15, sideQuest: 40, mainQuest: 100, streak7: 150 };

const state = { profiles: [], profileId: '', summary: null, activeMobileSection: 'section-overview' };
const $ = (selector) => document.querySelector(selector);

const api = async (url, options = {}) => {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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
  select.innerHTML = profiles.map((profile) => `<option value="${profile.id}">${escapeHtml(profile.name)}</option>`).join('');
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
  updateMobileSections();
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
  $('#xpFormula').textContent = `Level ${summary.xp.level} · ${summary.xp.progress}%`;
  $('#xpExplainer').textContent = summary.formula;
  $('#currentStreak').textContent = summary.streaks.current;
  $('#bestStreak').textContent = summary.streaks.best;
  $('#weeklyXp').textContent = summary.trends.weekly.xp;
  $('#capList').innerHTML = summary.archetype.boosts.map((boost) => `<span class="pill">${escapeHtml(boost)}</span>`).join('');
}

function renderAttributes(attributes) {
  $('#attributeGrid').innerHTML = attributes.map((attr) => `
    <article class="attribute-card">
      <div class="meter" style="--value:${attr.rating}"><strong>${attr.rating}</strong></div>
      <div><h3>${escapeHtml(attr.name)}</h3><small>Cap ${attr.cap}</small></div>
    </article>
  `).join('');
}

function renderSkills(skills) {
  $('#skillList').innerHTML = skills.length ? skills.map((skill) => `
    <article class="skill-item">
      <div class="quest-meta"><h3>${escapeHtml(skill.name)}</h3><strong>${skill.rating}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${skill.rating}%"></div></div>
      <small>Cap ${skill.cap}</small>
    </article>
  `).join('') : '<p class="empty-state">No custom skills yet. Add one above to start tracking practice reps.</p>';
}

function deltaCard(attr) {
  const id = `delta-${attr.name.replace(/\W+/g, '-')}`;
  return `
    <label class="delta-card" data-name="${escapeHtml(attr.name)}" data-current="${attr.rating}">
      <div class="delta-head"><span>${escapeHtml(attr.name)}</span><strong><span>${attr.rating}</span> to <span id="${id}-projected">${attr.rating}</span></strong></div>
      <select id="${id}">
        <option value="0">0 today</option>
        <option value="1">+1</option>
        <option value="2">+2</option>
        <option value="3">+3</option>
        <option value="-1">-1</option>
      </select>
    </label>
  `;
}

function skillPracticeCard(skill) {
  return `
    <label class="practice-card">
      <input type="checkbox" value="${escapeHtml(skill.name)}">
      <span>${escapeHtml(skill.name)}</span>
      <strong>+${XP_RULES.skillPractice} XP</strong>
    </label>
  `;
}

function renderCheckinForm(summary) {
  $('#checkinDate').value = today();
  const attrContainer = $('#checkinAttributes');
  attrContainer.innerHTML = `<p class="eyebrow">Attribute Deltas</p>${summary.attributes.map(deltaCard).join('')}`;
  attrContainer.querySelectorAll('select').forEach((select) => {
    select.addEventListener('change', () => {
      const card = select.closest('.delta-card');
      const projected = Math.max(0, Math.min(99, Number(card.dataset.current) + Number(select.value)));
      document.getElementById(`${select.id}-projected`).textContent = projected;
      updateEstimatedXp();
    });
  });

  const skillContainer = $('#checkinSkills');
  skillContainer.innerHTML = summary.skills.length
    ? `<p class="eyebrow">Skill Practice</p>${summary.skills.map(skillPracticeCard).join('')}`
    : '<p class="empty-state">No custom skills yet. Add skills on the Attributes tab to log practice XP.</p>';
  skillContainer.querySelectorAll('input[type="checkbox"]').forEach((input) => input.addEventListener('change', updateEstimatedXp));
  updateEstimatedXp();
}

function updateEstimatedXp() {
  const totalDelta = Object.values(collectAttributeDeltas()).reduce((sum, value) => sum + Math.max(0, value), 0);
  const practiced = collectSkillPractice().length;
  let estimated = XP_RULES.dailyCheckin + (totalDelta * XP_RULES.attributePoint) + (practiced * XP_RULES.skillPractice);
  if (state.summary?.streaks?.current === 6) estimated += XP_RULES.streak7;
  $('#estimatedXp').textContent = estimated;
}

function renderBadges(badges) {
  const unlockedCount = badges.filter((badge) => badge.unlocked).length;
  const empty = unlockedCount ? '' : '<p class="empty-state">No badges unlocked yet. Raise attributes, build streaks, and finish quests to unlock your first badge.</p>';
  $('#badgeGrid').innerHTML = `${empty}${badges.map((badge) => `
    <article class="badge ${badge.unlocked ? 'unlocked' : ''}">
      <strong>${escapeHtml(badge.name)}<span>${badge.unlocked ? 'Unlocked' : `${badge.progress}%`}</span></strong>
      <small>${escapeHtml(badge.detail)}</small>
      <div class="bar-track"><div class="bar-fill" style="width:${badge.progress}%"></div></div>
    </article>
  `).join('')}`;
}

function questCard(quest) {
  const status = quest.status === 'complete' ? 'complete' : 'active';
  const dueDate = quest.dueDate ? ` · Due ${quest.dueDate}` : '';
  const linked = quest.linkedAttribute ? ` · ${quest.linkedAttribute}` : '';
  return `
    <article class="quest-card ${status} ${quest.type}">
      <div class="quest-meta"><h3>${escapeHtml(quest.title)}</h3><span class="pill">${escapeHtml(quest.type)}</span></div>
      <small>${quest.xpReward} XP reward · ${quest.progressCount}/${quest.targetCount}${linked}${dueDate}</small>
      <button class="secondary" data-quest-id="${quest.id}" ${quest.status === 'complete' ? 'disabled' : ''}>${quest.status === 'complete' ? 'Complete' : 'Complete Quest'}</button>
    </article>
  `;
}

function renderQuestList(selector, quests, emptyText) {
  $(selector).innerHTML = quests.length ? quests.map(questCard).join('') : `<p class="empty-state">${emptyText}</p>`;
}

function renderQuests(quests) {
  renderQuestList('#mainQuestList', quests.filter((quest) => quest.type === 'main'), 'No main quests yet. Create a larger goal worth a bigger XP payout.');
  renderQuestList('#sideQuestList', quests.filter((quest) => quest.type === 'side'), 'No side quests yet. Add a quick mission for today or this week.');
  renderQuestList('#challengeList', quests.filter((quest) => !['main', 'side'].includes(quest.type)), 'Daily and weekly challenges will appear after startup.');

  document.querySelectorAll('button[data-quest-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        const result = await api(`/api/profiles/${state.profileId}/quests/${button.dataset.questId}/complete`, { method: 'POST' });
        state.summary = result;
        render();
        handleActionResult(result.actionResult, 'Quest completed. XP added to progression.');
      } catch (error) {
        toast(error.message);
      }
    });
  });
}

function formatActivityChange(item) {
  const attrs = item.updates.attributes || {};
  const entries = Object.entries(attrs).slice(0, 4).map(([name, value]) => {
    if (value && typeof value === 'object') return `${name} ${value.previous} to ${value.next}`;
    return `${name} ${value}`;
  });
  const practice = (item.updates.skillPractice || []).slice(0, 3).map((skill) => `Practiced ${skill.name || skill}`);
  return [...entries, ...practice].join(' · ');
}

function renderTrends(trends) {
  $('#weeklySummary').textContent = `${trends.weekly.activeDays} active days · ${trends.weekly.averageXp} avg XP`;
  if (!trends.recent.length) {
    $('#trendBars').innerHTML = '<p class="empty-state">No check-ins yet. Submit your first one to start daily and weekly trends.</p>';
    $('#activityList').innerHTML = '<p class="empty-state">Recent activity will appear here after your first check-in.</p>';
    return;
  }
  const maxXp = Math.max(100, ...trends.recent.map((item) => item.xpGained));
  $('#trendBars').innerHTML = trends.recent.slice().reverse().map((item) => `
    <div class="trend-item">
      <header><small>${item.date}</small><strong>${item.xpGained} XP</strong></header>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round((item.xpGained / maxXp) * 100)}%"></div></div>
    </div>
  `).join('');
  $('#activityList').innerHTML = trends.recent.map((item) => `
    <article class="activity-card">
      <header><strong>${item.date}</strong><span class="pill">${item.xpGained} XP</span></header>
      <p>${escapeHtml(formatActivityChange(item) || 'Check-in logged')}</p>
      ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ''}
    </article>
  `).join('');
}

function collectAttributeDeltas() {
  const values = {};
  document.querySelectorAll('.delta-card').forEach((card) => {
    values[card.dataset.name] = Number(card.querySelector('select').value);
  });
  return values;
}

function collectSkillPractice() {
  return [...document.querySelectorAll('#checkinSkills input[type="checkbox"]:checked')].map((input) => input.value);
}

function handleActionResult(actionResult, fallbackMessage) {
  if (!actionResult) {
    toast(fallbackMessage);
    return;
  }
  if (actionResult.leveledUp) {
    showLevelOverlay(actionResult.oldLevel, actionResult.newLevel, actionResult.xpEarned);
  } else {
    toast(`${fallbackMessage} +${actionResult.xpEarned || 0} XP.`);
  }
}

function showLevelOverlay(oldLevel, newLevel, xpEarned) {
  $('#levelOverlayTitle').textContent = `Level ${oldLevel} to Level ${newLevel}`;
  $('#levelOverlayXp').textContent = `+${xpEarned} XP earned`;
  $('#levelOverlay').classList.add('show');
  $('#levelOverlay').setAttribute('aria-hidden', 'false');
}

function hideLevelOverlay() {
  $('#levelOverlay').classList.remove('show');
  $('#levelOverlay').setAttribute('aria-hidden', 'true');
}

function setActiveMobileSection(sectionId) {
  state.activeMobileSection = sectionId;
  updateMobileSections();
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateMobileSections() {
  const mobile = window.matchMedia('(max-width: 719px)').matches;
  document.querySelectorAll('.mobile-section').forEach((section) => {
    section.classList.toggle('active', !mobile || section.id === state.activeMobileSection);
  });
  document.querySelectorAll('.mobile-nav button').forEach((button) => {
    button.classList.toggle('active', button.dataset.target === state.activeMobileSection);
  });
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
      const profile = await api('/api/profiles', { method: 'POST', body: JSON.stringify({ name }) });
      $('#profileName').value = '';
      const profiles = await api('/api/profiles');
      setProfiles(profiles);
      state.profileId = profile.id;
      $('#profileSelect').value = profile.id;
      await loadSummary();
      setActiveMobileSection('section-overview');
      toast('Profile created with all core attributes at 0.');
    } catch (error) {
      toast(error.message);
    }
  });

  $('#skillForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api(`/api/profiles/${state.profileId}/skills`, {
        method: 'POST',
        body: JSON.stringify({ name: $('#skillName').value, rating: $('#skillRating').value })
      });
      $('#skillName').value = '';
      $('#skillRating').value = 1;
      await loadSummary();
      toast('Skill added.');
    } catch (error) {
      toast(error.message);
    }
  });

  $('#questType').addEventListener('change', (event) => {
    $('#questReward').value = event.target.value === 'main' ? XP_RULES.mainQuest : XP_RULES.sideQuest;
  });

  $('#questForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await api(`/api/profiles/${state.profileId}/quests`, {
        method: 'POST',
        body: JSON.stringify({
          title: $('#questTitle').value,
          type: $('#questType').value,
          linkedAttribute: $('#questAttribute').value,
          xpReward: $('#questReward').value,
          targetCount: $('#questTarget').value,
          dueDate: $('#questDueDate').value
        })
      });
      $('#questTitle').value = '';
      $('#questTarget').value = 1;
      $('#questDueDate').value = '';
      await loadSummary();
      toast('Quest created.');
    } catch (error) {
      toast(error.message);
    }
  });

  $('#checkinForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const result = await api(`/api/profiles/${state.profileId}/checkins`, {
        method: 'POST',
        body: JSON.stringify({
          date: $('#checkinDate').value || today(),
          notes: $('#notes').value,
          updates: {
            attributeDeltas: collectAttributeDeltas(),
            skillPractice: collectSkillPractice(),
            signals: {
              sleepHours: $('#sleepHours').value,
              learningMinutes: $('#learningMinutes').value,
              fitnessActivity: $('#fitnessActivity').checked,
              noSpend: $('#noSpend').checked
            }
          }
        })
      });
      state.summary = result;
      $('#notes').value = '';
      $('#fitnessActivity').checked = false;
      $('#noSpend').checked = false;
      render();
      handleActionResult(result.actionResult, 'Check-in saved. XP calculated automatically.');
    } catch (error) {
      toast(error.message);
    }
  });

  $('.mobile-nav').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-target]');
    if (button) setActiveMobileSection(button.dataset.target);
  });
  $('#closeLevelOverlay').addEventListener('click', hideLevelOverlay);
  $('#levelOverlay').addEventListener('click', (event) => {
    if (event.target.id === 'levelOverlay') hideLevelOverlay();
  });
  window.addEventListener('resize', updateMobileSections);
}

function initQuestAttributeOptions() {
  $('#questAttribute').innerHTML = '<option value="">No linked attribute</option>'
    + CORE_ATTRIBUTES.map((name) => `<option value="${name}">${name}</option>`).join('');
}

initQuestAttributeOptions();
bindEvents();
loadProfiles().catch((error) => toast(error.message));
