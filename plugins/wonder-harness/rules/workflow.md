---
title: 개발 워크플로우 규칙
owner: ruler
applies-to: developer
stack: Spring Boot + MyBatis(SP) + Thymeleaf + Kendo
---

# 개발 워크플로우 규칙

> 관련 규칙: `${CLAUDE_PLUGIN_ROOT}/rules/backend.md` · `${CLAUDE_PLUGIN_ROOT}/rules/frontend.md` · `${CLAUDE_PLUGIN_ROOT}/rules/security.md` · `${CLAUDE_PLUGIN_ROOT}/rules/templates.md`

신규 도메인/화면 개발 시 아래 순서를 따른다: 도메인 네이밍 확정 → 템플릿 탐색 → 구현.

## 도메인 네이밍 (전 파일 · URL 일관)

신규 도메인 개발 전 이름을 먼저 확정하고, 모든 파일·클래스·URL 에 일관 적용한다.

| 항목 | 규칙 | 예시 |
|------|------|------|
| 모듈 코드 | 도메인 약어 소문자 2자 | `wo` |
| 도메인명 | 모듈코드 + 기능명 (camelCase) | `woWorkShift` |
| 클래스명 | 도메인명 PascalCase | `WoWorkShift` |

- Java 파일·변수 상세: `${CLAUDE_PLUGIN_ROOT}/rules/backend.md`
- JS/HTML 파일·변수 상세: `${CLAUDE_PLUGIN_ROOT}/rules/frontend.md`

## 구현 전 템플릿 탐색 (필수)

도메인명 확정 후, 코드 구현 전에 반드시 프로젝트 템플릿 카탈로그(`.claude/templates/index.json`)를 탐색한다. 이는 enforce-template 훅의 규범 근거다 — 미탐색 상태의 `Write`/`Edit` 는 차단된다.

- 화면 유형과 가장 유사한 템플릿을 시작점으로 삼아 도메인 필드만 교체하고 구조는 유지한다.
- 토큰 규약·치환 규칙: `${CLAUDE_PLUGIN_ROOT}/rules/templates.md`
- 레이어별 탐색 상세: `${CLAUDE_PLUGIN_ROOT}/rules/backend.md`(Java), `${CLAUDE_PLUGIN_ROOT}/rules/frontend.md`(HTML/JS)

## DB 레이블 등록 (사용자 영역)

Thymeleaf 에서 사용하는 `${@messageUtils.getMessage('key')}` 레이블은 **DB 에 저장**된다(properties 파일 아님). 화면에 필요한 필드명·버튼명 키를 DB 에 등록 후 사용한다. DB 데이터 등록은 AI 작업 범위 밖이며 사용자가 수행한다.

공통 키(이미 등록됨 예): `button.add_row`, `button.delete_row`, `button.search`, `button.select`.

## 검토 체크리스트 (review 모드)

- [ ] 도메인명이 전 파일·클래스·URL 에 일관 적용됨
- [ ] 구현 전 템플릿 탐색(`.claude/templates/index.json`) 수행
- [ ] 화면에 필요한 DB 레이블 키 등록 여부 확인(사용자 영역)
