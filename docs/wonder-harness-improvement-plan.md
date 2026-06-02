# wonder-harness 개선 구현 명세 (Agent용)

> **목적**: `raw/` 의 검증된 WONDER 프로젝트 규칙을 플러그인에 **원칙 수준으로** 반영해, 플러그인을 그 스택에 바로 투입 가능하게 적합시킨다. 단 플러그인다움(재사용 하네스)을 유지한다.
>
> **이 문서는 실행 에이전트용 명세다.** 모든 결정은 grill 인터뷰(Q1–Q12)로 확정됨. 임의 변경 금지 — 변경 필요 시 사용자에게 확인.
>
> **분석 입력**: `raw/.claude/rules/{backend,frontend,security,workflow,templates}.md`, `raw/.claude/docs/templates/**`
> **대상**: `plugins/wonder-harness/**` (플러그인 자체)

---

## 0. 불변 경계 (가장 먼저 내면화할 것)

| 구분 | 소유 / 런타임 위치 | 규칙 |
|---|---|---|
| **규칙(rules)** | 플러그인 (`${CLAUDE_PLUGIN_ROOT}/rules/`) | 에이전트가 여기서 로드. 스택 정의·불변식·토큰 규약만. **위젯 버전 종속 gotcha 박제 금지** |
| **실 템플릿(scaffold 파일)** | 프로젝트 (`.claude/templates/` + `index.json`) | templater가 실사용 중 발견·생성해 축적. **플러그인은 템플릿 파일을 굽지 않는다** |
| **메커니즘** | 플러그인 | 에이전트 파이프라인·enforce 훅·카탈로그 스키마·커맨드·요청양식 |

- 정본의 의미 = **시드 원천 소유권**이지 런타임 독점이 아니다. 프로젝트는 자기 관례의 주인.
- `raw/.claude/` 는 **분석 입력일 뿐 수정 대상이 아니다.** 절대 건드리지 말 것.

---

## 1. 확정 결정 요약 (Q1–Q12)

1. **하이브리드** — 규칙·템플릿은 WONDER 스택 특화, 메커니즘은 범용
2. **플러그인 정본(완화)** — 프로젝트 로컬 오버라이드 허용, 규칙 파일은 편집 가능
3. 템플릿을 플러그인에 굽기 → **철회**, 프로젝트 축적으로 이동
4. **raw 토큰 규약 채택** — `{module}` `{domainName}` `Xxx`(PascalCase) `xxx`(camelCase) `{gridId}` `{Entity}` `{author}` `{date}`
5. **규칙=플러그인 / 템플릿=프로젝트** 분리
6. **단일 JSON 카탈로그**(`index.json`, pathPatterns 글롭) 정본
7. **규칙 5종** — backend·frontend·security·workflow·templates(메타). ruler 소유
8. **templater 자동 부트스트랩 + 빈 시드**, `wh-init` 미신설 — 테스트하며 축적
9. **포팅 깊이 = 원칙·불변·토큰규약만** 플러그인. 위젯 gotcha는 축적 템플릿 인라인 주석으로
10. **실사용 통합 검증** — `npm run validate` + 워크플로우 실관찰

토큰 규약 상세 (raw `templates.md` 정본 — 그대로 포팅):
- 식별자 자리 → `Xxx`(클래스 PascalCase) / `xxx`(변수 camelCase)
- 문자열·경로 자리 → `{module}` / `{domainName}`
- HTML·JS → `{gridId}` / `{Entity}` 추가
- 혼용 금지 (식별자 자리에 `{module}` 쓰지 말 것)

---

## 2. 작업: 규칙 5종 (`plugins/wonder-harness/rules/`)

> 공통 포팅 규칙
> - 출처: `raw/.claude/rules/*.md` 내용을 **원칙·불변·구조 수준으로** 흡수. 위젯 초세부 gotcha 제외(§2.6 참조).
> - **상호참조 정리**: 규칙↔규칙 = `${CLAUDE_PLUGIN_ROOT}/rules/<name>.md` / 규칙→템플릿 = 프로젝트 로컬 `.claude/templates/...` (또는 `.claude/docs/templates/...`).
> - 각 규칙 상단에 owner(ruler)·applies-to(developer/templater) 메타 유지.

