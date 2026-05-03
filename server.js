const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const DATA_DIR = path.join(__dirname, 'data');

const FILES = {
  profiles: {
    path: path.join(DATA_DIR, 'profiles.csv'),
    headers: ['id', 'name', 'createdAt']
  },
  attributes: {
    path: path.join(DATA_DIR, 'attributes.csv'),
    headers: ['id', 'profileId', 'name', 'rating', 'cap', 'isCore', 'updatedAt']
  },
  skills: {
    path: path.join(DATA_DIR, 'skills.csv'),
    headers: ['id', 'profileId', 'name', 'rating', 'cap', 'createdAt', 'updatedAt']
  },
  checkins: {
    path: path.join(DATA_DIR, 'checkins.csv'),
    headers: ['id', 'profileId', 'date', 'updates', 'notes', 'xpGained', 'createdAt']
  },
  quests: {
    path: path.join(DATA_DIR, 'quests.csv'),
    headers: ['id', 'profileId', 'key', 'title', 'type', 'xpReward', 'status', 'date', 'completedAt', 'createdAt']
  }
};

const CORE_ATTRIBUTES = ['Fitness', 'Focus', 'Discipline', 'Creativity', 'Social', 'Finance', 'Sleep', 'Learning'];

const QUEST_TEMPLATES = [
  { key: 'daily-checkin', title: 'Complete a daily check-in', type: 'daily', xpReward: 60 },
  { key: 'sleep-7', title: 'Log 7+ hours of sleep', type: 'daily', xpReward: 35 },
  { key: 'learn-30', title: 'Study or learn for 30 minutes', type: 'daily', xpReward: 40 },
  { key: 'fitness-activity', title: 'Complete a fitness activity', type: 'daily', xpReward: 40 },
  { key: 'no-spend', title: 'No-spend day', type: 'daily', xpReward: 30 },
  { key: 'three-checkins', title: 'Complete 3 check-ins this week', type: 'weekly', xpReward: 120 },
  { key: 'balanced-build', title: 'Raise three attributes to 70+', type: 'weekly', xpReward: 150 }
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function weekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(value);
      value = '';
    } else if (char === '\n') {
      row.push(value);
      rows.push(row);
      row = [];
      value = '';
    } else if (char !== '\r') {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cell) => cell !== ''));
}

function escapeCsv(value) {
  const str = value === undefined || value === null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function readTable(name) {
  const file = FILES[name];
  if (!fs.existsSync(file.path)) return [];
  const rows = parseCsv(fs.readFileSync(file.path, 'utf8'));
  if (rows.length <= 1) return [];
  const headers = rows[0];
  return rows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = cells[index] || '';
    });
    return record;
  });
}

function writeTable(name, rows) {
  const file = FILES[name];
  const lines = [
    file.headers.join(','),
    ...rows.map((row) => file.headers.map((header) => escapeCsv(row[header])).join(','))
  ];
  fs.writeFileSync(file.path, `${lines.join('\n')}\n`);
}

function numberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampRating(value) {
  return Math.max(1, Math.min(99, Math.round(numberValue(value, 50))));
}

function parseUpdates(row) {
  try {
    return row.updates ? JSON.parse(row.updates) : {};
  } catch {
    return {};
  }
}

