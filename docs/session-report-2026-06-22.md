# WonderSolutions — 세션 작업 보고서

- **날짜**: 2026-06-22
- **리포지토리**: WonderSolutions (multi-marketplace plugin generator)
- **브랜치/원격**: `main` → `origin` (github.com/Chigo55/WonderSolutions), 완전 동기화
- **결과**: `docs/deterministic-runtime.md` 스펙 전체 구현 + 검증 + 0.2.0 릴리스 푸시

---

## 1. 목표

`docs/deterministic-runtime.md`(결정성 런타임 스펙)를 바탕으로 구현 계획을 세우고, 그 핵심 — **§2 "두 개의 동등한 공개 호출 표면(MCP + CLI)"** — 을 실제로 구현·검증한다.

---

## 2. 한눈에 보기

| 항목 | 결과 |
| --- | --- |
| 구현 단계 | P0–P5 전부 완료 |
| 신규 런타임 모듈 | 18개 (`tools/shared/runtime/**`, `tools/runtime/**`, `tools/mcp/**`) |
| §7 오퍼레이션 | 16개 전부 레지스트리 등록 + 테스트 |
| 테스트 | **171 통과** (세션 시작 107 → +64) |
| 타입체크 / drift | clean / 드리프트 없음 |
| 공개 표면 | MCP stdio 서버 + CLI (`npm run mcp`, `npm run runtime`) |
| 깃 훅 | 활성화 + 차단/통과 양방향 검증 |
| 버전 | `0.1.0 → 0.2.0` (루트·매니페스트·MCP 서버), 푸시 완료 |
| 커밋 | 11개, conventional commits |

---

## 3. 아키텍처

```
  MCP 서버 (tools/mcp/)        CLI (tools/runtime/)
            \                       /
             v                     v
   executeOperation()  ── tools/shared/runtime/operations.ts
   (16개 §7 오퍼레이션, Zod 입력검증, 통일 RuntimeResult)
                       |
        +--------------+---------------+
        |  state/run/reuse/extend 스토어,  |
        |  initPlugin, source-ops,        |
        |  markdown scaffold 엔진,         |
        |  generate/validate/drift 래퍼    |
        +--------------------------------+
                       |
              파일시스템 (.wonder/**, 생성물)
```

핵심 설계: **단일 레지스트리**에서 두 표면이 스키마·디스패치를 파생 → MCP와 CLI가 구조적으로 절대 어긋나지 않음.

---

## 4. 단계별 구현 상세

### P0 — 계약 & IO 기반
- `tools/shared/runtime/result.ts` — `RuntimeResult`/`RuntimeError`/`RuntimePaths`, `RuntimeAbortError`, `runRuntimeOperation`
- `tools/shared/runtime/io/{fs-path,json,markdown}.ts` — `pathExists`, `writeJsonFile`/`readJsonIfPresent`(2-space+trailing newline, invalid-JSON abort+repair), `normalizeMarkdown`(LF/trailing-newline, preserve-content)

### P1 — Markdown 스캐폴드 엔진
- `tools/shared/runtime/markdown/registry.ts` — strict-scaffold 정의(헤딩 순서 + 선택적 마커)
- `tools/shared/runtime/markdown/scaffold.ts` — `createScaffold`, `repairScaffold`(empty→replace, 누락 섹션만 추가, unknown 보존), `assertScaffoldRewriteAllowed`(파괴적 재작성 확인 게이트)
- 기존 4개 run-scaffold 모듈(build/govern/reuse/extend)의 빈 `""` 플레이스홀더를 실제 스캐폴드로 교체

