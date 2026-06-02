# wonder-harness 핸드오프 문서 v0.6.0

> AI 세션 인계용 압축 컨텍스트. 상세 사양은 `docs/wonder-harness-spec.html` 참조.
> 작성일: 2026-06-02

---

## 1. 프로젝트 정체성

wonder-harness는 **Spring Boot 3.x + MyBatis(SQL Server SP) + Thymeleaf + Kendo UI 웹컴포넌트 + Bootstrap 5 + ES6** 스택 도메인 개발을 오케스트레이션하는 **Claude Code 플러그인**이다.

단일 플러그인 마켓플레이스 구조 (`Chigo55/wonder-harness`).  
플러그인 버전: **0.6.0** | 마켓플레이스 wrapper 버전: 0.1.0 (독립 관리)

---

## 2. 핵심 파이프라인

```
planner(1) → templater(2) → developer(3) → ruler(4)
```

| 커맨드 | 모드 | 필수 섹션 |
|--------|------|-----------|
| `/wh-create` | create | `## 목표` `## 범위` `## 제약` `## 수용 기준` |
| `/wh-modify` | modify | `## 대상` `## 변경 내용` `## 영향 범위` `## 수용 기준` |
| `/wh-review` | review | 대상 경로 또는 설명 |

요청 파일이 없으면 플러그인 시드를 `.claude/requests/`에 복사 후 중단.  
필수 섹션이 비어있으면 파이프라인 미시작.

---

## 3. 에이전트 역할 요약

| 에이전트 | 도구 | 핵심 책임 |
|----------|------|-----------|
| planner | Read Grep Glob Write | 요청 → 7-file set 분해, 의존 순서, 위험 |
| templater | Read Grep Glob Write Edit | **카탈로그 우선 탐색** → 소스 보완 → index.json 갱신 |
| developer | +Bash | 규칙 로드 후 코드 생성·수정 |
| ruler | Read Grep Glob Write Edit | 5종 규칙 소유 및 검증 보고 |

**7-file set**: `{Entity}Controller.java`, `service/{Entity}Service.java`, `mapper/{Entity}Mapper.java`, `dto/{Entity}DTO.java`, `form/{Entity}Form.java`, `static/.../front/wsmErp/{module}/{domainName}.js`, `templates/pages/wsmErp/{module}/{domainName}.html`

---

## 4. Templater 카탈로그 우선 탐색 프로토콜 (v0.6.0 변경)

```
① .claude/templates/index.json 읽기 (없으면 플러그인 시드 복사 후 부트스트랩)
② ${CLAUDE_PLUGIN_ROOT}/rules/templates.md 읽기 (토큰 규약 로드)
③ index.json 항목 전체 검토 → 필요한 스캐폴드 매핑
④ ③에서 충분하지 않으면 실 프로젝트 소스 코드 탐색으로 보완
⑤ 보완한 패턴을 토크나이즈 → index.json 신규 등록
```

**v0.5.x 문제**: 카탈로그 탐색을 건너뛰고 소스 직접 탐색.  
**v0.6.0 수정**: 카탈로그 탐색이 필수 1단계. 소스 탐색은 카탈로그 보완 용도로만.

---

## 5. 훅 메커니즘 (v0.6.0 수정)

### 훅 등록 (`hooks/hooks.json`)

```json
{
  "description": "wonder-harness template enforcement hooks",
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Read",
        "hooks": [{ "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/mark-template-read.js", "timeout": 5 }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{ "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/enforce-template.js", "timeout": 10 }]
      }
    ]
  }
}
```

**v0.5.x 문제**: `node \"경로\"` — Windows cmd.exe에서 escaped 따옴표로 인한 실행 실패.  
**v0.6.0 수정**: 따옴표 제거, `description` 및 `timeout` 추가.

### 동작 원리

- `PostToolUse(Read)` → `mark-template-read.js`: `index.json` 읽기 감지 시 OS temp에 세션 마커 파일 생성
- `PreToolUse(Write|Edit)` → `enforce-template.js`: 카탈로그 매치 + 마커 없으면 `permissionDecision: "deny"` 차단

### Fail-Open 조건 (이 경우 항상 허용)

- 카탈로그 파일 없음 또는 파싱 오류
- 대상 파일 경로 없음
- 카탈로그 pathPatterns에 미매치 (빈 카탈로그 포함)
- 세션에서 이미 index.json 읽음 (마커 있음)

---

## 6. 규칙 5종 요약

