---
title: Structural Layering Meta-Rules
owner: ruler
applies-to: ruler
stack: stack-agnostic
---

# Structural Layering Meta-Rules

> Related meta-rules: `.codex/wonder/meta-rules/security.md` · `.codex/wonder/meta-rules/workflow.md`
> Generated output location: `.codex/wonder/rules/{layer}.md` (for each declared layer)

본 문서는 **규칙 작성자(ruler)**를 위한 메타 규칙입니다. 이 문서는 대상 프로젝트가 선언한 임의의 구조적 레이어(예: `core`, `interface`, `data` 등)에 대해 일관되고 명확한 규칙을 제정하는 기준과 도출 가이드라인을 정의합니다.

## Core Principle

**생성된 구조 규칙은 해당 레이어의 역할, 의존성 방향, 데이터 입출력 규격을 명확히 규정하여 개발자가 모호함 없이 해당 레이어의 코드를 작성할 수 있도록 기능해야 합니다.**

- **레이어 자율 선언**: 프로젝트의 구조적 복잡성(단일 스크립트, CLI, 웹 API, 복합 앱 등)에 맞추어 필요한 레이어를 선언하고 개별 룰(`.codex/wonder/rules/{layer}.md`)로 작성합니다.
- **철저한 발견 우선**: 지레짐작하지 않고, 프로젝트의 실제 디렉토리 구조와 코드 패턴을 발견하여 규정합니다.
- **스택 독립성**: 특정 언어나 라이브러리에 고착화되지 않고, 범용적인 구조적 속성(Interface, Domain logic, State/IO)으로 정의합니다.

---

## Required Sections

생성되는 모든 개별 레이어 규칙 파일(`.codex/wonder/rules/{layer}.md`)은 다음 필수 섹션을 포함해야 합니다:

| Section | Content |
|---------|---------|
| Layer Definition | 해당 레이어의 명확한 역할 정의 및 타 레이어와의 의존성 방향(허용/금지 대상 명시) |
| Entry-Points & I/O Contract | 레이어로 진입하는 진입점 형식(함수 시그니처, HTTP 엔드포인트 등) 및 데이터 교환 규격(불변 구조체, Envelope 등) |
| Core Logic & Side-Effects | 비즈니스 계산 로직(Pure functions)과 외부 효과(I/O, DB, Network)의 격리 수준 및 배치 원칙 |
| State & Persistence | 상태 보존 방식(메모리, JSON 파일, RDBMS, 외부 API 등) 및 동시성/원자성 관리 규칙 |
| Review Checklist | 개발자가 규정을 준수했는지 확인하기 위한 실질적 이진(Binary) 체크리스트 |

---

## Exploration Guide

ruler 에이전트는 프로젝트 코드를 탐색할 때 다음 가이드를 활용해 정보를 발견합니다:

### Layer Definition & Isolation
- 프로젝트 내 디렉토리 목록 및 패키지 선언(import/require 구문)을 스캔합니다.
- 계층 간 순환 참조(Circular Dependencies)가 발생하는 지점이 있는지 검사합니다.

### Entry-Points & I/O Contract
- 외부 신호를 접수하는 코드(예: CLI `process.argv` 처리기, 웹 프레임워크 라우터, 이벤트 훅 리스너)를 2–3개 열어 I/O 파싱 규칙을 추출합니다.
- 데이터를 구조화해서 반환하는 데이터 규격(DTO, Envelope, return object)의 공통 필드를 도출합니다.

### Core Logic & Side-Effects
- 비즈니스 연산 함수를 포함한 모듈을 확인하여, 해당 모듈이 전역 상태나 I/O 모듈을 직접 참조하는지 검사합니다.
- 순수 계산 영역과 부수 효과가 일어나는 영역의 분리 구현 패턴을 발견합니다.

### State & Persistence
- 영속성 관련 모듈(데이터베이스 연결부, 파일 쓰기 헬퍼, 로컬 스토리지 모듈)을 열어 데이터 트랜잭션 및 원자성 확보 방식을 파악합니다.