### P2 — 오퍼레이션 세트 + 레지스트리
- `state-store.ts` — `readStateFile`/`writeStateFile` (typed merge, unknown plugin 섹션 보존)
- `run-store.ts` — `updateRunRecord`(create-once-then-typed), latest report read/write
- `reuse-index.ts` — 독립형 `refreshReuseIndex` (reuse-init에서 추출)
- `build-init.ts` — 누락돼 있던 `ensureBuildInitFiles` 신규 추가 (G6)
- `init-plugin.ts` — `initPlugin` 오케스트레이션 (init 파일 시딩 + state 병합)
- `source-ops.ts` — `listPackages`/`listCapabilities`/`getCapabilitySpec` + capability 등록정보 유도
- `extend-store.ts` — `applyIntegrationChange`/`detectCapabilities` 디스크 래퍼 (비밀값 금지 유지)
- `pipeline-ops.ts` — `generate`/`validate`/`drift` 래퍼
- `run-scaffold.ts` — `createRunScaffold` 디스패처 (패키지·capability별 라우팅)
- `operations.ts` — **레지스트리** (16개 §7 오퍼레이션 + `executeOperation`, 미지의 op/입력오류/abort/예외 모두 RuntimeResult 실패로 변환)

### P3 — CLI 표면
- `tools/runtime/dispatch.ts`(`runCli`) + `tools/runtime/cli.ts` 엔트리, `npm run runtime`
- **CLI ↔ facade 등가성 테스트** (동일 입력 → byte-동일 결과)

### P4 — MCP 표면
- `@modelcontextprotocol/sdk`(공식 SDK) 도입
- `tools/mcp/tools.ts`(레지스트리→MCP 도구 어댑터, SDK-free 테스트 가능) + `server.ts`(`createRuntimeMcpServer`) + `cli.ts`(stdio 엔트리), `npm run mcp`
- **InMemoryTransport 기반 실제 프로토콜 왕복 테스트** (Client↔서버: listTools 16개, callTool 성공/실패 경로)

### P5 — 배선 & 문서
- `CLAUDE.md` — 명령/런타임 섹션에 두 표면 + 레지스트리 + 스캐폴드 엔진 기술
- `docs/deterministic-runtime-implementation-plan.md` — 계획 문서 작성 + 구현 상태 기록
- 레지스트리가 §7 16개와 정확히 일치하는지 가드 테스트 포함

---

## 5. 테스트

- 세션 시작 **107 통과** → 종료 **171 통과** (신규 +64), 0 실패, typecheck clean
- 신규 테스트 파일: `runtime-result`, `runtime-io`, `runtime-scaffold`, `runtime-store`, `runtime-init-plugin`, `runtime-source-ops`, `runtime-operations`, `runtime-cli`, `runtime-mcp`
- 등가성 검증: **CLI↔facade**, **MCP(프로토콜)↔facade** 둘 다 byte-동일 확인 → §2 보증

---

## 6. 깃 훅 활성화 & 검증

- `.githooks/pre-commit`는 리포에 존재했지만 `core.hooksPath` 미설정으로 **비활성** 상태였음 (`.git/hooks/`에도 활성 훅 없음)
- `git config core.hooksPath .githooks`로 활성화
- 실제 `git commit`으로 양방향 검증:
  - **통과**: 정상 커밋 → 훅이 generate→validate→drift 실행 후 통과(EXIT 0)
  - **차단**: 소스 손상 → generate 단계 실패로 커밋 거부(EXIT 1, HEAD 불변)

---

## 7. 버전 범프 (0.1.0 → 0.2.0)

올린 항목(제품 버전): 루트 `package.json`(+lock), 패키지 매니페스트 4개(→생성물 39개 재생성), MCP 서버 버전, 매니페스트 단언 테스트 픽스처 4개.

**도중 회귀 발견·수정**: 매니페스트 범프 커밋(`e941b00`)이 매니페스트 버전을 하드코딩한 테스트 4개를 깨뜨린 채 푸시됨 — pre-commit 훅이 `npm test`를 돌리지 않아 통과했기 때문. 후속 커밋(`419eabf`)으로 픽스처를 0.2.0에 맞춰 171개 전체 통과 복구.

