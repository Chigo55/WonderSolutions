<p align="center">
  <h1 align="center">wonder-harness</h1>
  <p align="center">
    <strong>Stack-agnostic 6-stage development orchestration harness for Claude Code</strong><br>
    분석 → 조사 → 계획 → 구현 → 검사 → 수정의 6단계 파이프라인을 제공하는 Claude Code 플러그인입니다.
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/Claude_Code-plugin-blue?style=flat-square" alt="Claude Code Plugin">
    <img src="https://img.shields.io/badge/version-1.0.0-orange?style=flat-square" alt="Version 1.0.0">
    <img src="https://img.shields.io/badge/Node.js-18+-green?style=flat-square" alt="Node.js 18+">
    <img src="https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square" alt="MIT License">
  </p>
</p>

---

## 개요

`wonder-harness`는 스택에 종속되지 않는 **6단계 개발 파이프라인**을 Claude Code에 제공하는 오케스트레이션 하네스다.

- **파이프라인**: analyzer(분석) → researcher(조사) → planner(계획) → developer(구현) → inspector(검사) → modifier(수정)
- **조율**: orchestrator 에이전트가 단계 간 흐름을 조율한다.
- **검증**: ruler 에이전트가 backend · frontend · security · workflow · templates 규칙에 대조 검증한다.
- **템플릿 카탈로그**: researcher가 조사 시 기존 패턴을 카탈로그에서 꺼내 주입하고, 재사용 가치가 있는 패턴을 후보로 마킹한다. `/wh-template`으로 승격·관리한다.
- **단계 강제 훅**: 현재 파이프라인 단계를 벗어난 `Write`/`Edit` 를 차단한다.

---

## 설치

### 마켓플레이스에서 설치

```shell
# 마켓플레이스 등록
/plugin marketplace add Chigo55/wonder-harness

# 플러그인 설치
/plugin install wonder-harness@wonder-harness
```

### 로컬에서 직접 로드 (개발·테스트용)

```bash
git clone https://github.com/Chigo55/wonder-harness.git
claude --plugin-dir ./wonder-harness/plugins/wonder-harness
```

---

## 커맨드

| 커맨드 | 설명 |
|--------|------|
| `/wh-init` | 프로젝트 초기화 — ADR 역설계 + 상태 기록 + HTML 리포트 |
| `/wh-run` | 6단계 파이프라인 단일 진입점 |
| `/wh-review` | inspector 에이전트를 통한 독립 코드 리뷰 |
| `/wh-rules` | ruler 규칙 수정(amend) 또는 감사(audit) |
| `/wh-template` | 템플릿 카탈로그 관리 — 후보 승격(promote) · 추가(add) · 수정(edit) · 삭제(delete) |

---

## 에이전트

| 에이전트 | 역할 | 단계 |
|----------|------|------|
| `orchestrator` | 파이프라인 전체 조율 | — |
| `analyzer` | 요청 분석 · 범위 정의 | Stage 1 |
| `researcher` | 라이브러리·패턴·선례 조사 | Stage 2 |
| `planner` | 구현 계획 수립 | Stage 3 |
| `developer` | 코드 구현 | Stage 4 |
| `inspector` | 결과물 검사 | Stage 5 |
| `modifier` | 검사 피드백 반영 수정 | Stage 6 |
| `ruler` | 규칙 관리 및 최종 검증 | — |

---

## 의존 플러그인

설치 시 자동으로 함께 설치되며, 모두 공식 마켓플레이스 `claude-plugins-official` 에서 제공된다.

| 플러그인 | 역할 |
|----------|------|
| `superpowers` | brainstorming · TDD · debugging 등 개발 워크플로우 스킬 |
| `context7` | 라이브러리/프레임워크 최신 문서 조회 (MCP) |
| `claude-md-management` | CLAUDE.md 감사 · 개선 |
| `code-simplifier` | 코드 단순화 · 정리 |

> **전제조건**
> - 소비자 환경에 `claude-plugins-official` 마켓플레이스가 등록돼 있어야 의존성이 해석된다.
> - 의존성 자동 활성화는 Claude Code **v2.1.143+** 에서 동작한다 (그 이하에서는 설치 후 수동 활성화 필요).

---

## 저장소 구조

이 저장소는 **단일 플러그인 마켓플레이스**입니다.

```
wonder-harness/  (마켓플레이스 저장소)
  .claude-plugin/
    marketplace.json        ← 마켓플레이스 카탈로그
  plugins/
    wonder-harness/         ← wonder-harness 플러그인 (v1.0.0)
      .claude-plugin/
        plugin.json         ← 플러그인 매니페스트
      commands/             ← 슬래시 커맨드 (wh-init·wh-run·wh-review·wh-rules)
      agents/               ← 에이전트 (orchestrator·analyzer·researcher·planner·developer·inspector·modifier·ruler)
      hooks/                ← 이벤트 훅 (단계 강제)
      rules/                ← 하네스 규칙 (backend·frontend·security·workflow·templates)
      templates/            ← 템플릿 카탈로그 (index.json + scaffolds/)
      requests/             ← 요청 양식 시드
      skills/               ← SKILL.md 스킬 (grill-me·handoff·write-a-skill)
  package.json              ← 모노레포 루트
  CLAUDE.md
```

---

## 검증

```bash
npm run validate
# 또는
claude plugin validate ./plugins/wonder-harness
```

---

## License

MIT — [InHo Jeong](https://github.com/Chigo55)
