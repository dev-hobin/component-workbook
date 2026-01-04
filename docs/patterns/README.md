# 핵심 패턴

이 프로젝트에서 사용하는 핵심 패턴들입니다.

## 패턴 목록

| 패턴 | 설명 | 문서 |
|------|------|------|
| **Status 패턴** | 복잡한 State에서 단순한 Status를 파생하여 안전한 Effect 실행 | [status-pattern.md](./status-pattern.md) |
| **Effect as Data** | 부수효과를 데이터로 표현하고 Shell에서 해석 | [effect-as-data.md](./effect-as-data.md) |
| **handlersRef 패턴** | 안정적인 이벤트 핸들러 참조 유지 | [handlers-ref.md](./handlers-ref.md) |
| **Cleanup 분리** | 상태 전환 Effect와 언마운트 Cleanup 분리 | [cleanup-separation.md](./cleanup-separation.md) |
| **Controllable State** | Controlled/Uncontrolled 모드 지원 | [controllable-state.md](./controllable-state.md) |

---

## 패턴 간 관계

```
┌─────────────────────────────────────────────────────────────────────┐
│                         사용자 인터랙션                               │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Controllable State                              │
│  - controlled/uncontrolled 모드 처리                                 │
│  - useControllableState로 상태 관리                                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Status 패턴                                   │
│  - State에서 Status 파생                                            │
│  - prevStatusRef로 전환 추적                                         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Effect as Data                                  │
│  - 상태 전환에 따른 Effect[] 결정 (Core)                              │
│  - runEffect로 실행 (Shell)                                         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
                    ▼                     ▼
┌─────────────────────────┐   ┌─────────────────────────┐
│    handlersRef 패턴      │   │    Cleanup 분리         │
│  - 안정적인 리스너 참조   │   │  - 정상 전환 vs 언마운트  │
│  - useLatestRef 활용    │   │  - Strict Mode 대응     │
└─────────────────────────┘   └─────────────────────────┘
```

---

## 컴포넌트별 패턴 사용

### 기본 패턴 (외부 리소스 없음)

| 컴포넌트 | Controllable State | 비고 |
|---------|-------------------|------|
| Accordion | ✅ | expandedIds 제어 |
| Tabs | ✅ | selectedId 제어 |
| Pagination | ✅ | page 제어 |

### Status 패턴 (외부 리소스 관리)

| 컴포넌트 | 패턴 | 외부 리소스 |
|---------|------|------------|
| Modal | Status + Effect + Cleanup | focus-trap, scroll-lock |
| Menu | Status + Effect + Cleanup + handlersRef | document 리스너 |

---

## 패턴 적용 결정 흐름

```
외부 리소스(이벤트 리스너, focus-trap 등)가 필요한가?
    │
    ├─ No → 기본 패턴
    │       └─ Controllable State만 적용
    │
    └─ Yes → Status 패턴
             │
             ├─ Effect as Data 적용
             │
             ├─ document 이벤트 리스너?
             │   └─ handlersRef 패턴 적용
             │
             └─ Cleanup 분리 적용
```

---

## 권장 학습 순서

1. **[Controllable State](./controllable-state.md)** - 모든 컴포넌트의 기본
2. **[Status 패턴](./status-pattern.md)** - 외부 리소스 관리의 핵심
3. **[Effect as Data](./effect-as-data.md)** - Core/Shell 분리의 핵심
4. **[handlersRef 패턴](./handlers-ref.md)** - 이벤트 핸들러 최적화
5. **[Cleanup 분리](./cleanup-separation.md)** - 안전한 리소스 정리