function seedIfEmpty() {
  ensureDir();
  Object.values(FILES).forEach((file) => {
    if (!fs.existsSync(file.path)) {
      fs.writeFileSync(file.path, `${file.headers.join(',')}\n`);
    }
  });

  const profiles = readTable('profiles');
  if (profiles.length) return;

  const now = new Date().toISOString();
  const profileId = 'profile_demo';
  const demoProfile = { id: profileId, name: 'Demo MyPLAYER', createdAt: now };
  const ratings = {
    Fitness: 74,
    Focus: 82,
    Discipline: 78,
    Creativity: 76,
    Social: 64,
    Finance: 69,
    Sleep: 71,
    Learning: 84
  };

  writeTable('profiles', [demoProfile]);
  writeTable('attributes', CORE_ATTRIBUTES.map((name, index) => ({
    id: `attr_demo_${index + 1}`,
    profileId,
    name,
    rating: ratings[name],
    cap: 99,
    isCore: 'true',
    updatedAt: now
  })));
  writeTable('skills', [
    { id: 'skill_demo_1', profileId, name: 'Meal Prep', rating: 67, cap: 99, createdAt: now, updatedAt: now },
    { id: 'skill_demo_2', profileId, name: 'Shooting Form', rating: 73, cap: 99, createdAt: now, updatedAt: now },
    { id: 'skill_demo_3', profileId, name: 'Public Speaking', rating: 61, cap: 99, createdAt: now, updatedAt: now }
  ]);

  const checkins = [];
  const samples = [
    { daysAgo: 8, xp: 70, notes: 'Reset the plan and walked after work.', Fitness: 70, Focus: 76, Sleep: 68 },
    { daysAgo: 6, xp: 85, notes: 'Long study block and clean budget review.', Focus: 78, Finance: 66, Learning: 80 },
    { daysAgo: 5, xp: 60, notes: 'Gym session, lighter screen time.', Fitness: 72, Discipline: 74 },
    { daysAgo: 3, xp: 95, notes: 'Deep work sprint with sketching practice.', Focus: 80, Creativity: 75, Learning: 82 },
    { daysAgo: 2, xp: 75, notes: 'Good sleep and no-spend day.', Sleep: 71, Finance: 69 },
    { daysAgo: 1, xp: 90, notes: 'Workout, reading, and inbox cleanup.', Fitness: 74, Discipline: 78, Learning: 84 }
  ];

  samples.forEach((sample, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - sample.daysAgo);
    const updates = { attributes: {}, skills: {}, signals: {} };
    CORE_ATTRIBUTES.forEach((name) => {
      if (sample[name]) updates.attributes[name] = sample[name];
    });
    checkins.push({
      id: `checkin_demo_${index + 1}`,
      profileId,
      date: date.toISOString().slice(0, 10),
      updates: JSON.stringify(updates),
      notes: sample.notes,
      xpGained: sample.xp,
      createdAt: now
    });
  });
  writeTable('checkins', checkins);
  writeTable('quests', []);
  ensureQuestsForProfile(profileId);
}

function ensureCoreAttributes(profileId) {
  const attributes = readTable('attributes');
  let changed = false;
  CORE_ATTRIBUTES.forEach((name) => {
    const existing = attributes.find((attr) => attr.profileId === profileId && attr.name === name);
    if (!existing) {
      attributes.push({
        id: makeId('attr'),
        profileId,
        name,
        rating: 50,
        cap: 99,
        isCore: 'true',
        updatedAt: new Date().toISOString()
      });
      changed = true;
    }
  });
  if (changed) writeTable('attributes', attributes);
}

function ensureQuestsForProfile(profileId) {
  const quests = readTable('quests');
  const today = todayISO();
  const currentWeek = weekKey(new Date());
  let changed = false;

  QUEST_TEMPLATES.forEach((template) => {
    const date = template.type === 'daily' ? today : currentWeek;
    const existing = quests.find((quest) => quest.profileId === profileId && quest.key === template.key && quest.date === date);
    if (!existing) {
      quests.push({
        id: makeId('quest'),
        profileId,
        key: template.key,
        title: template.title,
        type: template.type,
        xpReward: template.xpReward,
        status: 'open',
        date,
        completedAt: '',
        createdAt: new Date().toISOString()
      });
      changed = true;
    }
  });

  if (changed) writeTable('quests', quests);
}

function getProfileData(profileId) {
  ensureCoreAttributes(profileId);
  ensureQuestsForProfile(profileId);
  return {
    profile: readTable('profiles').find((profile) => profile.id === profileId),
    attributes: readTable('attributes').filter((attr) => attr.profileId === profileId),
    skills: readTable('skills').filter((skill) => skill.profileId === profileId),
    checkins: readTable('checkins').filter((checkin) => checkin.profileId === profileId),
    quests: readTable('quests').filter((quest) => quest.profileId === profileId)
  };
}

function completeQuest(profileId, key, dateOrWeek) {
  const quests = readTable('quests');
  const quest = quests.find((item) => item.profileId === profileId && item.key === key && item.date === dateOrWeek);
  if (!quest || quest.status === 'complete') return 0;
  quest.status = 'complete';
  quest.completedAt = new Date().toISOString();
  writeTable('quests', quests);
  return numberValue(quest.xpReward);
}

