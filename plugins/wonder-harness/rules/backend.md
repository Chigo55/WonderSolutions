---
title: 백엔드 규칙 (Spring Boot + MyBatis SP)
owner: ruler
applies-to: developer
stack: Java 17 / Spring Boot 3.x / MyBatis (SQL Server 저장프로시저)
---

# 백엔드 규칙 — Spring Boot + MyBatis(SP)

> 관련 규칙: `${CLAUDE_PLUGIN_ROOT}/rules/workflow.md` · `${CLAUDE_PLUGIN_ROOT}/rules/frontend.md` · `${CLAUDE_PLUGIN_ROOT}/rules/security.md` · `${CLAUDE_PLUGIN_ROOT}/rules/templates.md`

## 계층 구조 (필수)

- `Controller → Service → Mapper` 단방향 의존. 역방향·계층 건너뛰기 금지.
- Controller 는 HTTP 관심사만, 비즈니스 로직은 Service 에만 둔다.
- 엔티티/내부 객체를 Controller 응답으로 직접 노출하지 않는다 — DTO 로 변환한다.
- 패키지 루트: `io.boot.wonder.web...` (도메인/기능별로 묶는다).
- 도메인 1개 = Java 5파일: `{Entity}Controller.java`, `service/{Entity}Service.java`, `mapper/{Entity}Mapper.java`, `dto/{Entity}DTO.java`, `form/{Entity}Form.java`.

## 네이밍

- 클래스명 PascalCase(`WoWorkShift`), 변수·메서드 camelCase(`woWorkShift`, `selectWoWorkShift`).
- Mapper 메서드 접두사: `select` / `selectCount` / `insert` / `update` / `delete`.
- 도메인 네이밍 규약은 `${CLAUDE_PLUGIN_ROOT}/rules/workflow.md` 참조.

## Mapper — 저장프로시저 전용 (필수)

- 모든 쿼리는 `@Select("EXEC dbo.SP_{MODULE}_{DOMAIN}_{ACTION} ...")` 형태로 SP 를 호출한다.
- `@Insert` / `@Update` / `@Delete` 사용 금지.
- CUD 메서드에만 `@Options(statementType = StatementType.CALLABLE)` — SELECT 에는 선언 금지.
- SELECT/COUNT 메서드는 `@Param("xxxForm")`, `@Param("pageable")` 명시(미선언 시 `#{field}` 접근 불가). CUD 는 DTO 단일 파라미터 → `@Param` 불필요.
- SP 명명 형식(EXEC 문 추론 참고): `SP_{MODULE}_{DOMAIN}_{ACTION}`. 변형 `_SELECT_TC`(count)·`_PRINT_LIST_SELECT`(인쇄)·`_REQUEST_SEQ_SELECT`(채번). SP 자체의 작성·관리는 작업 범위 밖(사용자 소유).

## DTO

- `BaseDTO` 상속(필수) — 공통 7필드(`rowNo`, `createdBy`, `creationDate`, `lastUpdatedBy`, `lastUpdateDate`, `errorCode`, `errorMsg`) 자동 포함, 자식 DTO 재선언 금지.
- `rowNo` 는 그리드 표시용 1-base 행 번호로 SP 가 반환(클라이언트가 부여하지 않음).
- `@GridSetup(gridName)` 필수 — gridName 은 HTML `is="kendo-grid"` id 와 정확히 일치(`${CLAUDE_PLUGIN_ROOT}/rules/frontend.md` 그리드 ID 절).
- `loginUserSeq` 필드는 `@JsonIgnore`(응답 노출 금지). 처리 정본은 Service-CUD 절.
- JOIN 으로 가져오는 컬럼은 출처 테이블을 주석 명시.

## Form

- 필드 선언 순서: `createdRows` → `updatedRows` → `deletedRows` → 검색 조건.
- 같은 Form 에 Detail rows 포함 시 `detailCreatedRows` 등 `detail*` 접두사로 구분.

## Service — 조회

- 반환: `new PageImpl<>(list, pageable, mapper.selectCount(form))`(인쇄 전체 반환은 `new PageImpl<>(list)`).
- `@Transactional` 선언 금지(조회 전용).

## Service — CUD

- `@Transactional` 필수 — public CUD 메서드에만(private 헬퍼 중복 선언 금지).
- 처리 순서: **delete → insert → update** (순서 변경 금지).
- 각 처리 블록 진입 전 rows null/empty 체크.
- SP 호출 후 `"E".equals(dto.getErrorCode())` → `ApplicationException` throw(트랜잭션 자동 롤백).
- `loginUserSeq` [정본] — public 메서드에서 `SecurityUtils.getPrincipal().getUserSeq()` 로 1회 획득해 private 헬퍼·DTO 에 전달(`${CLAUDE_PLUGIN_ROOT}/rules/security.md` 참조).

## Controller

- 페이지 렌더링: `String` 반환(뷰 경로), `@ResponseBody` 없음.
- 목록 조회: `Page<DTO>` 반환, `@GetMapping("/list")`.
- CUD: `new SuccessVO(MessageUtils.getUpdateMessage(true))` 반환.
- 파일 포함 저장: `@PostMapping`(multipart, `files[i]` ↔ `createdRows[i]` 인덱스 순서 보장) / 파일 없는 저장: `@PutMapping`.
- 클래스 어노테이션: 순수 API(목록·CUD 전용)=`@RestController`, 페이지 전용=`@Controller`, 혼합=`@Controller` + 목록·CUD 메서드에 `@ResponseBody`.

## 구현 전 템플릿 탐색 (필수)

코드 작성 전 프로젝트 템플릿 카탈로그(`.claude/templates/index.json`)를 탐색해 화면 유형과 가장 유사한 템플릿을 참고한다(도메인 필드만 교체, 구조는 유지). 토큰·치환 규약은 `${CLAUDE_PLUGIN_ROOT}/rules/templates.md`.

## 검토 체크리스트 (review 모드)

- [ ] Controller → Service → Mapper 단방향, 패키지 `io.boot.wonder.web`
- [ ] Mapper 가 SP 전용(`@Select EXEC`), `@Insert/@Update/@Delete` 없음
- [ ] CUD 에만 `@Options(CALLABLE)`, SELECT/COUNT `@Param` 명시
- [ ] DTO `BaseDTO` 상속 · `@GridSetup` · `loginUserSeq @JsonIgnore`
- [ ] Service-CUD `@Transactional` + delete→insert→update + errorCode `"E"` 체크
- [ ] Controller 반환 타입(String / Page<DTO> / SuccessVO) 규약 준수
- [ ] 엔티티 직접 노출 없음 (DTO 변환)
