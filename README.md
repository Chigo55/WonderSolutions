<p align="center">
  <h1 align="center">wonder-harness</h1>
  <p align="center">
    <strong>Spring Boot · MyBatis(SP) · Thymeleaf · Kendo 스택 도메인 개발 오케스트레이션 하네스</strong><br>
    요청 → 계획 → 템플릿 탐색·축적 → 코드 구현 → 규칙 검증의 4단계 파이프라인을 제공하는 Claude Code 플러그인입니다.
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/Claude_Code-plugin-blue?style=flat-square" alt="Claude Code Plugin">
    <img src="https://img.shields.io/badge/version-0.5.0-orange?style=flat-square" alt="Version 0.5.0">
    <img src="https://img.shields.io/badge/Node.js-18+-green?style=flat-square" alt="Node.js 18+">
    <img src="https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square" alt="MIT License">
  </p>
</p>

---

## 개요

`wonder-harness`는 **Java 17 / Spring Boot 3.x / MyBatis(SQL Server 저장프로시저) / Thymeleaf / Kendo UI 웹컴포넌트 / Bootstrap 5 / ES6** 스택의 도메인·화면 개발을 오케스트레이션한다.

- **파이프라인**: planner(분해) → templater(템플릿 탐색·축적) → developer(구현) → ruler(규칙 검증)
- **정체성**: 재사용 가능한 *메커니즘 + 회사표준 규칙*. 특정 프로젝트의 복제본이 아니다.
- **규칙 5종**(ruler 소유): `backend` · `frontend` · `security` · `workflow` · `templates`
- **템플릿 탐색 강제 훅**: 프로젝트 `index.json` 미탐색 상태의 `Write`/`Edit` 를 차단한다.

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

## 의존 플러그인

`wonder-harness`는 아래 플러그인을 의존성으로 선언한다. 설치 시 자동으로 함께 설치되며, 활성화 시 같은 스코프에서 함께 활성화된다. 모두 공식 마켓플레이스 `claude-plugins-official` 에서 제공된다.

| 플러그인 | 역할 |
|----------|------|
| `superpowers` | brainstorming · TDD · debugging 등 개발 워크플로우 스킬 |
| `context7` | 라이브러리/프레임워크 최신 문서 조회 (MCP) |
| `hookify` | 대화에서 훅 규칙 생성 |
| `plugin-dev` | 플러그인 · 스킬 · 훅 개발 도구 |
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
    wonder-harness/         ← wonder-harness 플러그인 (v0.5.0)
      .claude-plugin/
        plugin.json         ← 플러그인 매니페스트
      commands/             ← 슬래시 커맨드 (wh-create·wh-modify·wh-review)
      agents/               ← 격리 서브에이전트 (planner·templater·developer·ruler)
      hooks/                ← 이벤트 훅 (템플릿 탐색 강제)
      rules/                ← 하네스 규칙 (backend·frontend·security·workflow·templates)
      templates/            ← index 스키마·시드 + scaffolds
      requests/             ← 요청 양식 시드 (create_request·modify_request)
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
