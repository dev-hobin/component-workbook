// ============================================
// Combobox Core - 순수 함수 모듈
// ============================================
// W3C APG Combobox 패턴 구현
// https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
// ============================================

// ============================================
// 1. STATE - 컴포넌트 상태 타입
// ============================================

export type OptionId = string

/**
 * Autocomplete 동작 방식
 * - none: 입력과 무관하게 항상 같은 옵션 표시
 * - list: 입력에 따라 옵션 필터링, 수동 선택
 * - inline: 첫 번째 매칭 옵션을 인라인으로 자동완성
 * - both: list + inline 조합
 */
export type AutocompleteMode = 'none' | 'list' | 'inline' | 'both'

/**
 * Combobox 상태
 */
export type ComboboxState = {
  // Popup 상태
  isOpen: boolean

  // 입력값
  inputValue: string

  // 선택된 값 (실제로 확정된 값)
  selectedValue: string | null

  // 하이라이트된 옵션 (키보드 탐색 중)
  highlightedOptionId: OptionId | null

  // Inline autocomplete 시 자동완성된 텍스트
  autocompleteText: string | null
}

/**
 * Combobox 옵션 정보
 */
export type ComboboxOption = {
  id: OptionId
  value: string
  label: string
  disabled?: boolean
}

// ============================================
// 2. CONTEXT - 동작 설정
// ============================================

/**
 * Combobox 동작 설정
 */
export type ComboboxContext = {
  // Autocomplete 모드
  autocomplete: AutocompleteMode

  // 열기 방식
  openOnFocus: boolean

  // 선택 시 popup 닫기
  closeOnSelect: boolean

  // 빈 입력에서 열었을 때 모든 옵션 표시
  showAllOnEmpty: boolean

  // 선택 후 입력값 초기화
  clearOnSelect: boolean

  // loop navigation
  loop: boolean
}

export function createDefaultContext(): ComboboxContext {
  return {
    autocomplete: 'list',
    openOnFocus: false,
    closeOnSelect: true,
    showAllOnEmpty: true,
    clearOnSelect: false,
    loop: true,
  }
}

// ============================================
// 3. STATUS - 상태 파생 (Effect 트리거용)
// ============================================

export type ComboboxStatus = 'idle' | 'closed' | 'open'

export function deriveStatus(state: ComboboxState): ComboboxStatus {
  return state.isOpen ? 'open' : 'closed'
}

// ============================================
// 4. EFFECTS - 부수효과 명세
// ============================================

export type ComboboxEffect =
  // Popup 관련
  | { type: 'ADD_OUTSIDE_CLICK_LISTENER' }
  | { type: 'REMOVE_OUTSIDE_CLICK_LISTENER' }
  // 키보드 리스너
  | { type: 'ADD_KEYBOARD_LISTENER' }
  | { type: 'REMOVE_KEYBOARD_LISTENER' }
  // 포커스 관리
  | { type: 'FOCUS_INPUT' }
  | { type: 'SET_INPUT_SELECTION'; start: number; end: number }
  // aria-activedescendant 업데이트 (DOM focus는 input에 유지)
  | { type: 'UPDATE_ACTIVE_DESCENDANT'; optionId: OptionId | null }
  // 스크롤
  | { type: 'SCROLL_OPTION_INTO_VIEW'; optionId: OptionId }
  // 선택 이벤트
  | { type: 'NOTIFY_SELECT'; value: string }

// ============================================
// STATE 생성
// ============================================

export function createComboboxState(
  defaultValue?: string | null,
): ComboboxState {
  return {
    isOpen: false,
    inputValue: defaultValue ?? '',
    selectedValue: defaultValue ?? null,
    highlightedOptionId: null,
    autocompleteText: null,
  }
}

// ============================================
// STATE 업데이트 - Popup
// ============================================

/**
 * Popup 열기
 */
export function openPopup(state: ComboboxState): ComboboxState {
  if (state.isOpen) return state
  return {
    ...state,
    isOpen: true,
  }
}

/**
 * Popup 닫기
 */
export function closePopup(state: ComboboxState): ComboboxState {
  if (!state.isOpen) return state
  return {
    ...state,
    isOpen: false,
    highlightedOptionId: null,
    autocompleteText: null,
  }
}

/**
 * Popup 토글
 */
export function togglePopup(state: ComboboxState): ComboboxState {
  return state.isOpen ? closePopup(state) : openPopup(state)
}

