---
title: 템플릿 작성 메타 규칙
owner: ruler
applies-to: templater
---

# 템플릿 작성 메타 규칙

templater 가 템플릿을 생성·수정·검토할 때 반드시 따르는 표준 구조·규약. "템플릿을 위한 템플릿".

## 카탈로그 구조

- 모든 템플릿은 프로젝트의 `.claude/templates/` 아래에 둔다.
  - `scaffolds/<id>/` — 재사용 가능한 파일 골격 모음
  - `patterns/<id>/` — 코드베이스에서 발굴한 패턴
- 카탈로그 색인은 `.claude/templates/index.json` 한 곳에만 둔다.

## index.json 스키마 (정본: `templates/index.schema.json`)

각 템플릿 항목의 필수 필드:

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string (`^[a-z0-9-]+$`) | 고유 식별자 |
| `pathPatterns` | string[] | 이 템플릿이 적용되는 대상 경로 글롭 (예: `**/*Controller.java`) |
| `description` | string | 한 줄 설명 |
| `path` | string | `scaffolds/` 또는 `patterns/` 하위 상대 경로 |
| `metadata` | object | (선택) 스택·태그 등 |

`pathPatterns` 글롭 규약: `**/`(0개 이상 디렉터리), `**`(임의), `*`(슬래시 제외 단일 세그먼트).

## 플레이스홀더 표기

- 치환 토큰은 `{{PascalCase}}` 형식 (예: `{{ModuleName}}`, `{{tableName}}`).
- 토큰 목록과 의미는 각 스캘폴드 폴더의 `README.md` 에 표로 명시한다.

## 파일 네이밍

- 스캘폴드 폴더명 = 템플릿 `id`.
- 골격 파일은 대상 확장자를 그대로 쓰되 토큰을 파일명에도 사용 가능 (예: `{{ModuleName}}Controller.java`).

## 검토 체크리스트 (review 모드)

- [ ] index.json 이 스키마를 통과하는가
- [ ] 모든 `path` 가 실제 존재하는 폴더를 가리키는가
- [ ] `pathPatterns` 가 의도한 경로만 매칭하는가 (과매칭 금지)
- [ ] 플레이스홀더 토큰이 스캘폴드 README 와 일치하는가
