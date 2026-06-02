# wonder-harness 구현 계획 (Implementation Plan)

> **근거 사양**: `docs/wonder-harness-spec.md` (v0.3.0)
> **이 문서는 실행 절차다** — 사양(무엇인지)을 *어떻게* 만들지 단계·작업·순서·검증 게이트로 규정.
> **대상**: `plugins/wonder-harness/**` · **분석 입력**: `raw/.claude/**` (읽기 전용, 수정 금지)

---

## 0. 실행 원칙

- **순서 고정**: 규칙 → 에이전트 → 메커니즘/메타 → 검증 → 커밋. 규칙이 ruler 정본이므로 가장 먼저.
- **포팅 깊이 가드**(사양 §5.2): 원칙·불변·토큰규약만 플러그인에. 위젯 gotcha 박제 금지.
- **상호참조 규약**: 규칙↔규칙 = `${CLAUDE_PLUGIN_ROOT}/rules/<name>.md` / 규칙→템플릿 = 프로젝트 로컬 `.claude/templates/...`.
- **각 Phase 끝에 게이트** 통과 후 다음 단계. 게이트 실패 시 해당 Phase 내 수정.
- **커밋 분리**: 기능 커밋(`feat/fix`) → 마지막에 버전 범프 커밋(`chore`).

---

## Phase 1 — 규칙 5종 (`rules/`)

> 입력: `raw/.claude/rules/*.md` · 산출: 교정된 플러그인 규칙 5종 · 소유: ruler

| ID | 작업 | 파일 | 완료 기준 |
|----|------|------|----------|
| R1 | backend 교정 | `rules/backend.md` | Repository 흔적 0, Mapper/SP-only/DTO/Form/tx순서/errorCode/패키지 반영 |
| R2 | frontend 교정 | `rules/frontend.md` | jQuery 흔적 0, Kendo/ES6/그리드ID/4-hidden/changesData/저장순서 반영, 위젯 gotcha 제외 |
| R3 | security 교정 | `rules/security.md` | 재고 무결성·권한 매핑표·고정 유틸·파일 검증 반영 |
| R4 | workflow 신설 | `rules/workflow.md` | 도메인 네이밍·탐색 필수·DB 레이블 |
| R5 | template-meta → templates 교체 | `rules/templates.md` (구 `template-meta.md` 제거) | 토큰 규약·치환표·INDEX 포맷·검증 체크리스트·단일 index.json 정본 |
| R6 | 상호참조 정리 | 위 5종 전체 | 규칙↔규칙 `${CLAUDE_PLUGIN_ROOT}/rules/...`, 규칙→템플릿 `.claude/...` |

**Phase 1 게이트**
- [ ] `grep -ri "repository\|jpa\|jquery\|com.wonderit"` → 의도된 곳 외 0건
- [ ] 5종 파일 존재, `template-meta.md` 제거됨
- [ ] 각 규칙 상단 owner(ruler)·applies-to 메타 유지
- [ ] 규칙 간 상호참조 경로가 `${CLAUDE_PLUGIN_ROOT}` 형태

---

## Phase 2 — 에이전트 4종 (`agents/`)

> 의존: Phase 1 (규칙 경로·내용 확정 후)

| ID | 작업 | 파일 | 완료 기준 |
|----|------|------|----------|
| A1 | developer 스택 교정 | `agents/developer.md` | "JSP/jQuery" 제거, SP-only·Kendo·ES6 명시, 규칙 5종 로드 경로, 프로젝트 index.json 탐색 |
| A2 | templater 카탈로그 | `agents/templater.md` | 단일 index.json 유지, raw 토큰 규약, 빈 시드 부트스트랩, 실코드 축적 |
| A3 | ruler 규칙 5종 | `agents/ruler.md` | 소유 규칙 4→5(workflow 추가), 검증 체크리스트 교정 내용 반영 |
| A4 | planner 경미 조정 | `agents/planner.md` | 도메인 단위=7파일 세트, 네이밍 규약 인지 |

**Phase 2 게이트**
- [ ] developer가 참조하는 규칙 파일명이 Phase 1 산출과 일치(5종)
- [ ] ruler 소유 목록 = 5종
- [ ] templater 토큰 규약이 `templates.md`와 일치
- [ ] 에이전트→규칙 참조 경로 유효

---

## Phase 3 — 메커니즘 · 메타데이터

> 의존: Phase 1–2