**의도적으로 0.1.0 유지** (제품 버전이 아님):

| 위치 | 성격 | 이유 |
| --- | --- | --- |
| `source-hash.ts` `GENERATOR_VERSION` | 생성기 알고리즘 버전(해시 입력) | 올리면 전 산출물 해시 churn, 캐시 무효화 용도라 별개 |
| `reuse.ts` default / `reuse-init` 스타터 / `reuse-run` promote default | 재사용 에셋 콘텐츠 버전 | 새 에셋이 0.1.0부터 시작하는 의미 |

---

## 8. 커밋 이력 (11개, origin/main 반영)

```
419eabf chore: complete 0.2.0 bump (mcp server version + manifest test fixtures)
e941b00 chore: bump package manifests to 0.2.0
5240e44 chore: bump version to 0.2.0
10a7259 docs: document deterministic runtime surfaces and mark plan implemented
d27694c feat: add wonder-runtime MCP stdio surface over the operation registry
9539ddc feat: add wonder-runtime CLI fallback surface
bd14781 feat: add runtime operation registry and dispatch
29cab65 docs: add deterministic runtime implementation plan
42f6e7f feat: add runtime operation set (state, run, reuse index, init, source)
24d913f feat: add markdown scaffold engine and wire run scaffolds
6e6d723 feat: add deterministic runtime result and IO foundation
```

---

## 9. 주요 결정 사항

- **MCP transport**: 공식 `@modelcontextprotocol/sdk`(stdio) 채택 (대안: 무의존성 JSON-RPC 직접 구현 — 기각)
- **결정성(D2)**: 타임스탬프/run-id는 오퍼레이션 입력으로 받음 (`Date.now()` 런타임 내부 사용 안 함)
- **타깃 프로젝트 vs 소스 분리**: source-bound 오퍼레이션(generate/validate/list*)만 `loadSource` 의존, project-local 오퍼레이션은 `.wonder/` IO만 사용

---

## 10. 남은 항목 / 후속 제안

1. **pre-commit 훅에 `npm test` 추가** — 이번 회귀(테스트 미실행 갭)를 막음
2. **훅의 stale-staged 가드** — generate 후 `git diff --exit-code` 한 줄로 "옛 생성물 스테이징" 차단 가능
3. **`GENERATOR_VERSION` 0.2.0 승급 여부** — 원하면 가능하나 전 산출물 해시 재생성 동반
4. **`extend-init.ts`의 `new Date()`** — 결정성 관례와 어긋남(런타임 파일이라 게이트엔 안 걸림), 정리 후보
5. **레거시 헬퍼 중복 정리** — build-run/govern-run/extend-run의 로컬 `pathExists`/`jsonWithTrailingNewline`를 공유 IO로 마이그레이션(저우선)

---

## 부록 — 사용자의 기존 변경(미관여)

`docs/system-design.md`(수정)와 `docs/deterministic-runtime.md`(스펙, untracked)는 세션 시작 전부터 워킹트리에 있던 사용자 변경으로, 커밋하지 않고 그대로 두었음.

---

## 11. 후속 보완 메모

이 보고서 이후 재평가에서 확인된 런타임 계약 미흡분을 후속 커밋에서 보완했다.

- `docs/deterministic-runtime.md`를 커밋 대상에 포함해 스펙 추적성을 보완.
- run scaffold 생성은 기존 run 파일을 덮어쓰지 않고 `existingPaths`로 보고하도록 변경.
- `updateRunRecord` public input schema를 strict하게 만들어 unknown patch field를 거부.
- `renderReuseOutput` operation이 run `output.md` 및 명시 target 파일 쓰기를 수행할 수 있도록 확장.
- `extend-init.ts`의 내부 `new Date()` 사용을 제거하고 caller-provided `generatedAt`을 사용.
- 관련 회귀 테스트를 추가해 보존성, strict update, reuse output write, deterministic extend init을 검증.