---

## Reference Examples for Ruler

ruler 에이전트는 규칙을 생성할 때 아래의 대조적인 아키타입(Archetype) 예시를 기준으로 품질을 검증합니다.

### Archetype A: CLI & Plugin Hook Subsystem (Zero-Dependency)
*제로 의존성 CLI/라이브러리 레이어(예: stdin 기반 스크립트, 무의존 헬퍼) 생성 시의 룰 모델입니다.*

#### Layer Definition
- 진입 스크립트(`bin/*.js` · `scripts/*.js`) -> 로직/가드 모듈(순수 함수) -> 상태·IO 모듈의 하향식 단방향 의존성 구조를 가짐. 역방향 import는 금지됨.
- 외부 라이브러리 의존성 추가 금지(Zero-dependency). Node.js 내장 모듈만 사용 가능.

#### Entry-Points & I/O Contract
- 진입점은 stdin 또는 CLI 인수에서 데이터를 읽어 `JSON.parse` / `process.argv`로 파싱하는 스크립트 형태임.
- 출력은 호출자와 합의된 단일 포맷(예: JSON 객체 또는 종료 코드)으로 한정하며, 정상 종료는 `process.exit(0)`, 실패 종료는 `process.exit(1)`을 사용해야 함.

#### Core Logic & Side-Effects
- 로직 모듈(순수 함수)은 I/O를 수행하지 않아야 함.
- 모든 I/O 작업은 진입 스크립트와 상태 모듈에 격리함.

#### State & Persistence
- 데이터 저장소는 단일 로컬 JSON 파일(예: `.codex/wonder/<tool>-state.json`)로 한정함.
- 쓰기 작업은 템플릿 임시 파일 생성 후 rename(`fs.renameSync`)하는 방식으로 원자성을 보장함.

---

### Archetype B: Modern Web API (SPA-Backend)
*FastAPI 또는 Node.js API 서버와 같은 전형적인 웹 서비스 백엔드 레이어 생성 시의 룰 모델입니다.*

#### Layer Definition
- 라우터 -> 컨트롤러 -> 비즈니스 서비스 -> 데이터 모델의 순차적 흐름을 유지함.
- 데이터 모델이 컨트롤러 레이어를 직접 호출하거나 상위 엔드포인트를 의존하는 것을 방지함.

#### Entry-Points & I/O Contract
- 모든 HTTP 엔트포인트는 REST 규격을 따르며, 응답 포맷은 `{ success: boolean, data: any, error: string }`으로 래핑함.
- 모든 API 요청 바디는 지정된 스키마(예: Pydantic, TypeScript Interface)로 정의되어 유효성 검증을 거침.

#### Core Logic & Side-Effects
- 비즈니스 서비스는 영속성 계층(ORM) 인터페이스를 통해서만 상태 변경을 일으키며, 컨트롤러의 HTTP Session 등 웹 전역 객체에 직접 의존하지 않음.

#### State & Persistence
- 영속 상태는 PostgreSQL 및 ORM(Prisma, SQLAlchemy 등)을 통해 관리함.
- 복수의 쓰기 작업이 일어나는 CUD 로직은 반드시 단일 데이터베이스 트랜잭션 범위 내에서 실행되어야 함.

---

## Validation Checklist for Ruler

개별 레이어 규칙 파일 `.codex/wonder/rules/{layer}.md` 작성이 완료된 후 ruler는 다음 사항을 검증합니다:

- [ ] 해당 레이어에 요구되는 5가지 필수 섹션이 모두 포함되어 있는가?
- [ ] 특정 스택의 프레임워크 편향(Spring, React 등) 없이, 해당 프로젝트의 실제 코드 패턴에 기반하여 속성이 기술되었는가?
- [ ] 레이어 간 의존성 방향(허용/차단 대상)이 텍스트 및 예제로 일목요연하게 명시되었는가?
- [ ] 리뷰용 이진 체크리스트(Actionable Review Checklist)가 구체적으로 기재되었는가?
