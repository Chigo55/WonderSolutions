---
title: 보안 규칙
owner: ruler
applies-to: developer
stack: Spring Boot + MyBatis(SP) + Thymeleaf + Kendo
---

# 보안 규칙

> 관련 규칙: `${CLAUDE_PLUGIN_ROOT}/rules/workflow.md` · `${CLAUDE_PLUGIN_ROOT}/rules/backend.md` · `${CLAUDE_PLUGIN_ROOT}/rules/frontend.md`

## 재고 무결성 (CRITICAL)

- 재고·수량 변경 코드는 Mapper 의 `@Select("EXEC dbo.SP_XXX ...")` SP 호출로만 수행한다. 직접 SQL(`@Insert`/`@Update`) · ORM 엔티티 변경 금지.
- SP 가 `errorCode` OUT 으로 검증 결과 반환 — `"E"` 이면 즉시 `ApplicationException` throw.
- 복수 테이블에 걸친 재고 조정은 단일 SP 또는 단일 `@Transactional` 메서드로 원자적 처리(처리 순서는 `${CLAUDE_PLUGIN_ROOT}/rules/backend.md` Service-CUD 절).
- SP 자체의 작성·수정은 작업 범위 밖이며 사용자가 관리한다.

## 권한 검증 (필수)

- Controller CUD 엔드포인트마다 `SecurityUtils.hasMenuRoleType(menuId, type)` 확인.
- Thymeleaf 행 추가·삭제 버튼: `th:if="${@securityUtils.hasMenuRoleType(param.menuId, 'INSERT')}"` 권한 가드.
- 그리드 편집 권한은 `isGridEditUse` hidden 필드로 프론트 전달(`${CLAUDE_PLUGIN_ROOT}/rules/frontend.md` searchForm 절).

### 권한 ↔ 액션 · 버튼 · 엔드포인트 매핑 (정본)

| 권한 | 매핑 액션 | 관련 버튼 · 엔드포인트 |
|---|---|---|
| `SELECT` | 조회 | `#searchBtn`, `GET /list` |
| `INSERT` | 행 추가 | 행 추가 버튼, `POST` / `PUT`(신규 행 포함) |
| `UPDATE` | 행 편집 | 그리드 inline edit, `PUT`(수정 행 포함) |
| `DELETE` | 행 삭제 | 행 삭제 버튼, `PUT`(`deletedRows` 포함) |
| `EXPORT` | 엑셀 내보내기 | `#exportBtn` |
| `PRINT` | 인쇄 · 라벨 | `#printBtn`, `/printList` 엔드포인트 |
| `UPLOAD` | 파일 업로드 | `#uploadBtn`, `POST`(multipart) |

## 고정 공통 유틸 (재구현 금지)

- `SecurityUtils`(`getPrincipal()`, `hasMenuRoleType(menuId, type)`) · `MessageUtils` · `CommonUtils` · `FileUtils` — 직접 재구현 금지, 사용자 컨텍스트는 항상 `SecurityUtils` 로 획득.
- 예외 클래스: `ApplicationException` 단독 사용(SP `errorCode = "E"` 시 throw).
- `loginUserSeq` 처리 정본은 `${CLAUDE_PLUGIN_ROOT}/rules/backend.md` Service-CUD 절.

## 파일 업로드 보안

- `FileUtils.saveFile(file, GlobalConstants.FileSubPath.TEMP)` 사용 — 확장자 검증은 `FileUtils` 내부에서 수행(허용 목록은 설정 `custom.file.allow-extensions`).
- 다운로드 경로 traversal(`..` 포함) 차단.

## 코드 보안 체크리스트

- [ ] Mapper SP 호출 파라미터에 사용자 입력 직접 문자열 연결 금지 (MyBatis 바인딩 `#{...}` 사용)
- [ ] 파일 업로드 확장자 허용 목록 검증, traversal 차단
- [ ] `SecurityUtils.getPrincipal()` 로 사용자 컨텍스트 획득(클라이언트 제공 userId 불신)
- [ ] `createdBy` / `lastUpdatedBy` 서버 자동 설정, 클라이언트 값 무시
- [ ] Thymeleaf `th:utext` 사용 시 XSS 안전 여부 확인
- [ ] 오류 메시지에 스택 트레이스 · DB 상세 미포함(`ApplicationException` 메시지만 노출)
- [ ] Controller CUD 권한 검증 + 버튼 `th:if` 가드 존재
