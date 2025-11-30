# Menu

중첩(dropdown → submenu → submenu …) 구조를 지원하는 Menu 컴포넌트입니다.  
다단계 메뉴 전체를 하나의 트리로 관리하며, 키보드 네비게이션・포커스 이동・위치 계산 등을 모두 기본 제공합니다.

---

## 주요 특징

- **중첩 메뉴(Nested Menu)**  
  원하는 만큼 깊이 있는 메뉴 트리를 만들 수 있습니다.

- **트리 단위의 상태 관리**  
  메뉴가 여러 단계로 열려도 전체 상태를 하나의 경로 형태로 관리하여  
  “어떤 메뉴가 열렸는지”가 항상 일관되게 유지됩니다.

- **자동 포커스 이동**  
  메뉴가 열리면 첫/마지막 아이템으로 포커스 이동,  
  로빙 탭 인덱스(roving tabIndex) 기반 키보드 컨트롤을 제공합니다.

- **Floating UI 기반 위치 계산**  
  메뉴 콘텐츠는 트리거 위치에 따라 정확한 위치로 자동 배치되며,  
  화면 경계에 따라 flip・shift가 자동 적용됩니다.

- **Presence 기반 진입/퇴장 애니메이션**  
  `usePresence` 훅을 통해 상태 기반 애니메이션을 쉽게 구현할 수 있습니다.

- **접근성 패턴 준수**  
  ARIA role(`menu`, `menuitem`, `aria-expanded`, `aria-haspopup`)을 기본 제공하며,  
  Tab / Shift+Tab / Escape / ArrowKey 등 WAI-ARIA Menu Patterns에 맞춘 인터랙션을 제공합니다.

---

## 기본 사용법

```tsx
import Menu from './Menu'

function Example() {
  return (
    <Menu.Root>
      <Menu.Trigger>Options</Menu.Trigger>

      <Menu.Positioner>
        <Menu.Content>
          <Menu.ActionItem value="new">New File</Menu.ActionItem>
          <Menu.ActionItem value="open">Open…</Menu.ActionItem>

          <Menu.SubRoot menuId="share">
            <Menu.SubTrigger>Share</Menu.SubTrigger>

            <Menu.Positioner placement="right-start">
              <Menu.SubContent>
                <Menu.ActionItem value="share:email">Email</Menu.ActionItem>
                <Menu.ActionItem value="share:link">Copy link</Menu.ActionItem>
              </Menu.SubContent>
            </Menu.Positioner>
          </Menu.SubRoot>

          <Menu.LinkItem href="/help" value="help">
            Help
          </Menu.LinkItem>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  )
}
```

---

## 컴포넌트 구조

### `Menu.Root`

메뉴 트리의 최상위 진입점입니다.  
여기서부터 전체 메뉴의 열림 상태가 관리됩니다.

- 메뉴 외부 클릭 시 전체 메뉴 자동 닫힘
- 컨트롤드 / 언컨트롤드 모드 지원  
  (`openedMenus`, `defaultOpenedMenus`, `onOpenedMenusChange`)

### `Menu.SubRoot`

서브 메뉴의 루트입니다.  
`Menu.Root` 내부에서만 사용할 수 있으며, 동일한 트리 상태를 이어받습니다.

### `Menu.Trigger`

최상위 메뉴를 여는 버튼입니다.  
기본 클릭/키보드 동작이 포함되어 있습니다.

### `Menu.SubTrigger`

부모 메뉴 안에서 **menuitem + submenu trigger** 역할을 동시에 수행합니다.

### `Menu.Content` / `Menu.SubContent`

루트 및 서브 메뉴의 실제 메뉴 목록을 감싸는 컨테이너입니다.

- `role="menu"`
- presence 기반 진입/퇴장 제어
- `data-transition` 상태 제공 (CSS 애니메이션 적용 용이)

### `Menu.Positioner`

Floating UI를 이용해 Trigger 기준으로 콘텐츠를 배치합니다.

- `placement`
- `flipOptions`, `shiftOptions`
- arrow 미들웨어 지원 (`Menu.PositionerArrow`)

### `Menu.ActionItem`

버튼 형태의 메뉴 아이템입니다.

- 선택 시 메뉴 트리 전체 닫힘
- 최상위 Trigger로 포커스 복구

### `Menu.LinkItem`

`a` 태그 기반 아이템  
스페이스 키로 클릭 동작을 호출하는 등 접근성 패턴을 내장합니다.

### `Menu.Portal`

포털 렌더링을 위한 thin wrapper 입니다.

---

## 키보드 인터랙션

- **ArrowDown / ArrowUp**
  - Trigger에서 메뉴 열기 + 첫/마지막 아이템 포커스
  - 메뉴 안에서는 아이템 간 순환 이동
- **ArrowRight**
  - SubTrigger에서 서브 메뉴 열고 바로 첫 아이템 이동
- **ArrowLeft**
  - 서브 메뉴에서 부모 메뉴로 돌아가기
- **Escape**
  - 현재 메뉴 닫기
- **Tab / Shift+Tab**
  - Tab: 메뉴 전체 닫히고, 다음 포커스로 이동
  - Shift+Tab: 현재 메뉴만 닫히고, Trigger로 포커스 복귀

---

## 스타일링 가이드

아래 속성이 자동으로 적용됩니다.

- `role="menu"`, `role="menuitem"`
- `aria-expanded`, `aria-haspopup`
- `data-transition`  
  → CSS에서 `[data-transition="entering"]`, `[data-transition="exiting"]` 같은 방식으로 사용

예시:

```css
[data-transition='enter'] {
  opacity: 0;
  transform: scale(0.95);
}

[data-transition='entering'] {
  opacity: 1;
  transform: scale(1);
  transition: all 120ms ease-out;
}

[data-transition='exit'] {
  opacity: 1;
}

[data-transition='exiting'] {
  opacity: 0;
  transform: scale(0.98);
  transition: all 80ms ease-in;
}
```

---

## 접근성

- 모든 포커스 이동은 roving tab index 패턴으로 제어됩니다.
- 메뉴가 닫힐 때 포커스가 항상 **Trigger로 복구**되도록 설계되었습니다.
- `Space` → LinkItem에서 버튼처럼 동작
- `Escape`, `Arrow` 키 등 WAI-ARIA 메뉴 패턴 준수

---

## 요약

이 Menu 컴포넌트는 다음을 목표로 합니다.

- 중첩 메뉴의 모든 UI/키보드 규칙을 내부적으로 완전 자동화
- 하나의 트리로 상태를 관리하여 복잡한 cascade 메뉴도 안정적으로 제어
- Floating UI + Presence 조합으로 높은 품질의 UI 표현
- 직접 각 단계의 state/effect를 고민할 필요 없이 직관적인 사용 경험 제공
