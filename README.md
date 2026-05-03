# AttributeTracker2K

AttributeTracker2K is a local-first, web-based NBA 2K-inspired personal attribute tracker. It tracks life attributes, custom skills, daily check-ins, XP, levels, streaks, badges, archetypes, quests, and recent trends with CSV persistence.

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

## CSV Storage

CSV files are created automatically on startup under `data/`:

- `data/profiles.csv`
- `data/attributes.csv`
- `data/skills.csv`
- `data/checkins.csv`
- `data/quests.csv`

If the CSV files are empty, the app seeds a demo profile and populated sample data so the dashboard has useful content immediately.

## Demo Features

- Mock profile selector and no-password local profile creation
- Core 1-99 attributes: Fitness, Focus, Discipline, Creativity, Social, Finance, Sleep, Learning
- Custom profile-specific skills on the same 1-99 scale
- Daily check-ins with duplicate same-day protection
- XP, levels, progress to next level, current streak, and best streak
- Archetype calculation with visible demo cap boosts
- Badge unlocks from attributes, XP, streaks, and check-in totals
- Daily quests and weekly challenges with CSV-backed completion state
- Recent activity and weekly trend summaries
- Responsive dark sports-game dashboard UI

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
- `POST /api/profiles/:profileId/quests/:questId/complete`

## Known Limitations

- Mock accounts are intentionally local-only and passwordless.
- CSV writes are simple whole-file writes intended for a single-user demo.
- Check-ins are append-only in the UI; editing or deleting historical rows is a future improvement.
- Attribute caps are displayed as demo archetype effects and do not currently constrain ratings below 99.
