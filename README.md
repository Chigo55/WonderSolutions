# WonderSolutions

하나의 canonical source에서 **Claude Code · Codex · Antigravity** 세 AI 코딩 플랫폼용 marketplace 패키지를 동시에 생성·검증하는 멀티 마켓플레이스 플러그인 저장소입니다.

사람은 `packages/`의 플랫폼 중립 원본만 편집하고, `adapters/`의 projection 규칙을 거쳐 각 플랫폼이 실제로 읽는 native 경로에 산출물이 결정적(deterministic)으로 생성됩니다. 생성물은 commit 대상이지만 사람이 직접 수정하지 않으며, `pre-commit` hook이 stale 산출물을 차단합니다.

---

## 핵심 아이디어

```
packages/  (사람이 쓰는 원본)        adapters/  (플랫폼 변환 규칙)
        \                              /
         \                            /
          ▼  tools/generate (결정적 생성기)  ▼
   ┌──────────────────┬──────────────────┬──────────────────┐
   │   Claude Code    │      Codex        │   Antigravity    │
   │ .claude-plugin/  │ .agents/plugins/  │ .agents/plugins/ │
   │ plugins/claude/  │ plugins/codex/    │   (plugin+skill) │
   └──────────────────┴──────────────────┴──────────────────┘
                          ▲
              tools/validate (schema · drift 검증)
```

- **단일 원본, 다중 투사(projection)**: capability 본문(`instruction.md`)은 한 번만 작성한다. 플랫폼별 호출 방식·툴 안내는 adapter 템플릿이 주입한다.
- **Override 없음**: 세 플랫폼은 우열 관계가 아니라 동등한 target이다. 같은 프로젝트에서 동시에 사용할 수 있다.
- **결정적 생성**: 같은 입력은 byte-identical 출력을 만든다. timestamp 같은 비결정 요소는 산출물에 넣지 않는다.
- **Native path 직접 생성**: `generated/` 같은 숨김 폴더가 아니라 각 플랫폼이 실제 읽는 경로에 생성한다.
- **느슨한 결합**: 플러그인 간에는 hard dependency가 없다. `.wonder/state.json` capability registry를 통한 discovery로만 서로를 강화한다.

---

## 제품 경계 (Plugins)

플러그인은 기술 구성요소가 아니라 **사용자 작업(user job)** 기준으로 나뉩니다. 각 플러그인은 다른 플러그인 없이도 독립 실행 가능하며, 다른 플러그인이 init되어 있으면 progressive enhancement로 기능을 강화합니다.

| Plugin           | User Job | 책임                                                              | Capabilities                                                     |
| ---------------- | -------- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| `wonder-build`   | Build    | 작업 생성·수정·검토를 구조화해서 수행                              | `init`, `create`, `modify`, `review`                            |
| `wonder-govern`  | Govern   | 프로젝트 기준·규칙 관리, 실제 프로젝트 상태 검사                   | `init`, `define-standards`, `check-policy`                      |
| `wonder-reuse`   | Reuse    | 템플릿·요청서·문서 패턴·snippet 등 재사용 자산 관리 및 생성 활용   | `init`, `manage-assets`, `generate-output`, `promote-asset`     |
| `wonder-extend`  | Extend   | 외부 companion/integration 추천, 연결 안내, capability 감지        | `init`, `discover-companions`, `configure-integration`, `detect-capabilities` |

### Surface 이름 매핑

canonical identifier는 `<package-id>.<capability-id>` 형식이며, 플랫폼별 surface 이름은 여기서 자동 생성됩니다(사람이 직접 작성하지 않음).

| canonical id          | Claude Code            | Codex                  | Antigravity           |
| --------------------- | ---------------------- | ---------------------- | --------------------- |
| `wonder-build.create` | `/wonder-build:create` | `$wonder-build-create` | `wonder-build.create` |

---

## 저장소 구조

```text
packages/                 # ✍️ 사람이 편집하는 canonical 원본
  wonder-build/
    manifest.json         # 패키지 메타 (id, version, userJob, capabilityOrder)
    specs/                # 사람용 설계 문서 (tool 입력 아님)
    capabilities/
      create/
        capability.json   # kind, description, requires[] (abstract action)
        instruction.md    # 플랫폼 중립 본문 — 단 한 번만 작성
        design.md
  wonder-govern/  wonder-reuse/  wonder-extend/
  wonder-extend/catalog/  # companions.json, integrations.json

adapters/                 # 🔧 플랫폼 projection 규칙 (사람이 편집)
  claude/  codex/  antigravity/
    adapter.json          # 출력 종류·scope·경로·템플릿 정의
    templates/*.hbs       # Handlebars 템플릿

tools/                    # ⚙️ 생성기 · 검증기 (TypeScript)
  generate/               # loadSource → computeOutputs → writeOutputs
  validate/               # source · generated · runtime · drift 검증
  shared/                 # Zod schema, platform names/paths, hash, runtime util

tests/                    # 🧪 node:test 단위 테스트 (107 cases)
.githooks/pre-commit      # generate → validate → drift gate

# 아래는 생성 산출물 — commit 대상이나 직접 수정 금지 🚫
.claude-plugin/marketplace.json
plugins/claude/<pkg>/...        plugins/codex/<pkg>/...
.agents/plugins/...   .agents/skills/...

docs/
  system-design.md         # 목표 아키텍처 명세 (기준 문서)
  implementation-design.md # Node.js + TypeScript 구현 계약
okf-spec.md                # Open Knowledge Format 명세 (런타임 지식 아티팩트)
llm-wiki.md
```

---

## 빠른 시작

### 요구 사항

