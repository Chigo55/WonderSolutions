# wonder-harness 사양서 (Specification) v0.3.0

> **이 문서는 개선 완료 후 플러그인의 정본 사양이다.** "무엇을 할지(계획)"가 아니라 "플러그인이 무엇인지(계약·규약·구조)"를 규정한다.
> 변경 이력 / 작업 목록은 `wonder-harness-improvement-plan.md` 참조.

---

## 1. 개요

wonder-harness 는 **Spring Boot + MyBatis(SP) + Thymeleaf + Kendo** 스택의 도메인/화면 개발을 오케스트레이션하는 Claude Code 플러그인이다.

- **역할**: 요청 → 계획 → 템플릿 탐색·축적 → 코드 구현 → 규칙 검증의 4단계 파이프라인 하네스
- **정체성**: 재사용 가능한 *메커니즘 + 회사표준 규칙*. 특정 프로젝트의 복제본이 아니다
- **대상 스택**: Java 17 / Spring Boot 3.x / MyBatis(SQL Server 저장프로시저) / Thymeleaf / Kendo UI 웹컴포넌트 / Bootstrap 5 / ES6

### 1.1 책임 경계

| 영역 | 소유 | 런타임 위치 |
|---|---|---|
| 규칙(rules) | 플러그인 | `${CLAUDE_PLUGIN_ROOT}/rules/` |
| 메커니즘(agents·hooks·commands·schema·requests) | 플러그인 | `${CLAUDE_PLUGIN_ROOT}/` |
| 실 템플릿(scaffold 파일·카탈로그) | 프로젝트 | `.claude/templates/` |

> 플러그인은 규칙과 메커니즘을 *제시*하고, 템플릿은 프로젝트가 사용 중 *축적*한다.

---

## 2. 디렉터리 구조

```
plugins/wonder-harness/
├── .claude-plugin/plugin.json     # 매니페스트 (version 0.3.0)
├── commands/
│   ├── wh-create.md               # 신규 모듈 생성 파이프라인
│   ├── wh-modify.md               # 기존 모듈 수정 파이프라인
│   └── wh-review.md               # 단일 에이전트 리뷰
├── agents/
│   ├── planner.md                 # 요청→모듈 분해·의존성·위험
│   ├── templater.md               # 템플릿 탐색·생성·카탈로그 유지
│   ├── developer.md               # 코드 구현
│   └── ruler.md                   # 규칙 소유·검증
├── hooks/
│   ├── hooks.json                 # PreToolUse(Write|Edit), PostToolUse(Read)
│   └── scripts/
│       ├── enforce-template.js    # 템플릿 미탐색 시 Write/Edit deny
│       ├── mark-template-read.js  # index.json Read 시 세션 마커 설정
│       └── lib/{glob,index-match,decide,marker}.js
├── rules/
│   ├── backend.md                 # Controller→Service→Mapper, SP-only, DTO/Form
│   ├── frontend.md                # Thymeleaf+Kendo+ES6
│   ├── security.md                # 재고 무결성·권한·파일
│   ├── workflow.md                # 도메인 네이밍·탐색 순서·레이블
│   └── templates.md               # 템플릿 작성 메타규칙(토큰·치환표·INDEX)
├── templates/
│   ├── index.schema.json          # 카탈로그 JSON Schema (draft-07)
│   ├── index.seed.json            # 빈 시드 { "version":1, "templates":[] }
│   └── scaffolds/                 # 비어있음 (.gitkeep) — 플러그인은 템플릿을 굽지 않음
├── requests/
│   ├── create_request.md          # 생성 요청 양식 시드
│   └── modify_request.md          # 수정 요청 양식 시드
└── skills/
    ├── grill-me/SKILL.md
    ├── handoff/SKILL.md
    └── write-a-skill/SKILL.md
```

---

## 3. 파이프라인 계약

### 3.1 `/wh-create`
- **입력**: `.claude/requests/create_request.md` (필수 섹션: `## 목표`·`## 범위`·`## 제약`·`## 수용 기준` 모두 작성)
- **흐름**: planner(create) → templater(create) → developer(create) → ruler(review)
- **출력**: 단계별 요약 + 규칙 검증 보고

### 3.2 `/wh-modify`
- **입력**: `.claude/requests/modify_request.md` (필수: `## 대상`·`## 변경 내용`·`## 영향 범위`·`## 수용 기준`)
- **흐름**: planner(modify) → templater(modify) → developer(modify) → ruler(review)