모두 `${CLAUDE_PLUGIN_ROOT}/rules/`에 위치. ruler 소유.

| 파일 | 핵심 제약 |
|------|-----------|
| backend.md | SP-only(@Select("EXEC dbo.SP_...")), BaseDTO 상속, delete→insert→update 순서 |
| frontend.md | JSP·jQuery 금지, Kendo 웹컴포넌트 + ES6 모듈, changesData 직렬화 |
| security.md | SP errorCode="E" 즉시 throw, SecurityUtils 재구현 금지, #{} 바인딩 |
| workflow.md | 개발 순서: 도메인 네이밍 → 탬플릿 탐색 → 구현. DB 레이블은 properties 파일 아닌 DB |
| templates.md | 복붙 후 즉시 동작 원칙, 치환 테이블 주석 필수, 실 도메인명만 사용 |

---

## 7. 편의성·생산성 스킬 (v0.6.0 재명명)

> 이전 명칭 "번들 스킬" → **"편의성·생산성 스킬"**로 변경.  
> 파이프라인 비의존 범용 도구. 규칙 적용 작업은 파이프라인 커맨드로 유도.

| 스킬 | alias | 용도 |
|------|-------|------|
| grill-me | `wonder-harness:grill-me` | 계획·설계 집중 인터뷰 |
| handoff | `wonder-harness:handoff` | 세션 컨텍스트 압축 문서 생성 |
| write-a-skill | `wonder-harness:write-a-skill` | 신규 스킬 작성 3단계 |

### handoff 스킬 저장 경로 우선순위 (v0.6.0 변경)

```
① CLAUDE.md에 handoff 저장 경로가 명시된 경우 → 해당 경로 사용
② CLAUDE.md에 경로 없음 → OS temp 디렉터리 사용
   (파일명: wh-handoff-{timestamp}.md)
```

**v0.5.x 문제**: CLAUDE.md 경로 지시를 무시하고 항상 OS temp에 저장.  
**v0.6.0 수정**: CLAUDE.md 먼저 확인 후 경로 결정.

---

## 8. 템플릿 카탈로그 구조

```json
// .claude/templates/index.json (프로젝트 소유)
{
  "version": 1,
  "templates": [
    {
      "id": "string (kebab-case)",
      "pathPatterns": ["**/web/{module}/**/*Controller.java"],
      "description": "string",
      "path": "scaffolds/relative/path",
      "metadata": {}  // 선택
    }
  ]
}
```

빈 시드: `{ "version": 1, "templates": [] }` — 초기 상태에서 훅이 아무것도 막지 않음. 카탈로그 축적 시 점진적 발효.

---

## 9. 저장소 구조 (핵심만)

```
wonder-harness/
├── .claude-plugin/marketplace.json     ← 마켓플레이스 카탈로그
├── plugins/wonder-harness/
│   ├── .claude-plugin/plugin.json      ← 매니페스트 (v0.6.0)
│   ├── agents/{planner,templater,developer,ruler}.md
│   ├── commands/{wh-create,wh-modify,wh-review}.md
│   ├── hooks/hooks.json + scripts/     ← 훅 선언 + 스크립트
│   ├── rules/{backend,frontend,security,workflow,templates}.md
│   ├── templates/index.schema.json + index.seed.json
│   ├── requests/{create,modify}_request.md
│   └── skills/{grill-me,handoff,write-a-skill}/SKILL.md
├── docs/
│   ├── wonder-harness-spec.html        ← 사람용 정본 사양 (v0.6.0)
│   └── wonder-harness-handoff.md      ← 이 파일
└── tests/hook/*.test.js
```

---

## 10. v0.6.0 변경 이력

| 영역 | 변경 내용 |
|------|-----------|
| hooks/hooks.json | escaped 따옴표 제거 → Windows 호환, description/timeout 추가 |
| agents/templater.md | 카탈로그 우선 탐색 프로토콜 명시 (소스 탐색은 보완 용도) |
| skills/handoff/SKILL.md | CLAUDE.md 경로 우선 확인 → 없으면 OS temp 폴백 |
| 용어 | "번들 스킬" → "편의성·생산성 스킬" |

---

## 11. 버전 동기화 파일

버전 변경 시 **두 파일 동시 수정** 필수:
- `plugins/wonder-harness/.claude-plugin/plugin.json` → `"version": "0.6.0"`
- `.claude-plugin/marketplace.json` → `plugins[0].version: "0.6.0"`

커밋 순서: `fix/feat:` 커밋 → 별도 `chore: bump version to 0.6.0` 커밋
