# Vion Learning

Vion Learning is a local/private AWS certification trainer with strict separation between the CLF-C02 AWS Certified Cloud Practitioner track and the AIF-C01 AWS Certified AI Practitioner track.

Only the landing page (`/`) shows both certifications. Every track experience is scoped under `/tracks/:trackId/*`, and all cards, domains, questions, progress records, sources, videos, study plans, and console guides carry `track_id`.

## Features implemented

- Landing page with track choice, readiness, next task, streak, milestone, weak domain count, and last source verification date.
- Track overview pages with official exam facts, domain weights, service/topic tags, weak areas, milestones, and mode entry points.
- Learning cards with prompt, short answer, detailed explanation, track/domain/service metadata, difficulty, source links, tags, know/review controls, and basic spaced repetition state.
- CLF-C02 concept records with scenario, exam angle, misconceptions, decision rules, service/concept mappings, and official source citations.
- CLF-C02 service/resource explanation corpus with beginner analogies, plain-English explanations, use cases, exam clue phrases, misconceptions, adjacent-service comparisons, source citations, verification dates, and weak-area mappings.
- Quiz engine modes: quick 10, domain 15-25, full 65 timed, weakness drill, and mixed review.
- Quick 10 quiz assembly that deliberately varies domain coverage, question type, difficulty, and answer position where the available pool allows it.
- Answer review with correct explanation, selected-option explanation, per-option distractor teaching, domain/topic/card/concept/source mapping, readiness update, next actions, and progress history.
- 7/14/30 day study plans per track.
- AWS Console guide structure with goal, prereqs, time, cost warning, path/steps, observe, exam relevance, cleanup, and related quiz IDs.
- Source ingestion/refresh metadata from `data/sources/*`, stale-warning limitations, and video resource metadata placeholders.
- Node HTTP API, `/health`, JSON structured logs, seed/reset/export commands, Dockerfile and docker-compose healthcheck.

## Original practice only

The seed practice and curated CLF-C02 questions are original learning content derived from official AWS task statements and documentation. Do not import or copy real exam questions, brain dumps, or unauthorized proprietary course material. Current limitations are shown in each track source report; YouTube publish dates/transcripts and authenticated Skill Builder internals still need richer refresh.

## Commands

```bash
npm install
npm test
npm run lint
npm run build
npm run seed
npm run reset
npm run export
npm run api
```

Then open http://localhost:3000.

## API

- `GET /health`
- `GET /api/landing`
- `GET /api/tracks/:trackId`
- `GET /api/tracks/:trackId/resources` for track-scoped service/resource explanations (`clf-c02` currently returns the AWS resource corpus; `aif-c01` intentionally returns an empty list)
- `GET /api/tracks/:trackId/cards/:cardId`
- `POST /api/tracks/:trackId/quizzes` with `{ "mode": "quick|domain|full|weakness|mixed", "domainId": "1", "count": 15 }`
- `POST /api/tracks/:trackId/answers` with `{ "questionId": "...", "selectedOptionId": "a" }`
- `POST /api/tracks/:trackId/cards/mark` with `{ "cardId": "...", "status": "know|review" }`
- `POST /api/admin/reset`
- `GET /api/admin/export`

## Docker

The checked-in compose file is intentionally private-by-default: it publishes the app only on `127.0.0.1:9140`, not on a public interface.

```bash
# If the Docker Compose plugin is installed:
docker compose up --build -d
curl http://127.0.0.1:9140/health

# This host currently does not have docker compose installed; equivalent docker run:
docker build -t vion-learning:kanban .
docker rm -f aws-cert-trainer 2>/dev/null || true
docker run -d \
  --name aws-cert-trainer \
  --restart unless-stopped \
  -p 127.0.0.1:9140:3000 \
  -v "$PWD/var:/app/var" \
  -v "$PWD/backups:/app/backups" \
  vion-learning:kanban
curl http://127.0.0.1:9140/health
```

The container healthcheck calls `/health` and exits non-zero if the app is unhealthy. Logs are JSON lines:

```bash
docker ps --filter name=aws-cert-trainer
docker logs --tail=100 aws-cert-trainer
```

## Private Tailscale Serve deployment

Recommended hostname/ports for this deployment:

- Tailnet host: `vion-kanban-ec2.tail276347.ts.net`
- Tailnet IP: `100.124.15.123`
- Local container bind: `127.0.0.1:9140 -> container :3000`
- Private Tailscale HTTPS: `https://vion-kanban-ec2.tail276347.ts.net:8443/`

Publish privately with Tailscale Serve only after the loopback healthcheck passes:

```bash
# Confirm there is no public Funnel state. Funnel is forbidden unless Andrew explicitly asks.
tailscale serve status --json

# Serve to the tailnet only. This does not enable Funnel.
tailscale serve --https=8443 --bg http://127.0.0.1:9140

# On this host, Tailscale required root/operator privileges; Andrew applied the route with:
sudo tailscale serve --https=8443 --bg http://127.0.0.1:9140

# Verify the private endpoint and core app/API pages.
curl https://vion-kanban-ec2.tail276347.ts.net:8443/health
curl https://vion-kanban-ec2.tail276347.ts.net:8443/
curl https://vion-kanban-ec2.tail276347.ts.net:8443/api/landing
curl https://vion-kanban-ec2.tail276347.ts.net:8443/api/tracks/clf-c02
curl https://vion-kanban-ec2.tail276347.ts.net:8443/api/tracks/aif-c01

# If the local resolver cannot resolve MagicDNS but tailscale status shows the node IP:
curl --resolve vion-kanban-ec2.tail276347.ts.net:8443:100.124.15.123 \
  https://vion-kanban-ec2.tail276347.ts.net:8443/health
```

