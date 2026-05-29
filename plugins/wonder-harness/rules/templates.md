---
title: 템플릿 작성 메타 규칙
owner: ruler
applies-to: templater
stack: Spring Boot + MyBatis(SP) + Thymeleaf + Kendo
---

# 템플릿 작성 메타 규칙

> 관련 규칙: `${CLAUDE_PLUGIN_ROOT}/rules/backend.md` · `${CLAUDE_PLUGIN_ROOT}/rules/frontend.md` · `${CLAUDE_PLUGIN_ROOT}/rules/security.md`
> 템플릿 위치(프로젝트 소유): `.claude/templates/`

본 문서는 **템플릿 작성자(templater)를 위한 메타 규칙**이다. 다른 규칙 문서가 명령형 텍스트만 유지하는 것과 달리, 본 문서는 치환 테이블 주석·섹션 구분 주석 등 템플릿 형식 예시를 코드 블록으로 보존한다.

## 핵심 원칙

**복붙 후 변수만 교체하면 즉시 동작해야 한다.**

- 치환 테이블만 보고 전체를 교체할 수 있을 것 — 코드 구조 이해 없이도 완성 가능.
- import·어노테이션·URL 패턴·메서드 시그니처까지 완결된 형태로 제공.
- TODO 주석·미완성 블록 금지 — 치환 전 상태 그대로 문법 오류 없어야 함.

---

## 토큰 규약 (정본)

치환이 필요한 부분은 위치에 따라 아래 표기만 사용한다. **식별자 자리는 `Xxx`/`xxx`, 문자열·경로 자리는 `{module}`/`{domainName}` — 혼용 금지.**

| 표기 | 위치 | 예시 |
|---|---|---|
| `{module}` | 모듈코드 소문자 2자 (패키지·URL·문자열) | `wo`, `eq`, `inv` |
| `{domainName}` | camelCase 도메인 (URL·파일명·문자열) | `woWorkShift` |
| `Xxx` | 클래스 PascalCase 접두사 (식별자) | `WoWorkShift` |
| `xxx` | 변수 camelCase 접두사 (식별자) | `woWorkShift` |
| `{gridId}` | 그리드 요소 ID (HTML/JS) | `wsmErpWoWorkShiftGrid` |
| `{Entity}` | 엔티티명 PascalCase (HTML/JS) | `WoWorkShift` |
| `{author}` · `{date}` | Javadoc | `홍길동` · `2026-05-29` |

---

## 치환 테이블 주석 [필수 — 모든 템플릿 상단]

파일 최상단 주석에 치환 테이블을 반드시 포함한다.

### Java

```java
// ============================================================
// [패턴] {패턴명}
//
// 치환 테이블:
//   {module}     → 모듈 코드 (소문자 2자)    예) wo
//   {domainName} → 도메인명 (camelCase)      예) woWorkShift
//   Xxx          → 클래스 접두사 (PascalCase) 예) WoWorkShift
//   xxx          → 변수명 접두사 (camelCase)  예) woWorkShift
//   {author}     → 작성자명
//   {date}       → 작성일 (YYYY-MM-DD)
//
// 사용 시나리오:
//   - {이 패턴이 적합한 상황}
//
// 실제 사례: WoWorkShift, EqEquipmentMaster, PoCurrencies
// ============================================================
```

### HTML

```html
<!-- ============================================================
  패턴: {패턴명}
  치환 테이블:
    {module}     → 모듈 코드       예) wo
    {domainName} → 도메인명        예) woWorkShift
    {gridId}     → 그리드 ID       예) wsmErpWoWorkShiftGrid
  실제 사례: woWorkShift, eqEquipmentMaster
============================================================ -->
```

### JS

```javascript
// ============================================================
// 패턴: {패턴명}
// 치환 테이블:
//   {gridId}     → 그리드 요소 ID   예) wsmErpWoWorkShiftGrid
//   {domainName} → 변수명 접두사    예) woWorkShift
//   {module}     → URL 모듈 경로    예) wo
//   {Entity}     → 엔티티명         예) WoWorkShift
// 실제 사례: woWorkShift, eqEquipmentMaster, poCurrencies
// ============================================================
```

---

## 섹션 구분 주석 [필수]

### Java

```java
// ── 조회 ──────────────────────────────────────────────────────

// ── CUD ───────────────────────────────────────────────────────

// ── 팝업 ──────────────────────────────────────────────────────
```

### HTML

```html
<!-- ===================== 검색 조건 ===================== -->

<!-- ===================== 그리드 ======================== -->
```

### JS

```javascript
// ── 1. 그리드 초기화 ──────────────────────────────────────────
// ── 2. 문서 준비 ──────────────────────────────────────────────
// ── 3. 조회 ───────────────────────────────────────────────────
// ── 4. 저장 ───────────────────────────────────────────────────
// ── 5. 행 추가 / 삭제 ─────────────────────────────────────────
```