// ============================================
// STATE 업데이트 - 입력값
// ============================================

/**
 * 입력값 변경
 */
export function setInputValue(
  state: ComboboxState,
  value: string,
): ComboboxState {
  return {
    ...state,
    inputValue: value,
    // 입력 변경 시 자동완성 텍스트 초기화
    autocompleteText: null,
  }
}

/**
 * 입력값 변경 + Popup 열기
 */
export function setInputValueAndOpen(
  state: ComboboxState,
  value: string,
): ComboboxState {
  return {
    ...state,
    inputValue: value,
    isOpen: true,
    autocompleteText: null,
  }
}

/**
 * 입력값 초기화
 */
export function clearInputValue(state: ComboboxState): ComboboxState {
  return {
    ...state,
    inputValue: '',
    autocompleteText: null,
  }
}

// ============================================
// STATE 업데이트 - 옵션 하이라이트
// ============================================

/**
 * 옵션 하이라이트
 */
export function highlightOption(
  state: ComboboxState,
  optionId: OptionId | null,
): ComboboxState {
  if (state.highlightedOptionId === optionId) return state
  return {
    ...state,
    highlightedOptionId: optionId,
  }
}

/**
 * 첫 번째 옵션으로 하이라이트
 */
export function highlightFirstOption(
  state: ComboboxState,
  options: ComboboxOption[],
): ComboboxState {
  const enabledOptions = options.filter((opt) => !opt.disabled)
  if (enabledOptions.length === 0) {
    return highlightOption(state, null)
  }
  return highlightOption(state, enabledOptions[0].id)
}

/**
 * 마지막 옵션으로 하이라이트
 */
export function highlightLastOption(
  state: ComboboxState,
  options: ComboboxOption[],
): ComboboxState {
  const enabledOptions = options.filter((opt) => !opt.disabled)
  if (enabledOptions.length === 0) {
    return highlightOption(state, null)
  }
  return highlightOption(state, enabledOptions[enabledOptions.length - 1].id)
}

/**
 * 다음 옵션으로 하이라이트
 */
export function highlightNextOption(
  state: ComboboxState,
  options: ComboboxOption[],
  context: ComboboxContext,
): ComboboxState {
  const enabledOptions = options.filter((opt) => !opt.disabled)
  if (enabledOptions.length === 0) return state

  if (state.highlightedOptionId === null) {
    return highlightOption(state, enabledOptions[0].id)
  }

  const currentIndex = enabledOptions.findIndex(
    (opt) => opt.id === state.highlightedOptionId,
  )

  if (currentIndex === -1) {
    return highlightOption(state, enabledOptions[0].id)
  }

  const nextIndex = currentIndex + 1
  if (nextIndex >= enabledOptions.length) {
    // loop이면 처음으로, 아니면 현재 유지
    return context.loop
      ? highlightOption(state, enabledOptions[0].id)
      : state
  }

  return highlightOption(state, enabledOptions[nextIndex].id)
}

/**
 * 이전 옵션으로 하이라이트
 */
export function highlightPrevOption(
  state: ComboboxState,
  options: ComboboxOption[],
  context: ComboboxContext,
): ComboboxState {
  const enabledOptions = options.filter((opt) => !opt.disabled)
  if (enabledOptions.length === 0) return state

  if (state.highlightedOptionId === null) {
    return highlightOption(state, enabledOptions[enabledOptions.length - 1].id)
  }

  const currentIndex = enabledOptions.findIndex(
    (opt) => opt.id === state.highlightedOptionId,
  )

  if (currentIndex === -1) {
    return highlightOption(state, enabledOptions[enabledOptions.length - 1].id)
  }

  const prevIndex = currentIndex - 1
  if (prevIndex < 0) {
    // loop이면 마지막으로, 아니면 현재 유지
    return context.loop
      ? highlightOption(state, enabledOptions[enabledOptions.length - 1].id)
      : state
  }

  return highlightOption(state, enabledOptions[prevIndex].id)
}

// ============================================
// STATE 업데이트 - 선택
// ============================================

/**
 * 옵션 선택
 */
export function selectOption(
  state: ComboboxState,
  option: ComboboxOption,
  context: ComboboxContext,
): ComboboxState {
  const newInputValue = context.clearOnSelect ? '' : option.label

  return {
    ...state,
    selectedValue: option.value,
    inputValue: newInputValue,
    isOpen: context.closeOnSelect ? false : state.isOpen,
    highlightedOptionId: context.closeOnSelect ? null : state.highlightedOptionId,
    autocompleteText: null,
  }
}