| ID | 작업 | 파일 | 완료 기준 |
|----|------|------|----------|
| M1 | 훅 회귀 확인 | `hooks/scripts/**` | 로직 변경 없음 확인, 기존 테스트 통과 |
| M2 | 빈 시드 유지 | `templates/index.seed.json` | `{ "version":1, "templates":[] }` |
| M3 | 스캐폴드 비움 유지 | `templates/scaffolds/` | 새 템플릿 굽지 않음, `.gitkeep` 유지 |
| M4 | 매니페스트 갱신 | `.claude-plugin/plugin.json` | description/keywords 교정 스택 반영, version `0.2.0`→`0.3.0` |
| M5 | 카탈로그 동기화 | `.claude-plugin/marketplace.json` | wonder-harness version `0.3.0` |
| M6 | 문서 갱신 | `CLAUDE.md`, `README.md` | 스택·구조 설명 교정 반영 |

**Phase 3 게이트**
- [ ] plugin.json ↔ marketplace.json version 일치(0.3.0)
- [ ] 시드·스키마 JSON 유효
- [ ] CLAUDE.md 스택 서술이 사양과 일치

---

## Phase 4 — 검증 (사양 §6, plan Q10-A)

| ID | 작업 | 완료 기준 |
|----|------|----------|
| V1 | 구조 검증 | `npm run validate` 통과 |
| V2 | 훅 회귀 | 기존 훅 테스트(`tests/`) 통과 |
| V3 | 실사용 통합 | WONDER 사본에 `claude --plugin-dir ./plugins/wonder-harness` 로드 후 `/wh-create` 실행 |
| V3a | — templater | `index.json`에 템플릿 항목 축적 확인 |
| V3b | — ruler | 교정된 5종 규칙으로 검증 보고 생성 확인 |
| V3c | — developer | SP-only·Kendo·`io.boot.wonder` 패키지로 코드 생성 확인 |
| V4 | 상호참조 수동 확인 | 규칙 내 `${CLAUDE_PLUGIN_ROOT}/rules/...` 링크 실제 해소 |

**Phase 4 게이트**
- [ ] V1·V2 자동 검증 green
- [ ] V3 워크플로우가 의도대로 동작 (3개 하위 확인)
- [ ] 회귀·오류 없음

---

## Phase 5 — 커밋 (CLAUDE.md 규칙)

1. `feat: align rules to MyBatis-SP/Kendo stack` (Phase 1)
2. `feat: update agents for corrected stack` (Phase 2)
3. `docs: refresh CLAUDE.md/README for v0.3.0` (Phase 3 M6)
4. `chore: bump version to 0.3.0` (Phase 3 M4·M5 — **별도 커밋**)

> 커밋 메시지는 conventional commits. 버전 범프는 항상 마지막 단독 커밋.

---

## 의존 그래프

```
Phase 1 (규칙)  ──►  Phase 2 (에이전트)  ──►  Phase 3 (메타)  ──►  Phase 4 (검증)  ──►  Phase 5 (커밋)
   R1..R6              A1..A4 (규칙 참조)        M1..M6              V1..V4
```

- Phase 1 은 모든 후속의 전제 (규칙이 ruler 정본·에이전트 참조 대상)
- Phase 2·3 는 Phase 1 확정 후 병행 가능하나, A1/A3가 규칙 파일명을 참조하므로 R5(파일명 확정) 선행 필수
- Phase 4 는 전 단계 산출 통합 검증

---

## 리스크 & 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 규칙에 위젯 gotcha 혼입 (과적합) | 플러그인이 Kendo 버전에 묶임 | Phase 1 게이트에서 gotcha 키워드 검사, 템플릿 주석으로 이관 |
| 상호참조 경로 혼동 (규칙↔규칙 vs 규칙→템플릿) | 런타임 링크 깨짐 | R6 전용 작업 + V4 수동 확인 |
| 빈 카탈로그로 훅이 아무것도 안 막음 | 첫 실행 시 탐색 강제 미발효 | 의도된 동작(테스트하며 축적). 사양 §6.3 명시 |
| version 비동기화 | 마켓플레이스 불일치 | M4·M5 동시 수정 + Phase 3 게이트 |

---

## 비범위 재확인 (사양 §9)

- ❌ 플러그인에 템플릿 파일 굽기  ❌ 프로젝트 전량 시딩/`wh-init`
- ❌ 위젯 gotcha 규칙 박제  ❌ `raw/.claude/` 수정  ❌ 훅 JS 대규모 개조
