# Proposed notification architecture

> **Status: proposal. Nothing in this document is active.** No workflow in this repository sends notifications, no consumer listens for them, no token exists, and no deployment is triggered. The YAML below is conceptual and lives only in this document; it is not under `.github/workflows/`. The only active workflow is [`validate.yml`](../../.github/workflows/validate.yml), which validates and checks generated files.

## Goal

When the ecosystem configuration or its shared assets change on `main`, tell the consumers that depend on them so they can rebuild and redeploy with the new data, without anyone remembering to do it by hand and without redeploying consumers when nothing relevant changed.

Consumers already sync at build time ([integration guide](integration.md#2-build-time-synchronization)), so a new build is all a consumer needs. The notification only triggers that build.

```text
push to main (config-ecosystem)
        │  validate + generated files up to date   (existing validate.yml)
        ▼
publisher job: decide what changed, read .github/consumers.json
        │  repository_dispatch  event_type: ecosystem-updated
        ▼
consumer repo workflow: sync → validate → build → deploy
```

## Event contract (proposed)

**`event_type`: `ecosystem-updated`**

```json
{
  "schemaVersion": 1,
  "source": "config-ecosystem",
  "ref": "main",
  "commit": "<commit-sha>",
  "changes": {
    "config": true,
    "assets": true
  }
}
```

This is a proposed automation event contract, not an existing workflow. It is sent as the `client_payload` of a `repository_dispatch` event.

| Field | Meaning |
| --- | --- |
| `schemaVersion` | Version of this event payload (not the config `version`). Consumers ignore events with a version they don't understand. |
| `source` | Always `"config-ecosystem"`. |
| `ref` | The branch that was published. Only `main` is ever published. |
| `commit` | Full 40-character SHA of the published commit. |
| `changes.config` | `true` if `config/production.json` or `dist/ecosystem.json` changed in this push. |
| `changes.assets` | `true` if anything under `assets/` changed in this push. |

Design rules:

* **Small.** The payload carries identifiers and two flags, never the configuration itself. Consumers fetch the config through their normal sync, which keeps one transport and one validation path. (GitHub also limits `client_payload` to 10 top-level properties and about 64 KB.)
* **A hint, not a source of truth.** A consumer must still fetch and validate the config. The payload only says that it's worth doing so.
* **Treat it as untrusted input.** Never interpolate payload values into shell commands. If `commit` is used, check that it matches `^[0-9a-f]{40}$` first.
* **Additive.** New optional flags can be added under `changes` without bumping `schemaVersion`; consumers ignore flags they don't know.

## Publishing repository responsibilities (`config-ecosystem`)

1. Run only after the push to `main` has **validated successfully** (`pnpm build`, `pnpm validate`, generated files up to date). Never publish a config that failed validation.
2. Skip entirely when nothing consumers depend on changed. Path filters: `config/**`, `dist/**`, `assets/**`. Documentation-only pushes (`docs/**`, `README.md`, `.github/**`, `schema/**`, `scripts/**`) don't notify.
3. Compute `changes.config` and `changes.assets` by diffing the pushed range (`before..after`).
4. Read `.github/consumers.json` and notify **only** entries with `"notify": true`. Disabled and unverified consumers never receive events.
5. Send one `repository_dispatch` per consumer. A failed dispatch to one consumer must not block the others, and must **not** make the config validation fail: report it as a separate failed step or job.
6. Never include secrets or configuration content in the payload.

### Authentication and permissions

`repository_dispatch` targets another repository, and the built-in `GITHUB_TOKEN` is scoped to the repository running the workflow, so it **cannot** do this. A separate credential is needed:

* **Preferred: a GitHub App** installed only on the consumer repositories, with the single repository permission **Contents: Read and write** (the permission GitHub requires to create a dispatch event). Mint a short-lived installation token in the job.
* **Alternative: a fine-grained personal access token** limited to the consumer repositories, with only **Contents: Read and write**. It expires and is tied to a person, so an App is preferable.
* Store it as a repository secret in `config-ecosystem` (the example uses the placeholder name `ECOSYSTEM_DISPATCH_TOKEN`). **No secret exists today.**
* The workflow's own `GITHUB_TOKEN` stays at `permissions: contents: read`.
* Don't use a broad classic token (`repo` scope) and don't reuse a deploy credential for dispatching.

## Receiving consumer responsibilities

Each consumer repository needs its own workflow. Only after the [compatibility checklist](README.md#compatibility-checklist) is satisfied and its registry entry is switched on:

1. **Trigger** on `repository_dispatch` with `types: [ecosystem-updated]`. Also allow `workflow_dispatch` (manual re-run) and the consumer's normal `push`. Note that `repository_dispatch` workflows run from the consumer's **default branch**.
2. **Check the payload**: `schemaVersion` is `1`, `source` is `config-ecosystem`, `ref` is `main`; otherwise exit without deploying. Use `changes` to skip when nothing relevant changed (for example, `changes.assets` only matters to a consumer that uses assets).
3. **Sync, validate, build**: run the consumer's existing sync, tests and build with a frozen lockfile. The sync fetches `main`; a consumer that wants an exact version can fetch at the payload's `commit` instead, after validating the SHA format.
4. **Deploy only if the build succeeded**, using the consumer's existing deployment mechanism. The deploy step needs the consumer's own deploy credentials, which are separate from the dispatch token and are not described here.
5. Use least privilege: `permissions: contents: read` unless a step genuinely needs more.

### Failure handling

* **Publisher:** a failed dispatch is a visible failed job, and re-running that job is safe (events are idempotent: a duplicate only causes one more build). Config validation results are unaffected.
* **Consumer sync or build fails:** the workflow fails and **does not deploy**, so the last working deployment keeps serving. Never add a "continue on error" or a fallback to cached or hardcoded data to make the build green.
* **Consumer deploy fails:** treat it like a build failure; rely on the host's atomic deploys so a half-finished deploy can't replace the live one.
* **Missed or failed events:** nothing is lost permanently. The next build of the consumer syncs the latest `main`, and a manual `workflow_dispatch` re-runs it.
* Failures should be visible (a failed workflow run, with notifications to the repository owner), not silent.

### Preventing unnecessary redeployments

* **Publisher path filters** so documentation, schema, script and workflow changes never notify.
* **Registry gating**: only `"notify": true` consumers receive events.
* **`changes` flags**: a consumer that ignores assets skips asset-only events.
* **Content comparison in the consumer**: after syncing, compare a hash of the data the consumer actually uses (for example, its generated ecosystem file plus any copied assets) with the hash of the last deployed build, and skip the deploy when they match. A change to an unrelated project then costs a cheap sync and no deployment.
* **Concurrency**: group runs per consumer so a burst of pushes produces one deployment with the newest data. Don't cancel a deploy that is already running; let it finish and keep only the latest queued run.

## Conceptual workflows (INACTIVE)

> The two files below are **illustrations only**. They are not installed anywhere, they reference a secret that does not exist, and they must not be copied into `.github/workflows/` until the checklist is met and the consumers are updated.

### Publisher: `config-ecosystem` (illustrative)

```yaml
# INACTIVE EXAMPLE - not present in .github/workflows/
name: Notify consumers
on:
  workflow_run:
    workflows: [Validate]      # run only after validation succeeded
    types: [completed]
    branches: [main]

permissions:
  contents: read

jobs:
  notify:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
        with:
          ref: ${{ github.event.workflow_run.head_sha }}
          fetch-depth: 2
      - name: Decide what changed
        id: changes
        run: |
          # Simplified: compares with the previous commit only. A real implementation must
          # diff the whole pushed range (the push event's "before" SHA) when a push has several commits.
          before=$(git rev-parse HEAD~1)
          config=false; assets=false
          git diff --quiet "$before" HEAD -- config dist || config=true
          git diff --quiet "$before" HEAD -- assets      || assets=true
          echo "config=$config" >> "$GITHUB_OUTPUT"
          echo "assets=$assets" >> "$GITHUB_OUTPUT"
      - name: Dispatch to enabled consumers
        if: steps.changes.outputs.config == 'true' || steps.changes.outputs.assets == 'true'
        env:
          GH_TOKEN: ${{ secrets.ECOSYSTEM_DISPATCH_TOKEN }}   # placeholder; no such secret exists
          OWNER: ${{ github.repository_owner }}
          SHA: ${{ github.event.workflow_run.head_sha }}
          CONFIG: ${{ steps.changes.outputs.config }}
          ASSETS: ${{ steps.changes.outputs.assets }}
        run: |
          jq -r '.consumers[] | select(.notify == true) | .repository' .github/consumers.json |
          while read -r repo; do
            gh api "repos/$OWNER/$repo/dispatches" --method POST --input - <<EOF || echo "::error::dispatch to $repo failed"
          {"event_type":"ecosystem-updated","client_payload":{"schemaVersion":1,"source":"config-ecosystem","ref":"main","commit":"$SHA","changes":{"config":$CONFIG,"assets":$ASSETS}}}
          EOF
          done
```

Because every consumer has `"notify": false` today, even this workflow would send nothing.

### Consumer (illustrative)

```yaml
# INACTIVE EXAMPLE - for a consumer repository, not installed
name: Ecosystem update
on:
  repository_dispatch:
    types: [ecosystem-updated]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: ecosystem-update
  cancel-in-progress: false      # let a running deploy finish; keep only the newest queued run

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Check event
        if: github.event_name == 'repository_dispatch'
        env:
          SCHEMA: ${{ github.event.client_payload.schemaVersion }}
          SOURCE: ${{ github.event.client_payload.source }}
          REF_: ${{ github.event.client_payload.ref }}
        run: |
          [ "$SCHEMA" = "1" ] && [ "$SOURCE" = "config-ecosystem" ] && [ "$REF_" = "main" ] || { echo "Unexpected event, skipping"; exit 1; }
      - uses: actions/checkout@v5
      # install dependencies with the lockfile, then:
      - run: <consumer sync + tests + build>     # fails the job on any sync or validation error
      - name: Skip when nothing the app uses changed
        run: <compare hash of generated ecosystem data and copied assets with the last deployed hash>
      - run: <consumer's own deploy step>        # uses the consumer's own credentials; runs only if all above passed
```

Replace the placeholders with the consumer's real commands. Deploy credentials belong to the consumer and are intentionally not specified here.

## Enabling a consumer (future checklist)

1. The consumer satisfies every item of the [compatibility checklist](README.md#compatibility-checklist) (the Gateway must be updated for `deployment.url` first; `web-cv` must be verified).
2. The dispatch credential exists with the minimum permission described above.
3. The consumer workflow exists on its default branch and has been run manually (`workflow_dispatch`) successfully.
4. Only then set `"notify": true` for that consumer in `.github/consumers.json`, and add the publisher workflow.