/**
 * 현재 하이라이트된 옵션 선택
 */
export function selectHighlightedOption(
  state: ComboboxState,
  options: ComboboxOption[],
  context: ComboboxContext,
): ComboboxState {
  if (state.highlightedOptionId === null) return state

  const option = options.find((opt) => opt.id === state.highlightedOptionId)
  if (!option || option.disabled) return state

  return selectOption(state, option, context)
}

/**
 * 선택 해제
 */
export function clearSelection(state: ComboboxState): ComboboxState {
  return {
    ...state,
    selectedValue: null,
    inputValue: '',
    autocompleteText: null,
  }
}

// ============================================
// STATE 업데이트 - Inline Autocomplete
// ============================================

/**
 * Inline autocomplete 텍스트 설정
 * inline/both 모드에서 사용
 */
export function setAutocompleteText(
  state: ComboboxState,
  text: string | null,
): ComboboxState {
  return {
    ...state,
    autocompleteText: text,
  }
}

/**
 * 첫 번째 매칭 옵션으로 inline autocomplete 수행
 */
export function applyInlineAutocomplete(
  state: ComboboxState,
  options: ComboboxOption[],
  context: ComboboxContext,
): ComboboxState {
  // inline 또는 both 모드에서만 동작
  if (context.autocomplete !== 'inline' && context.autocomplete !== 'both') {
    return state
  }

  // 입력값이 없으면 autocomplete 없음
  if (state.inputValue.length === 0) {
    return setAutocompleteText(state, null)
  }

  // 첫 번째 매칭 옵션 찾기
  const inputLower = state.inputValue.toLowerCase()
  const matchingOption = options.find(
    (opt) =>
      !opt.disabled && opt.label.toLowerCase().startsWith(inputLower),
  )

  if (!matchingOption) {
    return setAutocompleteText(state, null)
  }

  // 나머지 텍스트를 autocomplete로 설정
  const autocompleteText = matchingOption.label.slice(state.inputValue.length)

  return {
    ...highlightOption(state, matchingOption.id),
    autocompleteText,
  }
}

/**
 * Autocomplete 수락 (Tab 키 등)
 */
export function acceptAutocomplete(state: ComboboxState): ComboboxState {
  if (state.autocompleteText === null) return state

  return {
    ...state,
    inputValue: state.inputValue + state.autocompleteText,
    autocompleteText: null,
  }
}

// ============================================
// BEHAVIOR - 옵션 필터링
// ============================================

/**
 * 입력값으로 옵션 필터링
 */
export function filterOptions(
  options: ComboboxOption[],
  inputValue: string,
  context: ComboboxContext,
): ComboboxOption[] {
  // none 모드: 필터링 없음
  if (context.autocomplete === 'none') {
    return options
  }

  // 빈 입력: showAllOnEmpty 설정에 따라
  if (inputValue.length === 0) {
    return context.showAllOnEmpty ? options : []
  }

  // 입력값으로 시작하는 옵션 필터링 (case-insensitive)
  const inputLower = inputValue.toLowerCase()
  return options.filter((opt) =>
    opt.label.toLowerCase().startsWith(inputLower),
  )
}

/**
 * 옵션이 매칭되는지 확인
 */
export function isOptionMatching(
  option: ComboboxOption,
  inputValue: string,
): boolean {
  if (inputValue.length === 0) return true
  return option.label.toLowerCase().startsWith(inputValue.toLowerCase())
}

// ============================================
// BEHAVIOR - 쿼리 함수
// ============================================

/**
 * 옵션이 하이라이트되어 있는지 확인
 */
export function isHighlighted(
  state: ComboboxState,
  optionId: OptionId,
): boolean {
  return state.highlightedOptionId === optionId
}

/**
 * 옵션이 선택되어 있는지 확인
 */
export function isSelected(
  state: ComboboxState,
  option: ComboboxOption,
): boolean {
  return state.selectedValue === option.value
}

/**
 * 표시할 입력값 (autocomplete 포함)
 */
export function getDisplayValue(state: ComboboxState): string {
  if (state.autocompleteText) {
    return state.inputValue + state.autocompleteText
  }
  return state.inputValue
}

/**
 * 선택 범위 계산 (inline autocomplete용)
 * autocomplete 텍스트 부분만 선택되도록
 */
