---
title: Security Authoring Meta-Rules
owner: ruler
applies-to: ruler
stack: stack-agnostic
---

# Security Authoring Meta-Rules

> Related meta-rules: `.codex/wonder/meta-rules/structure.md` · `.codex/wonder/meta-rules/workflow.md`
> Generated output location: `.codex/wonder/rules/security.md`

본 문서는 **규칙 작성자(ruler)**를 위한 메타 규칙입니다. 대상 프로젝트의 구조나 언어에 관계없이 보안 경계, 입력 신뢰성 및 데이터 보호 정책에 대해 일관성 있는 보안 규칙을 제정하도록 가이드라인을 정의합니다.

## Core Principle

**생성된 보안 규칙은 신뢰할 수 없는 외부 경계(입력, 파일, 네트워크 등)와의 접점을 식별하고, 비정상적인 실행 및 권한 오용을 예방하기 위한 비타협적인 제약사항을 제정해야 합니다.**

- 보안 규칙은 권장사항이 아닌 강력한 제약(must/forbidden)이어야 합니다.
- 개발자가 임의로 예외 처리를 누락하거나 보안 도구를 오용하지 않도록 구체적인 API 사용 가이드를 제공합니다.
- 특정 웹 프레임워크나 DB 모델링에 국한되지 않고, 독립형 앱이나 실험용 스크립트에서도 동작할 수 있는 보안 기조를 보장합니다.

---

## Required Sections

생성되는 `.codex/wonder/rules/security.md` 프로젝트 규칙 파일은 반드시 아래의 섹션을 포함해야 합니다:

| Section | Content |
|---------|---------|
| Data & State Access Integrity | 상태 데이터(DB, JSON 파일 등)에 접근하고 수정할 수 있는 정형화된 유일 경로 및 격리 규칙 |
| Trust Boundaries & Input Validation | 외부 매개변수(CLI 플래그, 웹 요청 body, 환경 변수 등)의 윈도우/경로 구분자 처리 및 입력 검증 규칙 |
| Execution Context & Resource Control | 실행 중인 권한 컨텍스트(사용자 정보, IAM 역할, 프로세스 권한 등) 확인 및 OS 파일/네트워크 리소스 차단/허용 가이드 |
| Common Security Utilities | 무단 재구현을 금지하고 반드시 활용해야 하는 공통 보안 유틸리티 모음 |
| Sensitive Data Handling | 소스코드 내 하드코딩 금지 대상(API Key, 개인정보) 식별 및 메모리/네트웍 누출 방지 규칙 |
| Error & Log Safety | 에러 발생 시 외부로 노출 가능한 메시지의 한계 및 원시 에러(Stack trace 등) 로깅/반환 차단 정책 |
| Code Security Checklist | 코드 리뷰 시 즉각 검증 가능한 이진(Binary) 보안 체크리스트 |

---

## Exploration Guide

ruler 에이전트는 프로젝트를 스캔하여 보안 정책을 도출할 때 다음 가이드를 준수합니다:

### Data & State Access Integrity
- 파일 쓰기 모듈, DB 드라이버, ORM 라이브러리를 탐색합니다.
- 데이터 갱신 시 트랜잭션 단위나 파일 락, 임시 파일 교체 기법이 활용되는지 식별합니다.

### Trust Boundaries & Input Validation
- 입력값을 검증하는 정규식이나 스키마 밸리데이터(Zod, Pydantic, Bean Validation 등)의 존재를 식별합니다.
- 사용자 입력을 외부 쿼리나 쉘 커맨드에 전달하기 전 이스케이프 또는 바인딩 처리 방식을 발견합니다.

### Execution Context & Resource Control
- 세션 객체, JWT 파서, 프로세스 UID 확인부, 혹은 OS 권한 체크 함수를 식별합니다.
- 파일 접근 시 상대 경로 및 `..` 문자열을 방어적으로 정규화하는 코드를 찾아냅니다.

---

## Reference Examples for Ruler

### Archetype A: Single Script / CLI tool (Zero-Dependency)
*CLI 도구나 백그라운드 훅 스크립트에서 활용되는 보안 규칙 템플릿입니다.*

#### Data & State Access Integrity
- 모든 데이터 상태 변화는 단일 로컬 상태 파일(예: `.codex/wonder/<tool>-state.json`)에 국한하며, immutable spread로 새 객체를 만든 뒤 임시 파일 생성 후 원자적 교체(`fs.renameSync`)로 작성해야 함. 직접적인 파일 스트림 쓰기는 금지됨.

#### Trust Boundaries & Input Validation
- 훅 인풋으로 들어오는 `file_path` 값에 역슬래시(`\`)가 포함되어 있을 경우, 분석 전에 반드시 `/`로 치환하는 `normalize()` 처리를 우선 적용해야 함.
- JSON 파싱 예외로 인한 비정상 종료를 방지하기 위해 `JSON.parse`는 반드시 try/catch로 감싸고, 실패 시에는 기본값(`{}`)을 사용해 복구함.

#### Execution Context & Resource Control
- 외부 프로세스 실행(Exec)은 절대 금지함. 시스템 커맨드 조작을 방지하기 위해 `child_process` 내장 모듈의 사용을 금지함.
- 환경 변수 `CLAUDE_PLUGIN_ROOT` 및 `input.cwd` 이외의 디렉토리에 대한 쓰기 권한은 부여되지 않으며, 파일 접근 시 반드시 `path.resolve`를 사용해 해당 Cwd 하위에 존재함을 검증해야 함.

#### Error & Log Safety
- 에러 로깅은 절대 `stdout`에 출력해서는 안 됨(stdout은 플러그인의 실행 결과 규격 통로임). 진단 및 에러 메시지는 오직 `stderr` 또는 `console.error`로만 출력해야 함.

---

### Archetype B: Web API (Rest Server)
*사용자 계정 및 네트워크 세션을 관리하는 웹 애플리케이션 보안 규칙 템플릿입니다.*

#### Data & State Access Integrity
- 모든 영속성 변경 작업은 ORM 데이터 모델 및 선언된 트랜잭션 범위 내에서 이루어져야 하며, 쿼리 직접 작성을 통한 데이터 변조는 금지됨.

#### Trust Boundaries & Input Validation
- 외부에서 전송된 JSON 바디는 라우터 진입부에서 Validation Annotation 또는 Pydantic 스펙에 의해 1차 차단 및 필터링되어야 함.
- 쿼리 인자는 절대 문자열 템플릿에 직접 주입하지 않으며, SQL Injection 방지를 위해 바인딩 파라미터(`#{...}` 등)만을 사용해야 함.

#### Execution Context & Resource Control
- 사용자의 세션 식별은 클라이언트가 제출하는 ID 필드를 맹신하지 않고, 복호화된 토큰(JWT) 내의 context 정보를 세션 저장소나 보안 Context(SecurityContextHolder 등)를 통해 획득하여 식별함.

---

## Validation Checklist for Ruler

보안 규칙 생성 완료 후 ruler는 다음 사항을 최종 점검합니다:

- [ ] 웹 취약점에 국한되지 않고, 로컬 시스템 권한 오용이나 프로세스 크래시 유발 방지 가이드가 기술되었는가?
- [ ] 입력값의 normalization(경로 포맷, 인코딩) 처리 방식이 구체적으로 명시되었는가?
- [ ] 에러 스택 트레이스 노출 방지 및 로깅 채널(stdout/stderr 등) 한정 방식이 작성되었는가?
- [ ] 생성된 모든 규칙이 권장(should)이 아닌 강제(must/forbidden) 형태로 명문화되어 있는가?

