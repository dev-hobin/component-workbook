/**
 * 예시 2: Disclosure
 * 
 * 조건부 핸들러와 effects 사용
 * - 조건부 규칙 (when)
 * - effects (enter/exit)
 * - createEventMachine으로 actions 타입 추론
 */

import { useState, useMemo, useRef } from 'react';
import { useEventMachine, createEventMachine } from '../index';

// ============================================
// 1. Context 타입 정의
// ============================================

type DisclosureContext = {
  isOpen: boolean;
  disabled: boolean;
  getContentElement: () => HTMLDivElement | null;
  setIsOpen: (v: boolean) => void;
};

// ============================================
// 2. Events 타입 정의
// ============================================

type DisclosureEvents = {
  TOGGLE: undefined;
  OPEN: undefined;
  CLOSE: undefined;
};

// ============================================
// 3. Machine 정의 (createEventMachine 사용)
// ============================================

const disclosureMachine = createEventMachine<
  DisclosureContext, 
  DisclosureEvents, 
  Record<string, never>,
  'noop' | 'open' | 'close'  // 액션 이름들
>({
  on: {
    // 조건부 핸들러: 첫 번째 매칭 규칙 실행
    TOGGLE: [
      { when: (ctx) => ctx.disabled, do: 'noop' },
      { when: (ctx) => ctx.isOpen, do: 'close' },
      { do: 'open' },  // default (when 없음)
    ],

    OPEN: [
      { when: (ctx) => ctx.disabled, do: 'noop' },
      { when: (ctx) => ctx.isOpen, do: 'noop' },  // 이미 열림
      { do: 'open' },
    ],

    CLOSE: [
      { when: (ctx) => ctx.disabled, do: 'noop' },
      { when: (ctx) => !ctx.isOpen, do: 'noop' },  // 이미 닫힘
      { do: 'close' },
    ],
  },

  // effects: watch 값이 변할 때 실행
  effects: [
    {
      watch: (ctx) => ctx.isOpen,
      enter: (ctx) => {
        // isOpen이 false → true 될 때
        console.log('Disclosure opened');
        ctx.getContentElement()?.focus();
      },
      exit: () => {
        // isOpen이 true → false 될 때
        console.log('Disclosure closed');
      },
    },
  ],

  actions: {
    noop: () => {},
    open: (ctx) => ctx.setIsOpen(true),
    close: (ctx) => ctx.setIsOpen(false),
  },
});

// ============================================
// 4. Hook
// ============================================

type UseDisclosureProps = {
  defaultOpen?: boolean;
  disabled?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
};

export function useDisclosure(props: UseDisclosureProps = {}) {
  const { defaultOpen = false, disabled = false } = props;

  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);

  const ctx = useMemo<DisclosureContext>(
    () => ({ isOpen, disabled, getContentElement: () => contentRef.current, setIsOpen }),
    [isOpen, disabled]
  );

  const { send } = useEventMachine(disclosureMachine, ctx);

  return {
    isOpen,
    disabled,
    contentRef,
    toggle: () => send('TOGGLE'),
    open: () => send('OPEN'),
    close: () => send('CLOSE'),

    // Props getters
    getTriggerProps: () => ({
      'aria-expanded': isOpen,
      'aria-disabled': disabled || undefined,
      onClick: () => send('TOGGLE'),
    }),

    getContentProps: () => ({
      ref: contentRef,
      hidden: !isOpen,
      tabIndex: -1,
    }),
  };
}

// ============================================
// 5. 사용 예시
// ============================================

/*
function Accordion() {
  const disclosure = useDisclosure({ defaultOpen: false });

  return (
    <div>
      <button {...disclosure.getTriggerProps()}>
        {disclosure.isOpen ? '닫기' : '열기'}
      </button>
      <div {...disclosure.getContentProps()}>
        <p>숨겨진 컨텐츠입니다.</p>
      </div>
    </div>
  );
}
*/