### 2.1 `backend.md` (교정)
현행(Repository/JPA 가정)을 다음으로 교체:
- 레이어: Controller → Service → **Mapper** (Repository 아님). 도메인 단위 = **5 Java 파일**: `{Entity}Controller` / `service/{Entity}Service` / `mapper/{Entity}Mapper` / `dto/{Entity}DTO` / `form/{Entity}Form`
- 패키지 기준: `io.boot.wonder.web...` (현행 `com.wonderit` 제거)
- **Mapper = SP-only** — 모든 쿼리 `@Select("EXEC dbo.SP_{MODULE}_{DOMAIN}_{ACTION} ...")`. `@Insert`/`@Update`/`@Delete` **금지**. CUD에만 `@Options(statementType = StatementType.CALLABLE)`. SELECT/COUNT은 `@Param` 명시
- **DTO**: `BaseDTO` 상속(공통 7필드 `rowNo·createdBy·creationDate·lastUpdatedBy·lastUpdateDate·errorCode·errorMsg`), `@GridSetup(gridName)`(HTML grid id와 정확히 일치), `loginUserSeq`는 `@JsonIgnore`
- **Form**: `createdRows`/`updatedRows`/`deletedRows` + 검색조건. Detail 포함 시 `detail*` 접두사. Lombok 빌더
- **Service-조회**: `PageImpl`, `@Transactional` 금지
- **Service-CUD**: `@Transactional` 필수, **delete → insert → update 순서 고정**, rows null/empty 체크, **errorCode "E" → ApplicationException(자동 롤백)**, `loginUserSeq`는 `SecurityUtils.getPrincipal().getUserSeq()`로 1회 획득
- **Controller**: 페이지=String 반환(`@ResponseBody` 없음) / 목록=`Page<DTO>`(`@ResponseBody`) / CUD=`SuccessVO`(`@ResponseBody`) / 파일=`@PostMapping` 그 외 `@PutMapping`. 클래스 어노테이션 선택 기준표 포함
- SP 명명 형식은 *AI 추론용 참고*임을 명시(SP 자체는 사용자 관리)

### 2.2 `frontend.md` (교정)
현행(JSP/jQuery 가정)을 다음으로 교체:
- 스택: **Thymeleaf + Kendo UI 커스텀 웹컴포넌트(`is="kendo-grid"`) + ES6 모듈** + Bootstrap 5
- 파일: JS `static/assets/js/front/wsmErp/{module}/{domainName}.js`, HTML `templates/pages/wsmErp/{module}/{domainName}.html`, **1:1 camelCase 대응**, JS 로드는 `/js/front/...` 경로
- 그리드 ID 규약(정본): `wsmErp{Module}{Domain}{Role}` (APS는 `aps{Domain}{Role}`), 역할 접미사 `MasterGrid`/`DetailGrid`/`AttachGrid`. `@GridSetup(gridName)` 과 정확히 일치
- searchForm 필수 4 hidden: `corporationId·userSeq·isGridEditUse·locale`
- **changesData 직렬화 원칙**: 각 Map→배열 변환, **`updatedRows`에서 `deletedRows.uid` 필터링 필수**(이중처리 버그 방지)
- 저장 순서 원칙: `closeCell()` → `isModified()` → 검증 → `fetch`(res.ok 확인)
- 전역 변수(`CONTEXT_PATH`, `COMMON_MESSAGES.*`) 재선언 금지
- **제외(§2.6)**: MultiViewCalendar/datepicker `now="true"`/팝업 `var`/`kendo.toString` 등 위젯 초세부 — 플러그인 규칙에 넣지 말 것. "구체 패턴·gotcha는 프로젝트 축적 템플릿 인라인 주석을 따른다"고 *원칙만* 명시

### 2.3 `security.md` (교정)
- **재고 무결성[CRITICAL]**: 수량 변경은 SP(`EXEC dbo.SP_...`)로만. JPA/직접 SQL 금지. errorCode "E" → 즉시 throw. 다중 테이블 조정은 단일 SP/단일 `@Transactional`
- **트랜잭션**: public CUD `@Transactional`, delete→insert→update, "E" → 롤백
- **권한 검증**: Controller CUD마다 `SecurityUtils.hasMenuRoleType(menuId, type)`. Thymeleaf 버튼 `th:if="${@securityUtils.hasMenuRoleType(param.menuId,'INSERT')}"`. 권한↔액션 매핑표(SELECT/INSERT/UPDATE/DELETE/EXPORT/PRINT/UPLOAD)
- **고정 유틸**(재구현 금지): `SecurityUtils·MessageUtils·CommonUtils·FileUtils`, 예외 `ApplicationException`
- **파일 업로드**: `FileUtils.saveFile(file, GlobalConstants.FileSubPath.TEMP)`, 확장자 검증은 FileUtils 내부(`application.yml custom.file.allow-extensions`), traversal 차단
- 보안 체크리스트(MyBatis `#{}` 바인딩·createdBy 서버 설정·th:utext 주의·오류메시지 비노출)

### 2.4 `workflow.md` (신설)
raw `workflow.md` 흡수:
- 도메인 네이밍: 모듈코드(소문자 2자) + camelCase 도메인명 → PascalCase 클래스. 모든 파일·URL 일관
- **구현 전 템플릿 탐색 필수** — 레이어별 INDEX 탐색 순서. (enforce-template 훅의 규범적 근거)
- DB 레이블 등록: `${@messageUtils.getMessage('key')}` 는 DB 저장(properties 아님), 사용자 직접 등록 영역