function computeStreaks(checkins) {
  const dates = [...new Set(checkins.map((checkin) => checkin.date))].sort();
  if (!dates.length) return { current: 0, best: 0 };

  let best = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i += 1) {
    const previous = new Date(`${dates[i - 1]}T00:00:00Z`);
    const current = new Date(`${dates[i]}T00:00:00Z`);
    const diff = Math.round((current - previous) / 86400000);
    if (diff === 1) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
  }

  const today = new Date(`${todayISO()}T00:00:00Z`);
  const latest = new Date(`${dates[dates.length - 1]}T00:00:00Z`);
  const latestDiff = Math.round((today - latest) / 86400000);
  let current = latestDiff <= 1 ? run : 0;
  return { current, best };
}

function xpStats(checkins, quests) {
  const checkinXp = checkins.reduce((sum, checkin) => sum + numberValue(checkin.xpGained), 0);
  const questXp = quests
    .filter((quest) => quest.status === 'complete')
    .reduce((sum, quest) => sum + numberValue(quest.xpReward), 0);
  const totalXp = checkinXp + questXp;
  const level = Math.floor(Math.sqrt(totalXp / 125)) + 1;
  const currentLevelStart = Math.pow(level - 1, 2) * 125;
  const nextLevelXp = Math.pow(level, 2) * 125;
  const progress = Math.round(((totalXp - currentLevelStart) / (nextLevelXp - currentLevelStart)) * 100);
  return { totalXp, checkinXp, questXp, level, currentLevelStart, nextLevelXp, progress };
}

function archetypeFor(attributes) {
  const rating = (name) => numberValue((attributes.find((attr) => attr.name === name) || {}).rating, 0);
  const options = [
    {
      name: 'Sharpshooter',
      description: 'Elite focus, learning pace, and creative shot creation.',
      score: rating('Focus') + rating('Learning') + rating('Creativity'),
      boosts: ['Focus cap +2', 'Learning cap +2', 'Creativity cap +1']
    },
    {
      name: 'Lockdown Grinder',
      description: 'Discipline and fitness drive a two-way daily build.',
      score: rating('Discipline') + rating('Fitness') + rating('Focus') * 0.35,
      boosts: ['Discipline cap +2', 'Fitness cap +2']
    },
    {
      name: 'Floor General',
      description: 'Social reads and focus keep the whole lineup organized.',
      score: rating('Social') + rating('Focus') + rating('Discipline') * 0.25,
      boosts: ['Social cap +2', 'Focus cap +1']
    },
    {
      name: 'Mogul',
      description: 'Finance habits and discipline turn plans into leverage.',
      score: rating('Finance') + rating('Discipline') + rating('Learning') * 0.25,
      boosts: ['Finance cap +3', 'Discipline cap +1']
    },
    {
      name: 'Recovery Specialist',
      description: 'Sleep and fitness create the recovery engine.',
      score: rating('Sleep') + rating('Fitness') + rating('Discipline') * 0.25,
      boosts: ['Sleep cap +3', 'Fitness cap +1']
    }
  ];
  return options.sort((a, b) => b.score - a.score)[0];
}

function badgeSummary(attributes, checkins, xp, streaks) {
  const rating = (name) => numberValue((attributes.find((attr) => attr.name === name) || {}).rating, 0);
  const badgeRules = [
    { name: 'Gym Rat', metric: rating('Fitness'), target: 75, detail: 'Fitness 75+' },
    { name: 'Deep Work', metric: rating('Focus'), target: 80, detail: 'Focus 80+' },
    { name: 'Budget Hawk', metric: rating('Finance'), target: 70, detail: 'Finance 70+' },
    { name: 'Creative Spark', metric: rating('Creativity'), target: 75, detail: 'Creativity 75+' },
    { name: 'Social Glue', metric: rating('Social'), target: 70, detail: 'Social 70+' },
    { name: 'Sleep Specialist', metric: rating('Sleep'), target: 75, detail: 'Sleep 75+' },
    { name: 'Study Streak', metric: streaks.current, target: 3, detail: '3-day check-in streak' },
    { name: 'Rising Star', metric: xp.totalXp, target: 1000, detail: '1,000 total XP' },
    { name: 'Consistent Finisher', metric: checkins.length, target: 10, detail: '10 check-ins' }
  ];

  return badgeRules.map((badge) => ({
    ...badge,
    unlocked: badge.metric >= badge.target,
    progress: Math.min(100, Math.round((badge.metric / badge.target) * 100))
  }));
}

