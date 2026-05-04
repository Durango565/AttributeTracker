# AttributeTracker2K

AttributeTracker2K is a local-first, web-based NBA 2K-inspired personal attribute tracker. It tracks life attributes, custom skills, daily check-ins, XP, levels, streaks, badges, archetypes, main quests, side quests, daily challenges, weekly challenges, and recent trends with CSV persistence.

## Run Locally

```bash
npm install
npm start
```

Open `http://localhost:3000`.

The server binds to `0.0.0.0` and uses `process.env.PORT || 3000`.

## GitHub Codespaces

1. Open the repo in Codespaces.
2. Run:

```bash
npm install
npm start
```

3. Open the forwarded port notification for port `3000`, or use the **Ports** tab and click the browser icon next to port `3000`.

The included `.devcontainer/devcontainer.json` forwards port `3000` and installs dependencies after container creation.

## Progression Rules

Fresh user-created profiles start with all core attributes at `0`. The seeded demo profile keeps populated ratings so the dashboard looks useful on first load.

Core attributes are:

- Fitness
- Focus
- Discipline
- Creativity
- Social
- Finance
- Sleep
- Learning

Daily check-ins no longer accept arbitrary XP. XP is calculated automatically:

- Daily check-in submitted: `+25 XP`
- Attribute increase: `+10 XP` per total applied attribute point
- Skill practice logged: `+15 XP` per practiced skill
- Side quest completed: default `+40 XP`
- Main quest completed: default `+100 XP`
- 7-day streak bonus: `+150 XP`

Level formula:

```text
Level = floor(sqrt(total XP / 125)) + 1
```

The check-in form uses controlled daily attribute deltas instead of direct stat setting. Each core attribute can change by `0`, `+1`, `+2`, `+3`, or `-1`, and ratings are clamped between `0` and `99`.

## Quest System

The Quests tab supports:

- Main quests: larger user-created goals with larger XP rewards
- Side quests: smaller user-created goals with smaller XP rewards
- Daily and weekly system challenges: generated locally and persisted in CSV

User-created quests include title, type, linked attribute, XP reward, target count, optional due date, and active/completed status. Completing a quest persists the completed state and automatically contributes its XP to progression.

## Mobile Navigation

On mobile widths, the app switches to a fixed bottom navigation with five tabs:

- Overview
- Attributes
- Check-In
- Quests
- Progress

Desktop remains a full dashboard layout.

## CSV Storage

CSV files are created automatically on startup under `data/`:

- `data/profiles.csv`
- `data/attributes.csv`
- `data/skills.csv`
- `data/checkins.csv`
- `data/quests.csv`

`data/quests.csv` uses a simple migration-tolerant schema with quest metadata such as type, reward, status, due date, target count, progress count, linked attribute, and source. Existing older quest rows are read with defaults where fields are missing.

If the CSV files are empty, the app seeds a demo profile and populated sample data.

## Demo Features

- Mock profile selector and no-password local profile creation
- New profiles start at zero across all core attributes
- Core 0-99 attribute meters with controlled daily gains
- Custom profile-specific skills on a 1-99 scale
- Daily check-ins with duplicate same-day protection
- Automatic XP calculation with transparent formula
- XP, levels, progress to next level, current streak, and best streak
- CSS-only level-up overlay when an action crosses a level boundary
- Archetype calculation with visible demo cap boosts
- Badge unlocks from attributes, XP, streaks, and check-in totals
- User-created main quests and side quests
- Daily quests and weekly challenges with CSV-backed completion state
- Recent activity and weekly trend summaries
- Responsive dark sports-game dashboard UI with mobile bottom nav

## API Routes

- `GET /api/health`
- `GET /api/profiles`
- `POST /api/profiles`
- `GET /api/summary?profileId=...`
- `GET /api/profiles/:profileId/summary`
- `GET /api/profiles/:profileId/attributes`
- `GET /api/profiles/:profileId/skills`
- `POST /api/profiles/:profileId/skills`
- `GET /api/profiles/:profileId/checkins`
- `POST /api/profiles/:profileId/checkins`
- `GET /api/profiles/:profileId/quests`
- `POST /api/profiles/:profileId/quests`
- `POST /api/profiles/:profileId/quests/:questId/complete`

## Known Limitations

- Mock accounts are intentionally local-only and passwordless.
- CSV writes are simple whole-file writes intended for a single-user demo.
- Check-ins are append-only in the UI; editing or deleting historical rows is a future improvement.
- Quest target counts are stored, but the current UI completes quests with a single completion action.
- Attribute caps are displayed as demo archetype effects and do not currently constrain ratings below 99.