From another Tailnet device, open `https://vion-kanban-ec2.tail276347.ts.net:8443/` or run the same `curl .../health` command. If it does not load, check that the device is logged into the same tailnet, MagicDNS is enabled, and Tailscale ACLs permit the connection.

Stop/change commands:

```bash
# Remove only the aws-cert-trainer private serve route on 8443.
tailscale serve --https=8443 off

# Stop the app container.
docker rm -f aws-cert-trainer

# Change the serve target after restarting the app on a different local port.
tailscale serve --https=8443 --bg http://127.0.0.1:<new-port>
```

Security caveats:

- Do not run `tailscale funnel` for this app unless Andrew explicitly asks for public exposure.
- Do not change the Docker port mapping to `0.0.0.0` or bare `9140:3000` for the private deployment.
- Do not attach this app to existing public Traefik/nginx routes; it assumes root paths (`/assets`, `/api`, `/health`) and is meant to sit behind the private tailnet URL.
- `/api/admin/reset` and `/api/admin/export` are currently unauthenticated, so tailnet/ACL access is the security boundary.

## Seed, reset, backup, and export

```bash
# Seed/reset the repo-local JSON snapshot before rebuilding, if needed.
npm run seed
npm run reset
npm run export

# Runtime API export through the private route.
curl https://vion-kanban-ec2.tail276347.ts.net:8443/api/admin/export > backups/vion-learning-export-$(date -u +%Y%m%dT%H%M%SZ).json

# Runtime reset through the private route.
curl -X POST https://vion-kanban-ec2.tail276347.ts.net:8443/api/admin/reset
```

The `docker run` command above bind-mounts `./var` and `./backups` into the container so seed/export artifacts remain available on the host.

## Troubleshooting

- `curl http://127.0.0.1:9140/health` fails: inspect `docker logs aws-cert-trainer` and `docker inspect --format '{{json .State.Health}}' aws-cert-trainer`.
- Tailnet URL fails but loopback works: run `tailscale status`, `tailscale serve status --json`, and reapply `tailscale serve --https=8443 --bg http://127.0.0.1:9140`.
- Browser loads blank/static asset 404s: ensure the app is served at `/` on its own HTTPS port, not under a path prefix.
- Port 8443 already in use in Tailscale Serve: pick another tailnet HTTPS port and update the verification URL/commands.

## Data model notes

Source corpora live in:

- `data/sources/clf-c02/*`
- `data/sources/aif-c01/*`

The app adapts these into a track-scoped runtime model in `src/lib/learningModel.js`. If a requested card/question/track does not belong to the route's `trackId`, the API rejects it rather than falling back to another certification.

## CLF-C02 content maintenance

Deep CLF-C02 AWS service/resource explanations live in `data/sources/clf-c02/resource_explanation_corpus.json`. Richer milestone-1 study content also lives in:

- `data/sources/clf-c02/concept_records.json`
- `data/sources/clf-c02/question_bank.json`

`src/lib/learningModel.js` adapts these static JSON files into track-scoped concept cards, curated scenario questions, generated reinforcement cards/questions, and answer-review mappings. The AIF-C01 track does not read these CLF-C02 files; keep AI Practitioner content under `data/sources/aif-c01/*` only.

When refreshing official sources or adding CLF-C02 content:

1. Refresh official AWS references first: the CLF-C02 exam guide, AWS Certification page, and the specific service documentation URLs cited in each entry.
2. For `concept_records.json`, add original teaching content only: scenario, exam angle, misconceptions, decision rules, services, concepts, difficulty, and source URLs. Keep the writing explanatory rather than dump-like.
3. For `question_bank.json`, every question must remain original and include:
   - one clearly correct answer
   - plausible distractors
   - explanation for the correct choice
   - explanation for each distractor
   - domain/service/concept/difficulty metadata
   - official/public source URLs
4. Do not paste real exam questions, brain dumps, or proprietary course text. If wording starts sounding suspiciously like leaked prep material, delete it and write the concept from first principles instead.
5. Preserve `track_id: "clf-c02"` in CLF content files and keep AIF-C01 content in its own tree.
6. Re-run `npm test`, `npm run lint`, and `npm run build`. For API validation, run the app and check `/health`, `/api/tracks/clf-c02`, `/api/tracks/clf-c02/resources`, and `/api/tracks/aif-c01/resources` to confirm track separation and richer quiz metadata.

Quality checks worth keeping an eye on:

- Quick 10 should mix question types and difficulty when the pool allows it.
- Correct answers should not cluster in one position across repeated runs.
- Distractors should be meaningfully different, not generic duplicates with new shoes.
- Every review screen should teach why the wrong answers are wrong, not merely announce that they are.