function trendsFor(checkins) {
  const sorted = [...checkins].sort((a, b) => b.date.localeCompare(a.date));
  const recent = sorted.slice(0, 8).map((checkin) => ({
    ...checkin,
    xpGained: numberValue(checkin.xpGained),
    updates: parseUpdates(checkin)
  }));
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
  const weekly = sorted.filter((checkin) => new Date(`${checkin.date}T00:00:00Z`) >= sevenDaysAgo);
  const weeklyXp = weekly.reduce((sum, checkin) => sum + numberValue(checkin.xpGained), 0);
  const activeDays = new Set(weekly.map((checkin) => checkin.date)).size;
  return {
    recent,
    weekly: {
      activeDays,
      checkins: weekly.length,
      xp: weeklyXp,
      averageXp: weekly.length ? Math.round(weeklyXp / weekly.length) : 0
    }
  };
}

function currentSummary(profileId) {
  const data = getProfileData(profileId);
  if (!data.profile) return null;
  const normalizedAttributes = data.attributes.map((attr) => ({
    ...attr,
    rating: numberValue(attr.rating),
    cap: numberValue(attr.cap, 99)
  }));
  const normalizedSkills = data.skills.map((skill) => ({
    ...skill,
    rating: numberValue(skill.rating),
    cap: numberValue(skill.cap, 99)
  }));
  const normalizedQuests = data.quests.map((quest) => ({
    ...quest,
    xpReward: numberValue(quest.xpReward)
  }));
  const streaks = computeStreaks(data.checkins);
  const xp = xpStats(data.checkins, data.quests);
  const archetype = archetypeFor(normalizedAttributes);
  return {
    profile: data.profile,
    attributes: normalizedAttributes,
    skills: normalizedSkills,
    quests: normalizedQuests.sort((a, b) => a.status.localeCompare(b.status) || a.type.localeCompare(b.type)),
    xp,
    streaks,
    archetype,
    badges: badgeSummary(normalizedAttributes, data.checkins, xp, streaks),
    trends: trendsFor(data.checkins),
    formula: 'Level = floor(sqrt(total XP / 125)) + 1. Daily check-ins and completed quests both add XP.'
  };
}

function requireProfile(req, res, next) {
  const profileId = req.params.profileId || req.query.profileId || req.body.profileId;
  const profile = readTable('profiles').find((item) => item.id === profileId);
  if (!profile) {
    res.status(404).json({ error: 'Profile not found.' });
    return;
  }
  req.profile = profile;
  next();
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, app: 'AttributeTracker2K', storage: 'csv', date: todayISO() });
});

app.get('/api/profiles', (req, res) => {
  res.json(readTable('profiles'));
});

app.post('/api/profiles', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) {
    res.status(400).json({ error: 'Profile name is required.' });
    return;
  }
  const profiles = readTable('profiles');
  const profile = { id: makeId('profile'), name, createdAt: new Date().toISOString() };
  profiles.push(profile);
  writeTable('profiles', profiles);
  ensureCoreAttributes(profile.id);
  ensureQuestsForProfile(profile.id);
  res.status(201).json(profile);
});

app.get('/api/summary', requireProfile, (req, res) => {
  res.json(currentSummary(req.profile.id));
});

app.get('/api/profiles/:profileId/summary', requireProfile, (req, res) => {
  res.json(currentSummary(req.profile.id));
});

app.get('/api/profiles/:profileId/attributes', requireProfile, (req, res) => {
  res.json(currentSummary(req.profile.id).attributes);
});

app.get('/api/profiles/:profileId/skills', requireProfile, (req, res) => {
  res.json(currentSummary(req.profile.id).skills);
});

app.post('/api/profiles/:profileId/skills', requireProfile, (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) {
    res.status(400).json({ error: 'Skill name is required.' });
    return;
  }
  const skills = readTable('skills');
  const exists = skills.some((skill) => skill.profileId === req.profile.id && skill.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    res.status(409).json({ error: 'That skill already exists for this profile.' });
    return;
  }
  const now = new Date().toISOString();
  const skill = {
    id: makeId('skill'),
    profileId: req.profile.id,
    name,
    rating: clampRating(req.body.rating || 50),
    cap: 99,
    createdAt: now,
    updatedAt: now
  };
  skills.push(skill);
  writeTable('skills', skills);
  res.status(201).json(skill);
});

