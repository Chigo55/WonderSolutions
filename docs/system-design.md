# WonderSolutions Multi-Marketplace Architecture Specification

이 문서는 WonderSolutions의 목표 아키텍처 명세다. 기존 문서와 기존 구현은 이 명세의 입력으로 취급하지 않는다. 이 명세는 Claude Code, Codex, Antigravity를 동등한 marketplace target으로 보고, 하나의 공통 소스에서 각 플랫폼의 native marketplace/manifest/surface 산출물을 생성하는 구조를 정의한다.

Capability별 상세 동작은 이 문서에서 정의하지 않는다. 각 capability는 별도 스펙 문서에서 독립적으로 정의한다.

## 1. Architecture Goals

WonderSolutions는 하나의 repository에서 여러 AI coding platform용 marketplace package를 함께 관리한다.

목표는 다음과 같다.

- Claude Code, Codex, Antigravity를 동등한 marketplace target으로 취급한다.
- 사람이 수정하는 제품 원본은 `packages/`에 둔다.
- 플랫폼 생성 규칙은 `adapters/`에 둔다.
- 플랫폼별 marketplace/manifest/surface 파일은 실제 플랫폼이 읽는 native path에 생성한다.
- 생성 산출물은 repository에 commit하되, 사람이 직접 수정하지 않는다.
- `pre-commit` hook은 생성과 검증을 실행하고 stale generated output을 차단한다.
- 각 Wonder plugin은 다른 Wonder plugin 없이 독립적으로 init 및 실행 가능해야 한다.
- Plugin 간 연결은 hard dependency가 아니라 project-local capability discovery로 수행한다.

## 2. Product Boundary

Plugin은 기술 구성요소가 아니라 사용자 작업 기준으로 나눈다.

| Plugin | User Job | Responsibility |
| --- | --- | --- |
| `wonder-build` | Build | 새 작업 생성, 기존 작업 수정, 작업 검토를 구조화해서 수행한다. |
| `wonder-govern` | Govern | 프로젝트 기준과 규칙을 관리하고, 실제 프로젝트 상태를 검사한다. |
| `wonder-reuse` | Reuse | 템플릿, 요청서, 문서 패턴, snippet 같은 재사용 자산을 관리하고 생성에 활용한다. |
| `wonder-extend` | Extend | 외부 companion/integration의 추천, 연결 안내, capability 감지를 담당한다. |

모든 plugin은 독립 실행 가능해야 한다. 예를 들어 `wonder-build`는 `wonder-govern`, `wonder-reuse`, `wonder-extend`가 없어도 기본 방식으로 동작해야 한다. 다른 plugin이 init되어 있으면 `.wonder/state.json`의 capability registry를 통해 기능을 강화할 수 있다.

## 3. Source Layout

사람이 수정하는 목표 source tree는 다음과 같다.

```text
packages/
  wonder-build/
    manifest.json
    specs/
      init.md
      create.md
      modify.md
      review.md
    capabilities/
      init/
        capability.json
        instruction.md
      create/
        capability.json
        instruction.md
      modify/
        capability.json
        instruction.md
      review/
        capability.json
        instruction.md

  wonder-govern/
    manifest.json
    specs/
      init.md
      define-standards.md
      check-policy.md
    capabilities/
      init/
        capability.json
        instruction.md
      define-standards/
        capability.json
        instruction.md
      check-policy/
        capability.json
        instruction.md

  wonder-reuse/
    manifest.json
    specs/
      init.md
      manage-assets.md
      generate-output.md
      promote-asset.md
    capabilities/
      init/
        capability.json
        instruction.md
      manage-assets/
        capability.json
        instruction.md
      generate-output/
        capability.json
        instruction.md
      promote-asset/
        capability.json
        instruction.md

  wonder-extend/
    manifest.json
    catalog/
      companions.json
      integrations.json
    specs/
      init.md
      discover-companions.md
      configure-integration.md
      detect-capabilities.md
    capabilities/
      init/
        capability.json
        instruction.md
      discover-companions/
        capability.json
        instruction.md
      configure-integration/
        capability.json
        instruction.md
      detect-capabilities/
        capability.json
        instruction.md

adapters/
  claude/
    adapter.json
    templates/
  codex/
    adapter.json
    templates/
  antigravity/
    adapter.json
    templates/

tools/
  generate/
  validate/

.githooks/
  pre-commit
```

`packages/`는 제품 원본이다. `adapters/`는 공통 package/capability를 각 플랫폼 native 파일로 생성하는 규칙이다. `tools/`는 생성기와 검증기를 담는다. `.githooks/`는 commit 가능한 Git hook을 담는다.

## 4. Package And Capability Model

