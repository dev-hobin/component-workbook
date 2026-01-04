# AI에게 컴포넌트 구현 요청하기

이 문서는 W3C APG 같은 스펙 문서를 기반으로 AI에게 컴포넌트 구현을 요청할 때, 효과적인 프롬프트 작성 방법을 설명합니다.

## 1. 문서 탐색 방식

AI가 W3C APG 문서에서 추출하는 핵심 정보:

### 구조적 요소
- 컴포넌트를 구성하는 DOM 요소들
- 각 요소의 ARIA role

### 상태
- `aria-*` 속성으로 표현되는 상태값들
- UI에서 직접 보이는 값들

### 동작
- Keyboard Interaction 섹션의 키보드 인터랙션
- 마우스/터치 인터랙션
- 포커스 관리 방식

## 2. 패턴 매칭 과정

문서의 요소들을 패턴 범주에 매핑하는 방식:

```
[W3C 문서]                    →  [우리 패턴]
─────────────────────────────────────────────
aria-expanded, aria-selected  →  State (isOpen, selectedValue)
autocomplete 모드 설정         →  Context (autocomplete, closeOnSelect...)
키보드/마우스 → 상태변경       →  Behavior (handleKeyboardAction...)
DOM 조작, 스크롤, 리스너       →  Effect (SCROLL_INTO_VIEW...)
open/closed 상태 파생          →  Status (deriveStatus)
```

## 3. 구현 순서

1. **State 정의** - 문서에서 "변할 수 있는 것"들 추출
2. **Context 정의** - 문서에서 "설정 옵션"들 추출
3. **Behavior 작성** - 문서의 "keyboard interaction" 섹션을 함수로 변환
4. **Effect 정의** - 순수 함수로 처리 불가능한 것들 식별
5. **Shell 연결** - React 컴포넌트로 조립

## 4. 범주화 기준

### State에 들어갈 것
- UI에서 직접 보이는 값 (isOpen, inputValue, highlightedOptionId)
- 사용자 선택 결과 (selectedValue)

### Context에 들어갈 것
- 동작 방식을 결정하는 설정 (autocomplete, loop, closeOnSelect)
- 인스턴스마다 다를 수 있지만 런타임에 자주 변하지 않는 것

### Behavior에 들어갈 것
- 입력 → 출력 매핑 (키보드 이벤트 → 새 상태)
- 조건부 로직 (popup 열려있을 때만 Enter로 선택)

### Effect에 들어갈 것
- DOM 직접 조작 (scrollIntoView, focus)
- 전역 리스너 (document.addEventListener)
- 콜백 호출 (onSelect)

## 5. 프롬프트 작성 가이드

### 효과적인 프롬프트 구조

```
1. 참조 문서/스펙 URL
2. 적용할 패턴 명시 (Functional Core, Effect as Data, Status Pattern 등)
3. 범주 구조 명시 (state, context, behavior, effect)
4. [선택] 핵심 상태나 동작 힌트
```

### 예시: 최소한의 프롬프트

```
W3C APG Combobox 패턴을 구현해줘.
- Functional Core / Imperative Shell 패턴
- core.ts: state, context, behavior, effect 범주
- index.tsx: Shell (React 컴포넌트)
```

### 예시: 상세한 프롬프트

```
W3C APG Combobox 패턴을 구현해줘.

패턴:
- Functional Core / Imperative Shell
- Status Pattern (상태 전환 시 Effect 트리거)
- Effect as Data

Core 구조:
- State: isOpen, inputValue, selectedValue, highlightedOptionId
- Context: autocomplete 모드, closeOnSelect 등 설정
- Behavior: 키보드/입력/클릭 핸들러 (순수 함수)
- Effect: 스크롤, 포커스, 리스너 관리

특이사항:
- aria-activedescendant로 가상 포커스 관리
- inline autocomplete는 selection range로 구현
```

## 6. 핵심 원칙

**"무엇을 어떤 범주로 분류할지"의 기준을 명확히 전달하는 것**

패턴 이름과 범주 구조만 명시하면, AI가 문서에서 해당 범주에 맞는 요소들을 자동으로 매핑할 수 있습니다.

### 필수 요소
- 참조 스펙 URL
- 적용할 패턴 이름
- 범주 구조 (state, context, behavior, effect)

### 선택 요소
- 핵심 상태값 힌트
- 특수한 구현 요구사항
- 기존 코드베이스의 컨벤션 참조