- **Node.js ≥ 20** (개발 환경 검증: v24)
- npm (저장소에 `package-lock.json` 포함)

### 설치 및 검증

```bash
npm install

# 산출물 생성 → schema 검증 → drift 검증을 한 번에
npm run check
```

### 주요 스크립트

| 명령              | 설명                                                              |
| ----------------- | ----------------------------------------------------------------- |
| `npm run generate`| `packages/` + `adapters/`를 읽어 세 플랫폼 native 산출물 생성     |
| `npm run validate`| source schema · generated 산출물 · runtime state 검증            |
| `npm run drift`   | 생성 산출물이 원본과 일치하는지(drift 없음) 검사                  |
| `npm run check`   | `generate && validate && drift` 순차 실행 (로컬 편의용)          |
| `npm run typecheck`| `tsc --noEmit` 타입 체크                                         |
| `npm test`        | `tsx --test`로 `tests/**/*.test.ts` 실행                         |

### CLI 플래그

```bash
# 특정 플랫폼만 생성 (기본값: all)
tsx tools/generate/cli.ts --platform claude   # claude | codex | antigravity | all
tsx tools/generate/cli.ts --dry-run

# 부분 검증 (플래그 없으면 source + generated + runtime 전체)
tsx tools/validate/cli.ts --source
tsx tools/validate/cli.ts --generated --drift
```

### Git hook 설치

`pre-commit`은 `generate → validate → drift`를 실행하고, 생성 산출물이 바뀌면 commit을 **실패시킵니다**. hook은 staged set을 몰래 바꾸지 않으므로(`git add` 안 함), 변경된 산출물은 사용자가 직접 확인 후 stage합니다.

```bash
git config core.hooksPath .githooks
```

---

## 워크플로 (변경 → commit)

1. `packages/<pkg>/.../instruction.md` 또는 `capability.json` / `adapter.json` 등 **원본만** 편집한다.
2. `npm run generate`로 세 플랫폼 산출물을 다시 생성한다.
3. `npm run validate && npm run drift`로 검증한다.
4. 원본 + 갱신된 산출물을 함께 stage하고 commit한다. (`pre-commit`이 drift를 재확인)

> ⚠️ `plugins/`, `.claude-plugin/`, `.agents/` 아래 파일은 **생성물**입니다. 직접 수정하면 다음 generate에서 덮어써지고 drift gate에서 막힙니다.

---

## 런타임 상태 (`.wonder/`)

플러그인이 실제 프로젝트에서 동작할 때 쓰는 project-local 상태 루트입니다(저장소가 아닌 사용 대상 프로젝트에 생성됨).

```text
.wonder/
  state.json        # machine-managed capability registry (직접 편집 금지)
  config/           # 사용자 편집 가능 plugin 설정 (build/govern/reuse/extend.json)
  standards/        # 사람이 쓰는 규칙·기준 Markdown
  reuse/            # 재사용 자산 (templates, snippets, requests, patterns)
  extend/           # companions / integrations / capabilities 상태
  runs/<run-id>/    # 실행별 입력·결과·검증 로그·보고서
  reports/          # build-latest.json, govern-latest.json
```

- `state.json`은 플러그인·capability·platform별 init 상태를 분리 기록한다. 같은 프로젝트에서 여러 플랫폼을 동시에 쓸 수 있기 때문이다.
- 각 플러그인은 명시적 `init` capability를 제공하며, 설치만으로 프로젝트 파일을 자동 변경하지 않는다.
- Invalid runtime state는 자동 복구하지 않고 path · reason · repair hint를 출력하고 중단한다.

---

## Capability 작성 규약

capability 본문(`instruction.md`)은 **플랫폼 중립 문장**으로 작성합니다. `Claude`, `Codex`, `Antigravity`, `.claude/`, `.codex/`, `.agents/`, `shell_command` 같은 플랫폼 고유 표현은 금지되며, validator가 이를 검사합니다.

각 capability는 필요한 **abstract action**을 `capability.json`의 `requires`에 선언합니다.

```jsonc
// packages/wonder-build/capabilities/create/capability.json
{
  "schemaVersion": 1,
  "id": "create",
  "title": "Create Artifact",
  "kind": "workflow",              // "workflow" | "operation"
  "description": "...",
  "requires": ["read", "search", "write", "edit", "run-command", "ask-user", "report", "manage-state"]
}
```

초기 abstract action 집합: `read`, `search`, `write`, `edit`, `run-command`, `delegate`, `web-research`, `ask-user`, `report`, `manage-state`. 새 action은 공통 schema와 세 플랫폼 adapter가 모두 정의된 뒤에만 추가할 수 있습니다.

---

## 기술 스택

- **언어/런타임**: TypeScript, Node.js ESM (`"type": "module"`)
- **실행기**: `tsx` (트랜스파일 없이 `.ts` 직접 실행), `tsc --noEmit` 타입 체크
- **검증**: [Zod](https://zod.dev) — `tools/shared/schema/*`의 Zod schema가 canonical
- **템플릿**: [Handlebars](https://handlebarsjs.com) — adapter `templates/*.hbs`
- **테스트**: Node 내장 `node:test` (외부 러너 없음)

`packages/`는 npm workspace가 아니라 marketplace product source입니다. pnpm/turbo/workspace linking은 도입하지 않습니다.

---

## 더 읽어보기

- **목표 아키텍처 명세** — [`docs/system-design.md`](docs/system-design.md) *(기준 문서)*
- **구현 계약** — [`docs/implementation-design.md`](docs/implementation-design.md)
- **Open Knowledge Format** — [`okf-spec.md`](okf-spec.md) *(런타임 지식 아티팩트용)*