`package`는 marketplace에서 설치되는 제품 단위다.

`capability`는 사용자가 실제로 호출하거나 plugin이 내부적으로 사용할 수 있는 기능 단위다.

`surface`는 capability가 특정 플랫폼에서 노출되는 방식이다. 예를 들어 같은 canonical capability가 Claude Code에서는 command, Codex에서는 skill, Antigravity에서는 workflow로 생성될 수 있다.

Canonical identifier는 다음 형식을 따른다.

```text
<package-id>.<capability-id>
```

예:

```text
wonder-build.create
```

플랫폼별 surface name은 canonical identifier에서 자동 생성한다. 사람이 플랫폼별 surface name을 직접 작성하지 않는다.

예:

```text
canonical id: wonder-build.create

Claude Code: /wonder-build:create
Codex: $wonder-build-create
Antigravity: wonder-build.create
```

## 5. Platform Projection

공통 source는 세 플랫폼으로 병렬 projection된다.

```text
packages/ + adapters/
  -> Claude Code marketplace/manifest/surfaces
  -> Codex marketplace/manifest/surfaces
  -> Antigravity marketplace/manifest/surfaces
```

플랫폼별 값은 override가 아니다. 세 플랫폼은 하나의 프로젝트 안에서 동시에 사용될 수 있는 동등한 target이다.

Generated output은 `generated/` 같은 별도 폴더에 숨기지 않고, 각 플랫폼이 실제로 읽는 native path에 직접 생성한다. Generated output은 commit 대상이지만, 사람이 직접 수정해서는 안 된다.

세 플랫폼 surface는 결정론적으로 처리해야 하는 runtime file work를 직접 구현하지 않는다. Init, machine-managed JSON, run scaffold, typed report, reuse rendering, generate/validate/drift 같은 작업은 MCP 또는 repository CLI가 제공하는 deterministic runtime layer를 통해 수행한다. MCP와 CLI는 같은 shared runtime implementation을 호출하는 동등한 public contract이며, 자세한 파일 소유권과 양식화 규칙은 `docs/deterministic-runtime.md`가 정의한다.

## 6. Capability Authoring Contract

Capability 본문은 한 번만 작성한다.

```text
packages/<package>/capabilities/<capability>/instruction.md
```

`instruction.md`는 플랫폼 중립 문장으로 작성한다. 플랫폼별 실행 방식은 adapter가 생성 시 주입한다.

공통 본문에는 플랫폼 고유 표현을 쓰지 않는다.

금지 예:

```text
Claude
Codex
Antigravity
Agent tool
shell_command
invoke_subagent
.claude/
.codex/
.agents/
```

대신 abstract action으로 표현한다.

예:

```text
파일을 읽는다.
변경사항을 작성한다.
하위 역할에 위임한다.
검증을 실행한다.
결과를 보고한다.
```

각 capability는 `capability.json`에 필요한 abstract action을 명시한다.

```json
{
  "id": "create",
  "kind": "workflow",
  "requires": ["read", "write", "delegate", "run-command", "report"]
}
```

Abstract action은 최소 집합으로 제한한다. 새 action은 공통 schema와 세 플랫폼 adapter가 모두 정의된 뒤에만 추가할 수 있다.

초기 abstract action 집합:

```text
read
search
write
edit
run-command
delegate
web-research
ask-user
report
manage-state
```

## 7. Generation And Validation

Generation과 validation은 repository tool로 제공한다.

```text
tools/
  generate/
  validate/
```

`generate`는 `packages/`와 `adapters/`를 읽어 플랫폼 native output을 생성한다.

`validate`는 다음을 검증한다.

- package manifest schema
- capability schema
- abstract action 사용 가능 여부
- 공통 instruction의 플랫폼 고유 표현 금지
- 플랫폼별 generated output의 schema
- generated output이 source와 일치하는지 여부

## 8. Git Hook Contract

Git hook은 repository에 commit 가능한 `.githooks/`에 둔다.

```text
.githooks/
  pre-commit
```

설치 방식:

```bash
git config core.hooksPath .githooks
```

`pre-commit`은 다음 순서로 실행한다.

```text
npm run generate
npm run validate
generated output drift check
```

`pre-commit`은 generated output을 자동으로 `git add`하지 않는다. 생성 결과가 바뀌면 commit을 실패시킨다. 사용자는 변경된 generated output을 확인한 뒤 직접 stage하고 다시 commit한다.

이 규칙은 hook이 사용자의 staged set을 몰래 바꾸지 않게 하기 위한 것이다.

## 9. Runtime Layout

Project-local runtime root는 `.wonder/`다.