export function getSelectionRange(
  state: ComboboxState,
): { start: number; end: number } | null {
  if (state.autocompleteText === null) return null

  return {
    start: state.inputValue.length,
    end: state.inputValue.length + state.autocompleteText.length,
  }
}

// ============================================
// BEHAVIOR - 키보드 액션
// ============================================

export type KeyboardAction =
  | { type: 'ARROW_DOWN' }
  | { type: 'ARROW_UP' }
  | { type: 'ENTER' }
  | { type: 'ESCAPE' }
  | { type: 'HOME' }
  | { type: 'END' }
  | { type: 'TAB' }
  | { type: 'ALT_ARROW_DOWN' }

export type KeyboardActionResult = {
  state: ComboboxState
  effects: ComboboxEffect[]
  // 이벤트 기본 동작 방지 여부
  preventDefault: boolean
}

/**
 * 키보드 액션 처리
 */
export function handleKeyboardAction(
  state: ComboboxState,
  action: KeyboardAction,
  options: ComboboxOption[],
  context: ComboboxContext,
): KeyboardActionResult {
  switch (action.type) {
    case 'ARROW_DOWN': {
      if (!state.isOpen) {
        // 닫혀있으면 열기
        const newState = openPopup(state)
        const withHighlight = highlightFirstOption(newState, options)
        return {
          state: withHighlight,
          effects: withHighlight.highlightedOptionId
            ? [
                { type: 'UPDATE_ACTIVE_DESCENDANT', optionId: withHighlight.highlightedOptionId },
                { type: 'SCROLL_OPTION_INTO_VIEW', optionId: withHighlight.highlightedOptionId },
              ]
            : [],
          preventDefault: true,
        }
      }

      // 열려있으면 다음 옵션으로
      const newState = highlightNextOption(state, options, context)
      return {
        state: newState,
        effects: newState.highlightedOptionId
          ? [
              { type: 'UPDATE_ACTIVE_DESCENDANT', optionId: newState.highlightedOptionId },
              { type: 'SCROLL_OPTION_INTO_VIEW', optionId: newState.highlightedOptionId },
            ]
          : [],
        preventDefault: true,
      }
    }

    case 'ARROW_UP': {
      if (!state.isOpen) {
        // 닫혀있으면 열고 마지막으로
        const newState = openPopup(state)
        const withHighlight = highlightLastOption(newState, options)
        return {
          state: withHighlight,
          effects: withHighlight.highlightedOptionId
            ? [
                { type: 'UPDATE_ACTIVE_DESCENDANT', optionId: withHighlight.highlightedOptionId },
                { type: 'SCROLL_OPTION_INTO_VIEW', optionId: withHighlight.highlightedOptionId },
              ]
            : [],
          preventDefault: true,
        }
      }

      // 열려있으면 이전 옵션으로
      const newState = highlightPrevOption(state, options, context)
      return {
        state: newState,
        effects: newState.highlightedOptionId
          ? [
              { type: 'UPDATE_ACTIVE_DESCENDANT', optionId: newState.highlightedOptionId },
              { type: 'SCROLL_OPTION_INTO_VIEW', optionId: newState.highlightedOptionId },
            ]
          : [],
        preventDefault: true,
      }
    }

    case 'ALT_ARROW_DOWN': {
      // Alt+Down: 포커스 이동 없이 popup 열기
      if (state.isOpen) {
        return { state, effects: [], preventDefault: true }
      }
      return {
        state: openPopup(state),
        effects: [],
        preventDefault: true,
      }
    }

    case 'ENTER': {
      if (!state.isOpen) {
        return { state, effects: [], preventDefault: false }
      }

      // 하이라이트된 옵션 찾기
      if (state.highlightedOptionId === null) {
        // 선택할 옵션이 없으면 그냥 닫기
        return {
          state: closePopup(state),
          effects: [{ type: 'UPDATE_ACTIVE_DESCENDANT', optionId: null }],
          preventDefault: true,
        }
      }

      const option = options.find((opt) => opt.id === state.highlightedOptionId)
      if (!option || option.disabled) {
        return {
          state: closePopup(state),
          effects: [{ type: 'UPDATE_ACTIVE_DESCENDANT', optionId: null }],
          preventDefault: true,
        }
      }

      // 옵션 선택
      const newState = selectOption(state, option, context)
      return {
        state: newState,
        effects: [
          { type: 'UPDATE_ACTIVE_DESCENDANT', optionId: null },
          { type: 'NOTIFY_SELECT', value: option.value },
        ],
        preventDefault: true,
      }
    }

    case 'ESCAPE': {
      if (!state.isOpen) {
        // 닫혀있으면 입력값 초기화 (선택된 값으로)
        if (state.selectedValue && state.inputValue !== state.selectedValue) {
          // 선택된 값이 있으면 그 값으로 복원
          const matchingOption = options.find(
            (opt) => opt.value === state.selectedValue,
          )
          return {
            state: setInputValue(state, matchingOption?.label ?? ''),
            effects: [],
            preventDefault: true,
          }
        }
        return { state, effects: [], preventDefault: false }
      }

      // Popup 닫기
      return {
        state: closePopup(state),
        effects: [{ type: 'UPDATE_ACTIVE_DESCENDANT', optionId: null }],
        preventDefault: true,
      }
    }

    case 'HOME': {
      if (!state.isOpen) {
        return { state, effects: [], preventDefault: false }
      }

      const newState = highlightFirstOption(state, options)
      return {
        state: newState,
        effects: newState.highlightedOptionId
          ? [
              { type: 'UPDATE_ACTIVE_DESCENDANT', optionId: newState.highlightedOptionId },
              { type: 'SCROLL_OPTION_INTO_VIEW', optionId: newState.highlightedOptionId },
            ]
          : [],
        preventDefault: true,
      }
    }

    case 'END': {
      if (!state.isOpen) {
        return { state, effects: [], preventDefault: false }
      }

      const newState = highlightLastOption(state, options)
      return {
        state: newState,
        effects: newState.highlightedOptionId
          ? [
              { type: 'UPDATE_ACTIVE_DESCENDANT', optionId: newState.highlightedOptionId },
              { type: 'SCROLL_OPTION_INTO_VIEW', optionId: newState.highlightedOptionId },
            ]
          : [],
        preventDefault: true,
      }
    }

    case 'TAB': {
      // Tab: autocomplete 있으면 수락, 없으면 기본 동작
      if (state.autocompleteText) {
        return {
          state: acceptAutocomplete(state),
          effects: [],
          preventDefault: true,
        }
      }

      // Popup 열려있으면 닫기
      if (state.isOpen) {
        return {
          state: closePopup(state),
          effects: [{ type: 'UPDATE_ACTIVE_DESCENDANT', optionId: null }],
          preventDefault: false, // Tab은 기본 동작 허용
        }
      }

      return { state, effects: [], preventDefault: false }
    }

    default:
      return { state, effects: [], preventDefault: false }
  }
}

