<p align="center">
  <h1 align="center">wonder-harness</h1>
  <p align="center">
    <strong>Claude Code 개발 하네스 단일 플러그인 마켓플레이스</strong><br>
    프로젝트 워크플로우 최적화를 위한 Claude Code 플러그인을 배포합니다.
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/Claude_Code-plugin-blue?style=flat-square" alt="Claude Code Plugin">
    <img src="https://img.shields.io/badge/version-0.1.0-orange?style=flat-square" alt="Version 0.1.0">
    <img src="https://img.shields.io/badge/Node.js-18+-green?style=flat-square" alt="Node.js 18+">
    <img src="https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square" alt="MIT License">
  </p>
</p>

---

> ⚠️ **초기 단계** — 이 마켓플레이스는 단일 플러그인 `wonder-harness`를 위한 빈 쉘 구조로 시작합니다.
> 플러그인 기능(commands·agents·hooks·skills)은 추후 채워집니다.

---

## 설치

### 마켓플레이스에서 설치

```shell
# 마켓플레이스 등록
/plugin marketplace add Chigo55/wonder-harness

# 플러그인 설치
/plugin install wonder-harness@wonder-harness
```

### 로컬에서 직접 로드 (개발·테스트용)

```bash
git clone https://github.com/Chigo55/wonder-harness.git
claude --plugin-dir ./wonder-harness/plugins/wonder-harness
```

---

## 저장소 구조

이 저장소는 **단일 플러그인 마켓플레이스**입니다.

```
wonder-harness/  (마켓플레이스 저장소)
  .claude-plugin/
    marketplace.json        ← 마켓플레이스 카탈로그
  plugins/
    wonder-harness/         ← wonder-harness 플러그인 (v0.1.0)
      .claude-plugin/
        plugin.json         ← 플러그인 매니페스트
      commands/             ← 슬래시 커맨드 (예정)
      agents/               ← 격리 서브에이전트 (예정)
      hooks/                ← 이벤트 훅 핸들러 (예정)
      skills/               ← SKILL.md 스킬 (예정)
  package.json              ← 모노레포 루트
  CLAUDE.md
```

---

## 검증

```bash
npm run validate
# 또는
claude plugin validate ./plugins/wonder-harness
```

---

## License

MIT — [InHo Jeong](https://github.com/Chigo55)
