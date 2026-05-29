---
title: 프론트엔드 규칙 (Thymeleaf + Kendo + ES6)
owner: ruler
applies-to: developer
stack: Thymeleaf + Kendo UI 웹컴포넌트 + Bootstrap 5 + ES6 모듈
---

# 프론트엔드 규칙 — Thymeleaf / Kendo / ES6

> 관련 규칙: `${CLAUDE_PLUGIN_ROOT}/rules/workflow.md` · `${CLAUDE_PLUGIN_ROOT}/rules/backend.md` · `${CLAUDE_PLUGIN_ROOT}/rules/security.md` · `${CLAUDE_PLUGIN_ROOT}/rules/templates.md`

## 스택

- 뷰: Thymeleaf 서버사이드 렌더링.
- 그리드/위젯: Kendo UI 웹컴포넌트 (`is="kendo-grid"` 커스텀 빌트인 요소).
- 스크립트: ES6 모듈. 레거시 JSP·jQuery 스택 사용 금지.

## 파일 구조

- JS: `static/assets/js/front/wsmErp/{module}/{domainName}.js`
- HTML: `templates/pages/wsmErp/{module}/{domainName}.html`
- JS·HTML 은 1:1 camelCase 동일명 대응 (`woWorkShift.js` ↔ `woWorkShift.html`).
- JS 로드는 `th:src="@{/js/front/wsmErp/{module}/{file}.js}"` — `/assets/js/` 경로 사용 금지.

## 그리드 ID 명명 (정본)

| 유형 | 규칙 | 예시 |
|------|------|------|
| WMS/ERP 단일 | `wsmErp{Module}{Domain}{Role}` | `wsmErpWoWorkShiftGrid` |
| APS 모듈 | `aps{Domain}{Role}` | `apsCmCountryCodeGrid` |
| 마스터 / 디테일 / 첨부 | 역할 접미사 `Master` · `Detail`(다중은 `Detail1`,`Detail2`) · `Attach` + `Grid` | `wsmErpWoWorkShiftMasterGrid` |

- 그리드 ID 는 `@GridSetup(gridName)` 값과 정확히 일치(`${CLAUDE_PLUGIN_ROOT}/rules/backend.md` DTO 절).
- 함수명 camelCase 동사+대상(`searchList`, `saveGrid`, `addRow`). URL 경로 `CONTEXT_PATH + '/{module}/{domainName}'`.
- 팝업 공유 변수(부모 창에서 `modalWindow.변수명` 접근)는 `var` 선언 필수(`const`/`let` 은 window 프로퍼티 미노출).

## searchForm 필수 hidden 필드

모든 화면의 searchForm 은 4종 hidden 필드를 반드시 포함한다: `corporationId`, `userSeq`, `isGridEditUse`, `locale`. 정확한 입력 정의(`th:value`·`id`·순서)는 프로젝트 축적 템플릿을 정본으로 따른다.

## 버튼 · 권한

- 공통 버튼(`#searchBtn` `#saveBtn` `#exportBtn` `#printBtn` `#uploadBtn` `#closeBtn`)은 공통 레이아웃이 제공 — 페이지 HTML 에 중복 추가 금지.
- 행 추가·삭제 버튼은 `th:if="${@securityUtils.hasMenuRoleType(...)}"` 권한 가드 필수 — 권한 종류·매핑은 `${CLAUDE_PLUGIN_ROOT}/rules/security.md` 권한 검증 절(정본).

## changesData 서버 전송 (CRITICAL)

- `changesData` 의 각 Map 은 배열로 변환해 전송한다.
- `updatedRows` 에서 `deletedRows` 의 uid 는 반드시 필터링한다 — 미적용 시 삭제된 행이 `updatedRows` 에 중복 포함되어 이중 처리 버그 발생.

## 저장 버튼 순서 (필수)

1. `closeCell()` — 편집 중인 셀 닫기
2. `isModified()` — 변경 없으면 중단
3. 검증(`gridSaveValidation(grid, grid.grid)`)
4. `fetch` 전송 — 응답은 `res.ok` 확인 후 안전 파싱

- 전역 변수(`CONTEXT_PATH`, `COMMON_MESSAGES.*`)는 `head.html` 자동 선언분을 재선언 금지.
- 그리드 컴포넌트 참조는 `document.getElementById('{gridId}').kendoGrid`.

## 위젯 버전 종속 gotcha — 규칙 아님

datepicker 초기화·MultiViewCalendar 옵션·날짜 문자열 변환·팝업→셀 값 반영·세부 CSS 클래스 등 **Kendo 위젯 버전에 종속된 주의사항은 본 규칙에 박제하지 않는다.** 해당 정본은 프로젝트가 축적한 템플릿의 인라인 주석이다(`${CLAUDE_PLUGIN_ROOT}/rules/templates.md` 참조). 규칙은 구조·계약·네이밍만 규정한다.

## 구현 전 템플릿 탐색 (필수)

HTML·JS 작성 전 프로젝트 템플릿 카탈로그(`.claude/templates/index.json`)를 탐색해 화면 유형과 가장 유사한 템플릿을 참고한다(도메인 필드만 교체, 구조 유지).

## 검토 체크리스트 (review 모드)

- [ ] 레거시 JSP·jQuery 미사용, Thymeleaf + Kendo 웹컴포넌트 + ES6
- [ ] JS/HTML 1:1 camelCase, 경로 규약(`/js/front/...`) 준수
- [ ] 그리드 ID 명명 규칙 + `@GridSetup` 일치
- [ ] searchForm 4 hidden(`corporationId · userSeq · isGridEditUse · locale`)
- [ ] changesData 배열 변환 + `updatedRows` 에서 `deletedRows.uid` 필터
- [ ] 저장 순서 closeCell → isModified → 검증 → fetch(res.ok)
- [ ] 위젯 gotcha 가 규칙에 박제되지 않음 (템플릿 인라인 주석으로 이관)