### 3.3 `/wh-review`
- **입력**: 코드 경로/설명
- **라우팅**: `.java`/`.kt` → developer · `.html`/`.js` → developer · `.claude/templates/**` → templater · `rules/**` → ruler

### 3.4 에이전트 계약

| 에이전트 | 입력 | 산출 | 도구 |
|---|---|---|---|
| **planner** | 요청 문서 | 모듈 분해·파일 경로·의존 순서·위험 (YAGNI, 모호점 표시) | Read·Grep·Glob·Write |
| **templater** | 계획 | 프로젝트 `index.json` 갱신(pathPatterns+경로), 토큰 규약 준수 템플릿 | Read·Grep·Glob·Write·Edit |
| **developer** | 계획+템플릿+규칙 | 코드 생성/수정 (규칙 준수) | Read·Grep·Glob·Write·Edit·Bash |
| **ruler** | developer 산출 | 규칙 5종 검증 보고(위반·개선) | Read·Grep·Glob·Write·Edit |

- developer 시작 시: 플러그인 루트 규칙 로드 + 프로젝트 `index.json` 탐색
- templater 시작 시: `index.json` 없으면 `index.seed.json` 복사로 부트스트랩

---

## 4. 토큰 규약 (templates.md 정본)

| 표기 | 위치 | 예시 |
|---|---|---|
| `{module}` | 모듈코드 소문자 2자 (패키지·URL·문자열) | `wo`, `eq`, `inv` |
| `{domainName}` | camelCase 도메인 (URL·파일명·문자열) | `woWorkShift` |
| `Xxx` | 클래스 PascalCase 접두사 (식별자) | `WoWorkShift` |
| `xxx` | 변수 camelCase 접두사 (식별자) | `woWorkShift` |
| `{gridId}` | 그리드 요소 ID (HTML/JS) | `wsmErpWoWorkShiftGrid` |
| `{Entity}` | 엔티티명 PascalCase (HTML/JS) | `WoWorkShift` |
| `{author}`·`{date}` | Javadoc | `홍길동`·`2026-05-29` |

- **혼용 금지**: 식별자 자리는 `Xxx`/`xxx`, 문자열·경로 자리는 `{module}`/`{domainName}`
- 모든 템플릿 상단에 **치환 테이블 주석** 필수, **섹션 구분 주석** 필수
- 치환 전 상태에서 문법 오류 없어야 함 (복붙→변수교체→즉시 동작)

---

## 5. 규칙 사양 (ruler 소유)

### 5.1 backend.md
- **레이어**: Controller → Service → **Mapper** (단방향). 도메인 = 5 Java 파일
- **패키지**: `io.boot.wonder.web...`
- **Mapper**: SP-only `@Select("EXEC dbo.SP_{MODULE}_{DOMAIN}_{ACTION} ...")`. `@Insert/@Update/@Delete` 금지. CUD에만 `@Options(statementType=CALLABLE)`. SELECT/COUNT은 `@Param` 명시
- **DTO**: `BaseDTO` 상속(7 공통필드), `@GridSetup(gridName)`(grid id 일치), `loginUserSeq`는 `@JsonIgnore`
- **Form**: `createdRows`/`updatedRows`/`deletedRows` + 검색조건, Detail은 `detail*` 접두사
- **Service-조회**: `PageImpl`, `@Transactional` 금지
- **Service-CUD**: `@Transactional` 필수, **delete→insert→update**, rows null/empty 체크, errorCode `"E"`→`ApplicationException`, `loginUserSeq`는 `SecurityUtils`로 1회 획득
- **Controller**: 페이지=String(@ResponseBody 없음) / 목록=`Page<DTO>` / CUD=`SuccessVO` / 파일=`@PostMapping` 외 `@PutMapping`

### 5.2 frontend.md
- **스택**: Thymeleaf + Kendo 웹컴포넌트(`is="kendo-grid"`) + ES6 모듈
- **파일**: JS `static/assets/js/front/wsmErp/{module}/{domainName}.js`, HTML `templates/pages/wsmErp/{module}/{domainName}.html`, 1:1 camelCase
- **그리드 ID**: `wsmErp{Module}{Domain}{Role}` / APS는 `aps{Domain}{Role}`, 접미사 `Master/Detail/Attach Grid`. `@GridSetup`과 일치
- **searchForm 4 hidden**: `corporationId·userSeq·isGridEditUse·locale`
- **changesData**: Map→배열, `updatedRows`에서 `deletedRows.uid` 필터링(이중처리 방지)
- **저장 순서**: `closeCell()`→`isModified()`→검증→`fetch`(res.ok)
- *위젯 버전 종속 gotcha는 규칙이 아니라 프로젝트 축적 템플릿 인라인 주석을 정본으로 한다*

