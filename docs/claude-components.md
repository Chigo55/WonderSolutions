# Claude 플랫폼 플러그인 구성요소 목록

정식 소스 `plugins/`(Claude 네이티브 포맷) 기준의 구성요소 인벤토리입니다. 각 요소의 상세 동작은 해당 파일과 `docs/system-design.md`를 참조하세요.

## wonder-workflows (v0.3.1) — 6단계 SDLC 파이프라인

| 유형 | 이름 | 한 줄 설명 |
|------|------|-----------|
| 매니페스트 | `.claude-plugin/plugin.json` | 플러그인 메타데이터 |
| 커맨드 | `/wsf-run` | 6단계 파이프라인 단일 진입점 (인자 또는 `create_request.md` 입력, `ws-state.claude.json` 읽기 전용 바인딩) |
| 커맨드 | `/wsf-init` | 프로젝트 초기화 — `ws-state.claude.json` 레지스트리 프로비저닝 + 레이어별 ADR 역추출·규칙 생성·HTML 보고서 |
| 커맨드 | `/wsf-review` | inspector를 통한 단독 코드 리뷰 |
| 커맨드 | `/wsf-rules` | ruler를 통한 규칙 수정(amend)·감사(audit) |
| 에이전트 | `orchestrator` | 파이프라인 전체 조율 — 단계 순서 제어, 확장 바인딩, 최종 요약 |
| 에이전트 | `analyzer` | Stage 1 분석 — 범위·제약·요구사항 정리 |
| 에이전트 | `researcher` | Stage 2 리서치 — 의존성·패턴·선례 조사 |
| 에이전트 | `planner` | Stage 3 계획 — 변경 범위·로직 설계·테스트 사양 |
| 에이전트 | `developer` | Stage 4 구현 — 계획 기반 코드 작성 (Stage 6 수정 시 재호출) |
| 에이전트 | `inspector` | Stage 5 검사 — 규칙 준수·보안 감사 보고서 |
| 에이전트 | `modifier` | Stage 6 수정 — 검사에서 검출된 위반·버그 수정 |
| 에이전트 | `ruler` | 규칙 관리 — ADR 추출·규칙 생성·수정·감사 (rule 모드 전용) |
| 메타 규칙 | `rules/structure.md` | 구조 레이어 규칙 생성용 메타 규칙 |
| 메타 규칙 | `rules/security.md` | 보안 레이어 규칙 생성용 메타 규칙 |
| 메타 규칙 | `rules/workflow.md` | 파이프라인 단계 순서·산출물 규약 |

## wonder-utilities (v0.2.0) — 스킬 & 템플릿 카탈로그

| 유형 | 이름 | 한 줄 설명 |
|------|------|-----------|
| 매니페스트 | `.claude-plugin/plugin.json` | 플러그인 메타데이터 |
| 커맨드 | `/wsu-template` | 템플릿 카탈로그 관리 — promote · add · edit · delete |
| 에이전트 | `templater` | 템플릿 카탈로그 관리 실무 (template 모드 전용) |
| 스킬 | `cave-man` | 초간결 기술 커뮤니케이션 모드 |
| 스킬 | `grill-me` | 계획·결정에 대한 압박 질문(스트레스 테스트) |
| 스킬 | `hand-off` | 세션 인수인계 요약 생성 |
| 스킬 | `write-a-skill` | 신규 SKILL.md 작성 가이드 |
| 템플릿 | `templates/index.json` | 글로벌 템플릿 카탈로그 시드 |
| 템플릿 | `templates/index.schema.json` | 카탈로그 스키마 |
| 템플릿 | `templates/scaffolds/` | 템플릿 스캐폴드 저장소 (초기 비어 있음) |
| 요청 폼 | `requests/create_request.md` | 신규 작업 요청 폼 시드 (수동 프로비저닝 참조본) |
| 요청 폼 | `requests/modify_request.md` | 수정 요청 폼 시드 (수동 프로비저닝 참조본) |
| 메타 규칙 | `rules/templates.md` | 템플릿 카탈로그 운영 규약 |

## wonder-plugins (v0.1.0) — 컴패니언 집계 플러그인

자체 커맨드·에이전트·스킬·훅 없음. 매니페스트의 의존성 선언만으로 컴패니언 플러그인 4종을 전이 설치합니다.

| 유형 | 이름 | 한 줄 설명 |
|------|------|-----------|
| 매니페스트 | `.claude-plugin/plugin.json` | 의존성 선언 전용 매니페스트 |
| 의존성 | `superpowers` | 브레인스토밍·TDD·디버깅 워크플로우 스킬 |
| 의존성 | `context7` | 라이브러리/프레임워크 최신 문서 조회 (MCP) |
| 의존성 | `claude-md-management` | CLAUDE.md 감사·개선 |
| 의존성 | `code-simplifier` | 코드 단순화·정리 |

## 플러그인 외 연관 산출물 (참고)

- `ws-state.claude.json` — `/wsf-init`이 대상 프로젝트 루트에 생성하는 Claude 전용 기능 레지스트리 (플러그인에 포함되지 않는 생성물)
- `.claude/runs/` · `.claude/adr/` · `.claude/rules/` · `.claude/reports/` · `.claude/requests/` — 파이프라인 런타임 상태 (대상 프로젝트에 생성)
