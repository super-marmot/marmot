# Distribution ledger

Marmot's primary product target is **200,000 installs**. GitHub activity is a
separate open-source health signal, not a substitute for store installs.

## Metrics that must stay separate

| Metric | What it means | Canonical source |
| --- | --- | --- |
| Installs | Store/device installs of a released app | Google Play Console and App Store Connect after store launch |
| GitHub stars | People who bookmarked the repository | GitHub repository API |
| GitHub clones | Repository clone events in GitHub's rolling traffic window | GitHub traffic API |
| GitHub forks | Public repository forks | GitHub repository API |
| Contributors | Accounts with accepted commits shown by GitHub | GitHub contributors API |
| APK downloads | Sideload artifact downloads, not installs | GitHub release asset API |

Do not add APK downloads to store installs, use stars as a user count, or use a
clone as proof that the app was built or installed.

## Baseline observed 2026-07-22

The canonical repository is [`stancsz/marmot`](https://github.com/stancsz/marmot)
and its default branch is `main`.

- Stars: **0**
- Forks: **0**
- Contributors: **0**
- GitHub clones: **187** events / **59** unique cloners in GitHub's current
  rolling traffic window
- Store installs: **not yet measurable**; Play Console and App Store Connect
  submissions are still credential-gated

This baseline is intentionally dated. Refresh it before publishing a growth
update; traffic and store dashboards are time-windowed and change over time.

## Reproducible snapshot commands

Run these with authenticated `gh` access to the canonical repository:

```powershell
gh api repos/stancsz/marmot --jq '{stars: .stargazers_count, forks: .forks_count, issues: .open_issues_count, discussions: .has_discussions}'
gh api repos/stancsz/marmot/contributors --jq 'length'
gh api repos/stancsz/marmot/traffic/clones --jq '{clones: .count, unique_cloners: .uniques}'
gh release list --repo stancsz/marmot --limit 20
```

Record the date, the rolling window returned by GitHub, and the command output
in a release note or weekly growth note. Store installs should be copied from
the store dashboards with the same date boundary and split by Android and iOS.

## Growth loop to measure

1. A shared result card carries an optional `Processed privately by Marmot`
   attribution, the stable install link, and the canonical GitHub link.
2. The recipient installs from the store or the stable sideload URL.
3. A real before/after example makes the share-to-action outcome legible.
4. Contributors discover a five-minute build path, a reproducible benchmark,
   or a good-first-issue task.

The [sanitized examples](EXAMPLES.md),
[five-minute contributor guide](../CONTRIBUTING.md), and
[benchmark submission path](BENCHMARKS.md#how-contributors-submit-results) are
the current public proof assets. The store runbook remains the source of truth
for production signing and submission credentials.