### 2.5 `templates.md` (현 `template-meta.md` 교체)
raw `templates.md`(메타 규칙)로 교체:
- 핵심 원칙: "복붙 후 변수만 교체하면 즉시 동작"
- 토큰 표기법(§1 토큰 규약), 치환 테이블 포맷(Java/HTML/JS 코드블록 예시), 섹션 구분 주석 포맷
- INDEX.md 작성 규칙(패턴 선택 기준표 + 파일별 상세, 레이어별 추가 항목)
- 신규 템플릿 검증 체크리스트
- **카탈로그 메커니즘 연결**: 단일 `index.json`(pathPatterns 글롭, `index.schema.json` 준수)이 훅 구동 정본임을 명시. templater가 유지

### 2.6 포팅 깊이 가드 (Q9-B)
- **플러그인 규칙에 넣을 것**: 스택 정의, 레이어 규율, SP-only, DTO/Form/BaseDTO 구조, tx 순서, errorCode, 권한 매핑, XSS 원칙, 토큰 규약
- **넣지 말 것(템플릿 인라인 주석으로 이관)**: Kendo 위젯 버전 종속 gotcha(MultiViewCalendar resize, datepicker `now`, 팝업 `var`, `kendo.toString` vs substring 등). 규칙엔 "구체 gotcha는 축적 템플릿 주석을 정본으로 따른다"는 *포인터만*

---

## 3. 작업: 에이전트 4종 (`plugins/wonder-harness/agents/`)

### 3.1 `developer.md`
- 스택 가정 교정: **Spring Boot(Java) + MyBatis SP-only + Thymeleaf + Kendo + ES6** (현행 "JSP/jQuery" 제거)
- 규칙 로드: 플러그인 루트 `${CLAUDE_PLUGIN_ROOT}/rules/{backend,frontend,security,workflow}.md` + 항상 security
- 템플릿: 프로젝트 `.claude/templates/index.json`에서 탐색(축적된 것)
- 원칙: 주변 코드 스타일 추종, 불필요 리팩터링 금지, 입력 fail-fast

### 3.2 `templater.md`
- **단일 `index.json` 유지**(Q8'-A): pathPatterns + 경로 등록, `index.schema.json` 검증
- raw 토큰 규약(§1) + `templates.md` 메타규칙 준수
- 실코드에서 패턴 발견·생성해 **프로젝트에 축적**(테스트하며 쌓는 흐름)
- 없으면 `index.seed.json`(빈 시드) 복사로 부트스트랩

### 3.3 `ruler.md`
- 소유 규칙 **5종**으로 갱신(backend·frontend·security·**workflow**·templates)
- 각 규칙 검증 체크리스트를 교정된 내용에 맞춰 갱신

### 3.4 `planner.md`
- 경미: 도메인 단위 = 7파일 세트(5 Java + HTML + JS), 네이밍 규약 인지. 큰 변경 없음

---

## 4. 작업: 메커니즘·메타데이터

- `hooks/scripts/enforce-template.js` 외 훅 JS: **로직 변경 최소**. 빈 카탈로그→허용적, 패턴 축적 시 강제. 회귀만 확인
- `templates/index.seed.json`: **빈 시드 유지** `{ "version": 1, "templates": [] }`
- `templates/scaffolds/*`: **플러그인에 템플릿 굽지 않음** — 기존 `.gitkeep` 유지(또는 정리). 새 스캐폴드 추가 금지
- `.claude-plugin/plugin.json`: description/keywords를 교정 스택 반영. **version 범프** (0.2.0 → 0.3.0 권장: 규칙·에이전트 대규모 교정)
- `.claude-plugin/marketplace.json`: 동일 version 동기화 (CLAUDE.md 버전 규칙)
- `CLAUDE.md` / `README.md`: 스택·구조 설명 갱신
- 커밋: `feat:`/`fix:` 변경 커밋 → 별도 `chore: bump version to 0.3.0` 커밋 (CLAUDE.md 규칙 준수)

---

## 5. 하지 않을 것 (명시적 비범위)

- ❌ raw 템플릿 파일을 플러그인 스캐폴드로 굽기
- ❌ 프로젝트에 플러그인 파일 전량 시딩 / `wh-init` 신설
- ❌ `raw/.claude/` 수정
- ❌ 위젯 버전 종속 gotcha를 플러그인 규칙에 박제
- ❌ 훅 JS 대규모 개조

---

## 6. 검증 (Q10-A)

1. `npm run validate` — 플러그인 구조 유효성
2. 기존 훅 테스트 회귀 통과 확인 (`tests/`)
3. **실사용 통합**: WONDER 사본에 `claude --plugin-dir ./plugins/wonder-harness` 로 로드 후 `/wh-create` 실행 →
   - templater가 `index.json`에 템플릿 축적하는가
   - ruler가 교정된 5종 규칙으로 검증하는가
   - developer가 SP-only/Kendo/올바른 패키지로 코드 생성하는가
4. 규칙 상호참조(`${CLAUDE_PLUGIN_ROOT}/rules/...`)가 실제 해소되는지 수동 확인

---

## 7. 실행 순서 권장

1. 규칙 5종 작성/교정 (§2) — ruler 소유 정본이므로 먼저
2. 에이전트 4종 교정 (§3) — 규칙 참조가 맞춰진 후
3. 메타데이터·버전 (§4)
4. 검증 (§6)
5. 커밋 분리 (§4 마지막)
