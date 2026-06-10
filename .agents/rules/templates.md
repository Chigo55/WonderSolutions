---
description: "Template Catalog Meta-Rules"
activation: "always"
title: "Template Catalog Meta-Rules"
owner: "templater"
applies-to: "templater"
plugin: "wonder-utilities"
stack: "stack-agnostic"
---

# Template Catalog Meta-Rules

> Related meta-rules: `${CLAUDE_PLUGIN_ROOT}/rules/security.md`
> Plugin: wonder-utilities (WonderSolutions suite)
> Generated output location: `.claude/rules/templates.md`

본 문서는 **템플릿 관리자(templater)**를 위한 메타 규칙입니다. 대상 프로젝트의 유형(단독 앱, 웹, CLI, 실험 스크립트 등)에 맞추어 코드 재사용성 및 템플릿 카탈로그를 정의하고 유효성을 검증하는 기준을 규정합니다.

## Core Principle

**생성된 템플릿 규칙은 카탈로그 내의 재사용 패턴을 신속하게 식별하여 개발 프로세스에 적용 가능한 상태로 만드는 유도 장치여야 합니다.**

- **재사용 자산의 다양화**: 소스코드 블록에 국한하지 않고, 구성 설정(YAML, JSON), 도커 파일, 쉘 스크립트, 단위 테스트 기본 골격 등 반복되는 모든 정적인 형태의 텍스트 파일을 템플릿의 범위에 포함합니다.
- **규모에 맞는 가변 조건**: 대형 엔터프라이즈 프로젝트와 소규모 실험용 1파일 스크립트의 성격에 따라 템플릿 승격(Promotion)의 정량 임계치를 유동적으로 조절합니다.
- **명확한 네이밍 슬러그**: 언어적 특성을 고려한 일관성 있는 플레이스홀더 및 파일명 규칙을 제공합니다.

---

## Required Sections

생성되는 `.claude/rules/templates.md` 파일은 반드시 아래의 필수 섹션을 포함해야 합니다:

| Section | Content |
|---------|---------|
| Catalog Summary | 현재 `index.json`에 정의되어 가용 가능한 전체 템플릿 목록과 적용 가능한 구체적 상황 명세 |
| Naming & Placeholder Conventions | 플레이스홀더 표기법(예: `{{Placeholder}}`) 및 파일 네이밍(Slug) 정책 |
| Promotion Criteria | 새로운 패턴 발견 시 템플릿으로 승격시키기 위한 정량적(반복 횟수 등) 및 정성적(추상화 수준 등) 규칙 |
| Template Format | 개별 템플릿 파일이 구성해야 하는 스펙(Context / Pattern / Notes) 및 소스 길이 제한 |
| Un-promoted Candidates | 작업 문서(`work-doc.md`) 등에서 후보로 지목되었으나 아직 승격(Promote) 처리되지 않은 대기 리스트 |
| Review Checklist | 개발 시 기존 템플릿을 참조했는지, 신규 후보를 올바르게 발굴했는지 점검하는 체크리스트 |

---

## Exploration Guide

templater 에이전트는 프로젝트를 탐색할 때 다음 가이드를 준수합니다:

### Catalog Summary
- `${CLAUDE_PLUGIN_ROOT}/templates/index.json` (wonder-utilities 글로벌 카탈로그) 및 `<cwd>/.claude/templates/index.json` (로컬 카탈로그, 선택적) 파일을 분석하여 등록되어 있는 템플릿 명세(id, tags, description)를 로드합니다.

### Naming & Placeholder Conventions
- 등록된 템플릿들의 placeholder 스타일(CamelCase, SNAKE_CASE, PascalCase 등)과 파일 네이밍 규격을 추출합니다.

### Promotion Criteria
- 현재 활성화된 아키텍처의 규모를 식별하여 반복 임계값을 결정합니다:
  - *대규모 다중 파일 프로젝트*: 3개 이상의 개별 파일에서 유사 패턴 출현 시 승격.
  - *소규모/실험용 코드*: 2개 이상의 파일 또는 단일 파일 내에서 3번 이상 반복 시 승격 가능.

---

## Reference Examples for Templater

### Archetype A: CLI / Shell Plugin Hook Subsystem
*CLI 도구 또는 훅 서브시스템에 적용되는 가벼운 재사용 템플릿 룰 모델입니다.*

#### Naming & Placeholders
- **id**: `{layer}-{action-verb}` 형식의 kebab-case 명명 (예: `guard-stage`, `enforce-init`).
- **Placeholders**: PascalCase 형식 (`{{TargetLayer}}`, `{{HookEvent}}`).

#### Promotion Criteria
- 동일하거나 거의 유사한 I/O 처리 패턴(예: `process.stdin.on('data', ...)` 등)이 2개 이상의 서로 다른 스크립트 파일에서 발견될 때 즉시 템플릿 승격 대상으로 분류함.

---

### Archetype B: Web SPA Application (React + TypeScript)
*프론트엔드 컴포넌트나 상태 관리 패턴을 재사용하기 위한 룰 모델입니다.*

#### Naming & Placeholders
- **id**: `{framework}-{concept}` 형식 명명 (예: `react-custom-hook`, `next-api-envelope`).
- **Placeholders**: 컴포넌트 및 타입 레벨은 PascalCase (`{{ComponentName}}`), 일반 변수 및 객체 속성은 camelCase (`{{propertyName}}`).

#### Promotion Criteria
- 동일 라이브러리를 활용한 데이터 호출 혹은 UI 래퍼 컴포넌트 구현이 3개 이상의 개별 도메인 뷰 파일에서 중복 적용되는 경우 승격함. 단순 프레임워크 보일러플레이트는 제외함.

---

## Validation Checklist for Templater

템플릿 규칙 파일 `.claude/rules/templates.md` 작성이 끝난 후 templater는 다음 사항을 최종 대조합니다:

- [ ] 현재 실제 등록되어 있는 템플릿 목록이 누락 없이 요약되었는가?
- [ ] 프로젝트 스택의 성격에 적절하도록 플레이스홀더 및 템플릿 파일 명명법이 규정되었는가?
- [ ] 프로젝트 파일 규모를 고려하여 템플릿 후보 승격 조건(Threshold)이 정량적으로 명시되었는가?
- [ ] 템플릿 포맷 제약사항(길이 제한, 필수 메타 정보 구조 등)이 빠짐없이 적용되었는가?
- [ ] No contradictions with `/wsu-template` command behavior