---

## 레이어별 템플릿 규칙

- **Java**: 패키지 선언부터 클래스 닫는 `}` 까지 완전한 파일. import 와일드카드 `*` 금지, `@Autowired` 주입(생성자 주입 혼용 금지). 변형 패턴은 `// [변형] ...` 주석 블록으로 추가.
- **HTML**: `layout:fragment="Content"` 내부만 작성(`<html>`·`<head>` 포함 금지). searchForm hidden·버튼 권한·CSS 클래스는 각 규칙(정본)을 따른다 — `${CLAUDE_PLUGIN_ROOT}/rules/frontend.md`, `${CLAUDE_PLUGIN_ROOT}/rules/security.md`.
- **JS**: `$(document).ready()` 포함 완전한 파일. `changesData` 배열 변환 + `updatedRows` 에서 `deletedRows` 필터, fetch 응답 `res.ok` 체크, 전역 변수(`CONTEXT_PATH`·`COMMON_MESSAGES`) 재선언 금지.

---

## 카탈로그 — 단일 index.json (정본)

카탈로그 정본은 `.claude/templates/index.json` **한 곳**이다(스키마: `${CLAUDE_PLUGIN_ROOT}/templates/index.schema.json`, draft-07). templater 가 실사용 중 항목을 축적하며, 빈 시드에서 시작한다.

각 템플릿 항목의 필드:

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | string (`^[a-z0-9-]+$`) | 고유 식별자 |
| `pathPatterns` | string[] (minItems 1) | 이 템플릿이 적용되는 대상 경로 글롭 (예: `**/*Controller.java`) |
| `description` | string | 한 줄 설명 |
| `path` | string | `scaffolds/` 또는 `patterns/` 하위 상대 경로 |
| `metadata` | object | (선택) 스택·태그 등 |

- `pathPatterns` 글롭 규약: `**/`(0개 이상 디렉터리), `**`(임의), `*`(슬래시 제외 단일 세그먼트).
- `index.json` 의 Read 가 enforce-template 훅의 탐색 마커를 설정한다 — 탐색 없이 매칭 경로에 `Write`/`Edit` 시 차단.

---

## INDEX.md 작성 규칙

각 템플릿 디렉터리의 `INDEX.md`(사람이 읽는 패턴 인덱스)는 아래 구조를 따른다.

```markdown
# {레이어} 템플릿 인덱스

## 패턴 선택 기준

| 파일명 | 조건1 | 조건2 | 조건3 |
|--------|:-----:|:-----:|:-----:|
| pattern-a | ✓ | ✗ | ✓ |

---

## 파일별 상세

### {파일명}
- **사용**: {언제 쓰는지 한 줄}
- **실사례**: {실제 도메인 3개 이상}
- (레이어별 추가 항목 — 아래 표 참조)
```

### 레이어별 추가 항목

| 레이어 | 공통(필수) | 레이어별 추가 항목 |
|--------|----------|---------------------|
| Controller | 사용, 실사례 | `엔드포인트`(메서드·경로·반환 타입) |
| Service | 사용, 실사례 | `메서드`, `규칙`(트랜잭션·처리 순서) |
| Mapper | 사용, 실사례 | `메서드 목록`(select / count / cud) |
| Form | 사용, 실사례 | `필드 구성`(rows 종류·검색 조건) |
| DTO | 사용, 실사례 | `필드 그룹`, `@JsonIgnore 대상` |
| HTML | 사용, 실사례 | `구조`, `특징`(레이아웃 유형) |
| JS | 사용, 실사례 | `섹션`(1.초기화 / 2.조회 / 3.저장 ...) |

- 패턴 선택 기준 표 필수 — 한눈에 파일 선택 가능해야 함.
- 실사례는 실제 존재하는 도메인명으로만 기재(가상 이름 금지).
- INDEX.md 는 규칙 문서가 아니라 AI 코드 작성을 위한 참고 문서다 — 본 메타 규칙은 표준 최소치이며 레이어별로 더 자세한 항목을 추가할 수 있다.

---

## 검증 체크리스트

신규 템플릿 작성 완료 후 반드시 확인:

- [ ] 치환 테이블이 파일 상단 주석에 포함되어 있다
- [ ] 치환 테이블의 모든 변수가 코드 본문에 실제로 사용된다
- [ ] 치환 전 상태에서 문법 오류가 없다 (Java: 컴파일, HTML: 태그 닫힘, JS: 괄호 매칭)
- [ ] 실제 사례 도메인이 3개 이상 명시되어 있다
- [ ] 섹션 구분 주석이 포함되어 있다
- [ ] 미완성 로직(TODO, 빈 메서드 본문)이 없다
- [ ] `index.json` 에 항목이 추가되어 있다(스키마 통과, `path` 실재, `pathPatterns` 과매칭 없음)