```text
.wonder/
  state.json

  config/
    build.json
    govern.json
    reuse.json
    extend.json

  standards/
    coding.md
    architecture.md
    security.md
    docs.md

  reuse/
    index.json
    templates/
    snippets/
    requests/
    patterns/

  extend/
    companions.json
    integrations.json
    capabilities.json

  runs/
    <run-id>/

  reports/
    build-latest.json
    govern-latest.json
```

`.wonder/state.json`은 machine-managed registry다. 사용자가 직접 편집하지 않는다.

사용자 편집 가능 설정은 plugin별 config 파일에 둔다.

```text
.wonder/config/build.json
.wonder/config/govern.json
.wonder/config/reuse.json
.wonder/config/extend.json
```

사용자 편집 가능 규칙과 기준은 `.wonder/standards/`에 Markdown으로 둔다.

재사용 자산은 `.wonder/reuse/` 아래에 묶는다.

외부 companion/integration 정보는 `.wonder/extend/` 아래에 둔다.

`.wonder/` 아래 runtime JSON과 Markdown scaffold의 writer, preservation, repair 규칙은 `docs/deterministic-runtime.md`를 따른다.

## 10. Init And Discovery

각 plugin은 명시적 init capability를 제공해야 한다. Plugin 설치만으로 project 파일을 자동 변경하지 않는다.

각 init은 다음을 수행한다.

- `.wonder/` root를 보장한다.
- `.wonder/state.json`을 생성하거나 병합한다.
- 자기 plugin의 capability만 등록한다.
- 현재 실행 중인 platform만 initialized 처리한다.
- 다른 plugin의 영역을 수정하지 않는다.

같은 프로젝트에서 여러 플랫폼을 사용할 수 있으므로, `state.json`은 surface와 platform initialized 상태를 분리한다.

예:

```json
{
  "plugins": {
    "wonder-build": {
      "initialized": true,
      "capabilities": {
        "create": {
          "kind": "workflow",
          "surfaces": {
            "claude": "/wonder-build:create",
            "codex": "$wonder-build-create",
            "antigravity": "wonder-build.create"
          }
        }
      },
      "platforms": {
        "claude": { "initialized": true },
        "codex": { "initialized": false },
        "antigravity": { "initialized": false }
      }
    }
  }
}
```

Surface name은 세 플랫폼 모두 기록한다. Platform initialized 상태는 해당 platform에서 init이 실행되었을 때만 true가 된다.

## 11. Runtime Records And Reports

Capability registry와 실행 기록은 분리한다.

```text
.wonder/state.json
  사용 가능한 plugin/capability registry

.wonder/runs/
  실행별 입력, 결과, 검증 로그, 보고서
```

모든 capability는 필요하면 run 기록을 남길 수 있다. 단, run 기록은 실행형 workflow에만 필수다.

필수 run 기록 대상:

- `wonder-build.create`
- `wonder-build.modify`
- `wonder-build.review`
- `wonder-govern.define-standards`
- `wonder-govern.check-policy`
- `wonder-reuse.manage-assets` for asset-changing operations
- `wonder-reuse.generate-output` for direct user calls
- `wonder-reuse.promote-asset`
- `wonder-extend.discover-companions` for state-changing operations
- `wonder-extend.configure-integration`
- `wonder-extend.detect-capabilities`

`wonder-build`와 `wonder-govern`은 최신 요약 report를 유지한다.

```text
.wonder/reports/build-latest.json
.wonder/reports/govern-latest.json
```

`wonder-reuse`는 별도 latest report를 만들지 않는다. 재사용 자산 자체가 상태이며, 필요한 실행 이력은 `.wonder/runs/`에 남긴다.

`wonder-extend`도 별도 latest report를 만들지 않는다. `.wonder/extend/capabilities.json`이 현재 감지된 외부 capability 상태를 나타낸다.

## 12. Plugin Relationship Rules

Wonder plugin 간 관계는 loose capability discovery다.

금지:

- 다른 Wonder plugin에 대한 hard dependency
- companion tool 자동 설치 강제
- companion tool 부재 시 core capability 실패
- 다른 plugin config 직접 수정

허용:

- `.wonder/state.json`을 통한 capability discovery
- 다른 plugin이 제공하는 capability의 read-only 참고
- 사용 가능한 companion capability가 있을 때의 progressive enhancement
- 필요한 경우 사용자에게 관련 plugin init 또는 companion 연결을 권장

## 13. Non-Goals

이 명세는 다음을 정의하지 않는다.

- 각 capability의 상세 단계와 prompt
- 각 capability의 상세 입력/출력 schema
- 각 플랫폼 adapter template의 구체 문법
- 현재 repository 구현과의 migration plan
- 기존 파일 구조와의 호환성

Capability별 상세 스펙은 별도 문서에서 정의한다.