// ============================================
// EFFECT - Status 전환에 따른 부수효과
// ============================================

export function getEffectsOnStatusChange(
  prevStatus: ComboboxStatus,
  nextStatus: ComboboxStatus,
): ComboboxEffect[] {
  // idle → open
  if (prevStatus === 'idle' && nextStatus === 'open') {
    return [
      { type: 'ADD_OUTSIDE_CLICK_LISTENER' },
      { type: 'ADD_KEYBOARD_LISTENER' },
    ]
  }

  // idle → closed
  if (prevStatus === 'idle' && nextStatus === 'closed') {
    return []
  }

  // closed → open
  if (prevStatus === 'closed' && nextStatus === 'open') {
    return [
      { type: 'ADD_OUTSIDE_CLICK_LISTENER' },
      { type: 'ADD_KEYBOARD_LISTENER' },
    ]
  }

  // open → closed
  if (prevStatus === 'open' && nextStatus === 'closed') {
    return [
      { type: 'REMOVE_OUTSIDE_CLICK_LISTENER' },
      { type: 'REMOVE_KEYBOARD_LISTENER' },
    ]
  }

  return []
}

// ============================================
// EFFECT - 하이라이트 변경에 따른 부수효과
// ============================================

export function getEffectsOnHighlightChange(
  prevHighlightedId: OptionId | null,
  nextHighlightedId: OptionId | null,
): ComboboxEffect[] {
  if (prevHighlightedId === nextHighlightedId) return []

  const effects: ComboboxEffect[] = [
    { type: 'UPDATE_ACTIVE_DESCENDANT', optionId: nextHighlightedId },
  ]

  if (nextHighlightedId) {
    effects.push({ type: 'SCROLL_OPTION_INTO_VIEW', optionId: nextHighlightedId })
  }

  return effects
}