app.get('/api/profiles/:profileId/checkins', requireProfile, (req, res) => {
  res.json(currentSummary(req.profile.id).trends.recent);
});

app.post('/api/profiles/:profileId/checkins', requireProfile, (req, res) => {
  const date = req.body.date || todayISO();
  const checkins = readTable('checkins');
  const duplicate = checkins.find((checkin) => checkin.profileId === req.profile.id && checkin.date === date);
  if (duplicate) {
    res.status(409).json({ error: `A check-in already exists for ${date}. Edit handling is intentionally explicit for the demo.` });
    return;
  }

  const updates = req.body.updates || {};
  const attributeUpdates = updates.attributes || {};
  const skillUpdates = updates.skills || {};
  const signals = updates.signals || {};
  const xpGained = Math.max(0, Math.min(500, Math.round(numberValue(req.body.xpGained, 50))));
  const now = new Date().toISOString();

  const attributes = readTable('attributes');
  attributes.forEach((attr) => {
    if (attr.profileId === req.profile.id && Object.prototype.hasOwnProperty.call(attributeUpdates, attr.name)) {
      attr.rating = clampRating(attributeUpdates[attr.name]);
      attr.updatedAt = now;
    }
  });
  writeTable('attributes', attributes);

  const skills = readTable('skills');
  skills.forEach((skill) => {
    if (skill.profileId === req.profile.id && Object.prototype.hasOwnProperty.call(skillUpdates, skill.name)) {
      skill.rating = clampRating(skillUpdates[skill.name]);
      skill.updatedAt = now;
    }
  });
  writeTable('skills', skills);

  checkins.push({
    id: makeId('checkin'),
    profileId: req.profile.id,
    date,
    updates: JSON.stringify({ attributes: attributeUpdates, skills: skillUpdates, signals }),
    notes: String(req.body.notes || '').slice(0, 600),
    xpGained,
    createdAt: now
  });
  writeTable('checkins', checkins);

  ensureQuestsForProfile(req.profile.id);
  completeQuest(req.profile.id, 'daily-checkin', date);
  if (numberValue(signals.sleepHours) >= 7) completeQuest(req.profile.id, 'sleep-7', date);
  if (numberValue(signals.learningMinutes) >= 30) completeQuest(req.profile.id, 'learn-30', date);
  if (signals.fitnessActivity) completeQuest(req.profile.id, 'fitness-activity', date);
  if (signals.noSpend) completeQuest(req.profile.id, 'no-spend', date);

  const profileCheckins = readTable('checkins').filter((checkin) => checkin.profileId === req.profile.id);
  const thisWeek = weekKey(new Date(`${date}T00:00:00Z`));
  const weekCheckins = profileCheckins.filter((checkin) => weekKey(new Date(`${checkin.date}T00:00:00Z`)) === thisWeek);
  if (weekCheckins.length >= 3) completeQuest(req.profile.id, 'three-checkins', thisWeek);

  const latestAttributes = readTable('attributes').filter((attr) => attr.profileId === req.profile.id);
  const highAttributes = latestAttributes.filter((attr) => numberValue(attr.rating) >= 70).length;
  if (highAttributes >= 3) completeQuest(req.profile.id, 'balanced-build', thisWeek);

  res.status(201).json(currentSummary(req.profile.id));
});

app.get('/api/profiles/:profileId/quests', requireProfile, (req, res) => {
  res.json(currentSummary(req.profile.id).quests);
});

app.post('/api/profiles/:profileId/quests/:questId/complete', requireProfile, (req, res) => {
  const quests = readTable('quests');
  const quest = quests.find((item) => item.id === req.params.questId && item.profileId === req.profile.id);
  if (!quest) {
    res.status(404).json({ error: 'Quest not found.' });
    return;
  }
  quest.status = 'complete';
  quest.completedAt = new Date().toISOString();
  writeTable('quests', quests);
  res.json(currentSummary(req.profile.id));
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

seedIfEmpty();

app.listen(PORT, HOST, () => {
  console.log(`AttributeTracker2K running at http://${HOST}:${PORT}`);
});