### 5.3 security.md
- **재고 무결성**: 수량 변경은 SP로만, errorCode `"E"`→즉시 throw, 다중 테이블은 단일 SP/단일 트랜잭션
- **권한**: Controller CUD마다 `SecurityUtils.hasMenuRoleType(menuId,type)`, Thymeleaf 버튼 `th:if`. 매핑: SELECT/INSERT/UPDATE/DELETE/EXPORT/PRINT/UPLOAD
- **고정 유틸**(재구현 금지): `SecurityUtils·MessageUtils·CommonUtils·FileUtils`, 예외 `ApplicationException`
- **파일**: `FileUtils.saveFile(...)`, 확장자 검증 내부, traversal 차단
- MyBatis `#{}` 바인딩, createdBy 서버 설정, th:utext XSS 주의, 오류메시지 비노출

### 5.4 workflow.md
- 도메인 네이밍: 모듈코드(2자) + camelCase → PascalCase 클래스, 전 파일·URL 일관
- 구현 전 템플릿 탐색 필수 (enforce-template 훅의 규범 근거)
- DB 레이블 등록: `${@messageUtils.getMessage('key')}`는 DB 저장(properties 아님), 사용자 영역

### 5.5 templates.md
- §4 토큰 규약 + 치환 테이블/섹션 주석 포맷 + INDEX.md 작성 규칙 + 검증 체크리스트
- 단일 `index.json`(pathPatterns, `index.schema.json` 준수)이 카탈로그 정본임을 규정

---

## 6. 템플릿 카탈로그 & 훅 사양

### 6.1 카탈로그 (`.claude/templates/index.json` — 프로젝트 소유)
```json
{
  "version": 1,
  "templates": [
    {
      "id": "kebab-case-id",
      "pathPatterns": ["**/*Controller.java", "**/pages/**/*.html"],
      "description": "한 줄 설명",
      "path": "상대경로",
      "metadata": { "stack": "...", "tags": [] }
    }
  ]
}
```
- `index.schema.json`(draft-07)으로 검증. 필수: `version`(const 1)·`templates[].{id,pathPatterns,description,path}`
- templater가 실사용 중 항목을 **축적**. 빈 시드에서 시작

### 6.2 글롭 규약
`**/` = 0+ 디렉터리 · `**` = 임의 · `*` = 슬래시 없는 단일 세그먼트 (외부 의존 없는 경량 변환)

### 6.3 훅 동작
| 이벤트 | 스크립트 | 동작 |
|---|---|---|
| PostToolUse `Read` | `mark-template-read.js` | `index.json` Read 감지 시 세션 마커 설정(OS temp) |
| PreToolUse `Write\|Edit` | `enforce-template.js` | 대상이 `pathPatterns`에 매치 **AND** 마커 없음 → `permissionDecision:"deny"` |

- 빈 카탈로그 → 매치 없음 → 허용적. 패턴 축적 시 "탐색 강제" 발효
- 경량 JS(Node.js built-in만), 오류 시 fail-silent

---

## 7. 요청 양식 사양

### create_request.md
`## 목표` · `## 범위` · `## 제약` · `## 수용 기준` — 4 섹션 모두 작성 필수(주석/공란 불가)

### modify_request.md
`## 대상` · `## 변경 내용` · `## 영향 범위` · `## 수용 기준` — 4 섹션 모두 작성 필수

---

## 8. 버전·메타 규약

- `plugin.json` ↔ `marketplace.json` version 동기화 (현 0.3.0)
- 커밋: `feat/fix:` 변경 커밋 → 별도 `chore: bump version to x.x.x`
- 플러그인 경로는 모두 `./` 상대 경로, 외부 파일 참조 금지
- 훅은 기본 non-blocking (예외: enforce-template는 deny)

---

## 9. 비범위 (Non-goals)

- 플러그인에 템플릿 파일을 굽지 않는다
- 프로젝트에 플러그인 전량을 시딩하지 않는다 (`wh-init` 없음)
- 위젯 버전 종속 gotcha를 규칙에 박제하지 않는다
- 분석 입력 `raw/.claude/`를 수정하지 않는다