// ============================================
// BEHAVIOR - 입력 변경 처리
// ============================================

export type InputChangeResult = {
  state: ComboboxState
  effects: ComboboxEffect[]
}

/**
 * 입력값 변경 시 전체 상태 업데이트
 */
export function handleInputChange(
  state: ComboboxState,
  value: string,
  options: ComboboxOption[],
  context: ComboboxContext,
): InputChangeResult {
  // 1. 입력값 업데이트 + popup 열기
  let newState = setInputValueAndOpen(state, value)

  // 2. 필터링된 옵션 확인
  const filteredOptions = filterOptions(options, value, context)

  // 3. Inline autocomplete 적용 (해당 모드인 경우)
  if (context.autocomplete === 'inline' || context.autocomplete === 'both') {
    newState = applyInlineAutocomplete(newState, filteredOptions, context)
  } else if (filteredOptions.length > 0) {
    // list 모드: 첫 번째 매칭 옵션 하이라이트
    newState = highlightFirstOption(newState, filteredOptions)
  } else {
    newState = highlightOption(newState, null)
  }

  const effects: ComboboxEffect[] = []

  // 4. 하이라이트 변경 effects
  if (newState.highlightedOptionId !== state.highlightedOptionId) {
    effects.push({
      type: 'UPDATE_ACTIVE_DESCENDANT',
      optionId: newState.highlightedOptionId,
    })
    if (newState.highlightedOptionId) {
      effects.push({
        type: 'SCROLL_OPTION_INTO_VIEW',
        optionId: newState.highlightedOptionId,
      })
    }
  }

  // 5. Selection range 설정 (inline autocomplete용)
  const selectionRange = getSelectionRange(newState)
  if (selectionRange) {
    effects.push({
      type: 'SET_INPUT_SELECTION',
      start: selectionRange.start,
      end: selectionRange.end,
    })
  }

  return { state: newState, effects }
}

// ============================================
// BEHAVIOR - 포커스 처리
// ============================================

/**
 * Input 포커스 시 처리
 */
export function handleInputFocus(
  state: ComboboxState,
  options: ComboboxOption[],
  context: ComboboxContext,
): ComboboxState {
  if (!context.openOnFocus) return state

  // 이미 열려있으면 그대로
  if (state.isOpen) return state

  // Popup 열기
  const newState = openPopup(state)

  // 선택된 값이 있으면 해당 옵션 하이라이트
  if (state.selectedValue) {
    const selectedOption = options.find(
      (opt) => opt.value === state.selectedValue,
    )
    if (selectedOption) {
      return highlightOption(newState, selectedOption.id)
    }
  }

  return newState
}

/**
 * Input blur 시 처리
 */
export function handleInputBlur(
  state: ComboboxState,
  context: ComboboxContext,
): ComboboxState {
  // Popup이 닫혀있으면 아무것도 안함
  if (!state.isOpen) return state

  // Autocomplete가 있으면 수락
  if (state.autocompleteText) {
    return closePopup(acceptAutocomplete(state))
  }

  // List with automatic selection: 하이라이트된 옵션 선택
  if (
    (context.autocomplete === 'list' || context.autocomplete === 'both') &&
    state.highlightedOptionId
  ) {
    // 이 경우 Shell에서 selectHighlightedOption 호출 필요
  }

  return closePopup(state)
}

// ============================================
// BEHAVIOR - 외부 클릭 처리
// ============================================

/**
 * 외부 클릭 시 처리
 */
export function handleOutsideClick(state: ComboboxState): ComboboxState {
  if (!state.isOpen) return state
  return closePopup(state)
}

// ============================================
// BEHAVIOR - 옵션 클릭 처리
// ============================================

export type OptionClickResult = {
  state: ComboboxState
  effects: ComboboxEffect[]
}

/**
 * 옵션 클릭 시 처리
 */
export function handleOptionClick(
  state: ComboboxState,
  option: ComboboxOption,
  context: ComboboxContext,
): OptionClickResult {
  if (option.disabled) {
    return { state, effects: [] }
  }

  const newState = selectOption(state, option, context)
  const effects: ComboboxEffect[] = [{ type: 'NOTIFY_SELECT', value: option.value }]

  return { state: newState, effects }
}

/**
 * 옵션 호버 시 처리
 */
export function handleOptionHover(
  state: ComboboxState,
  optionId: OptionId,
): ComboboxState {
  return highlightOption(state, optionId)
}
