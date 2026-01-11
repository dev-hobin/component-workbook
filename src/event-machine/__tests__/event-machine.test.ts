import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'
import { createEventMachine, useEventMachine } from '../index'

describe('createEventMachine', () => {
  describe('단일 액션', () => {
    it('문자열로 단일 액션 실행', () => {
      const onOpen = vi.fn()

      const machine = createEventMachine<{
        input: { onOpen: () => void }
        events: { OPEN: undefined }
        actions: 'open'
      }>({
        on: {
          OPEN: 'open',
        },
        actions: {
          open: (ctx) => ctx.onOpen(),
        },
      })

      machine.send('OPEN', { onOpen })

      expect(onOpen).toHaveBeenCalledTimes(1)
    })
  })

  describe('복수 액션', () => {
    it('배열로 복수 액션 순차 실행', () => {
      const calls: string[] = []
      const onSelect = vi.fn(() => calls.push('select'))
      const onClose = vi.fn(() => calls.push('close'))

      const machine = createEventMachine<{
        input: { onSelect: () => void; onClose: () => void }
        events: { SELECT: undefined }
        actions: 'select' | 'close'
      }>({
        on: {
          SELECT: ['select', 'close'],
        },
        actions: {
          select: (ctx) => ctx.onSelect(),
          close: (ctx) => ctx.onClose(),
        },
      })

      machine.send('SELECT', { onSelect, onClose })

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(calls).toEqual(['select', 'close'])
    })

    it('3개 이상의 액션도 순차 실행', () => {
      const calls: string[] = []
      const input = {
        onA: vi.fn(() => calls.push('a')),
        onB: vi.fn(() => calls.push('b')),
        onC: vi.fn(() => calls.push('c')),
      }

      const machine = createEventMachine<{
        input: { onA: () => void; onB: () => void; onC: () => void }
        events: { DO_ALL: undefined }
        actions: 'a' | 'b' | 'c'
      }>({
        on: {
          DO_ALL: ['a', 'b', 'c'],
        },
        actions: {
          a: (ctx) => ctx.onA(),
          b: (ctx) => ctx.onB(),
          c: (ctx) => ctx.onC(),
        },
      })

      machine.send('DO_ALL', input)

      expect(calls).toEqual(['a', 'b', 'c'])
    })
  })

  describe('조건부 액션 (Rule[])', () => {
    it('첫 번째 매칭 규칙만 실행', () => {
      const onOpen = vi.fn()
      const onClose = vi.fn()

      const machine = createEventMachine<{
        input: { isOpen: boolean; onOpen: () => void; onClose: () => void }
        events: { TOGGLE: undefined }
        actions: 'open' | 'close'
      }>({
        on: {
          TOGGLE: [
            { when: (ctx) => ctx.isOpen, do: 'close' },
            { do: 'open' },
          ],
        },
        actions: {
          open: (ctx) => ctx.onOpen(),
          close: (ctx) => ctx.onClose(),
        },
      })

      // isOpen: true → close 실행
      machine.send('TOGGLE', { isOpen: true, onOpen, onClose })
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onOpen).toHaveBeenCalledTimes(0)

      // isOpen: false → open 실행
      machine.send('TOGGLE', { isOpen: false, onOpen, onClose })
      expect(onOpen).toHaveBeenCalledTimes(1)
    })
  })

  describe('조건부 + 복수 액션', () => {
    it('Rule의 do에 배열 사용', () => {
      const calls: string[] = []
      const input = {
        isValid: true,
        onSave: vi.fn(() => calls.push('save')),
        onClose: vi.fn(() => calls.push('close')),
        onNotify: vi.fn(() => calls.push('notify')),
        onError: vi.fn(() => calls.push('error')),
      }

      const machine = createEventMachine<{
        input: {
          isValid: boolean
          onSave: () => void
          onClose: () => void
          onNotify: () => void
          onError: () => void
        }
        events: { CONFIRM: undefined }
        actions: 'save' | 'close' | 'notify' | 'error'
      }>({
        on: {
          CONFIRM: [
            { when: (ctx) => !ctx.isValid, do: 'error' },
            { do: ['save', 'close', 'notify'] },
          ],
        },
        actions: {
          save: (ctx) => ctx.onSave(),
          close: (ctx) => ctx.onClose(),
          notify: (ctx) => ctx.onNotify(),
          error: (ctx) => ctx.onError(),
        },
      })

      // isValid: true → save, close, notify 순차 실행
      machine.send('CONFIRM', input)

      expect(input.onError).not.toHaveBeenCalled()
      expect(calls).toEqual(['save', 'close', 'notify'])
    })

    it('조건 불충족 시 단일 액션 실행', () => {
      const onError = vi.fn()
      const onSave = vi.fn()

      const machine = createEventMachine<{
        input: { isValid: boolean; onSave: () => void; onError: () => void }
        events: { CONFIRM: undefined }
        actions: 'save' | 'error'
      }>({
        on: {
          CONFIRM: [
            { when: (ctx) => !ctx.isValid, do: 'error' },
            { do: 'save' },
          ],
        },
        actions: {
          save: (ctx) => ctx.onSave(),
          error: (ctx) => ctx.onError(),
        },
      })

      // isValid: false → error만 실행
      machine.send('CONFIRM', { isValid: false, onSave, onError })

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onSave).not.toHaveBeenCalled()
    })
  })

  describe('payload 전달', () => {
    it('복수 액션에서 payload 전달', () => {
      const onSelect = vi.fn()
      const onLog = vi.fn()

      const machine = createEventMachine<{
        input: {
          onSelect: (id: string) => void
          onLog: (id: string) => void
        }
        events: { SELECT: { itemId: string } }
        actions: 'select' | 'log'
      }>({
        on: {
          SELECT: ['select', 'log'],
        },
        actions: {
          select: (ctx, payload) => ctx.onSelect(payload!.itemId),
          log: (ctx, payload) => ctx.onLog(payload!.itemId),
        },
      })

      machine.send('SELECT', { onSelect, onLog }, { itemId: 'item-1' })

      expect(onSelect).toHaveBeenCalledWith('item-1')
      expect(onLog).toHaveBeenCalledWith('item-1')
    })
  })

  describe('computed', () => {
    it('computed 값을 context에서 사용', () => {
      const machine = createEventMachine<{
        input: { page: number; totalCount: number; pageSize: number; onPageChange: (p: number) => void }
        events: { PREV: undefined; NEXT: undefined }
        computed: { hasPrev: boolean; hasNext: boolean }
        actions: 'prev' | 'next' | 'noop'
      }>({
        computed: {
          hasPrev: (input) => input.page > 1,
          hasNext: (input) => input.page < Math.ceil(input.totalCount / input.pageSize),
        },
        on: {
          PREV: [
            { when: (ctx) => ctx.hasPrev, do: 'prev' },
            { do: 'noop' },
          ],
          NEXT: [
            { when: (ctx) => ctx.hasNext, do: 'next' },
            { do: 'noop' },
          ],
        },
        actions: {
          prev: (ctx) => ctx.onPageChange(ctx.page - 1),
          next: (ctx) => ctx.onPageChange(ctx.page + 1),
          noop: () => {},
        },
      })

      const onPageChange = vi.fn()
      const input = { page: 1, totalCount: 30, pageSize: 10, onPageChange }

      // page 1: hasPrev = false, hasNext = true
      machine.send('PREV', input)
      expect(onPageChange).not.toHaveBeenCalled()

      machine.send('NEXT', input)
      expect(onPageChange).toHaveBeenCalledWith(2)
    })
  })
})

// ============================================
// useEventMachine (React Hook)
// ============================================

const toggleMachine = createEventMachine<{
  input: { isOn: boolean; onIsOnChange: (v: boolean) => void }
  events: { TOGGLE: undefined }
  actions: 'toggle'
}>({
  on: {
    TOGGLE: 'toggle',
  },
  actions: {
    toggle: (ctx) => ctx.onIsOnChange(!ctx.isOn),
  },
})

const multiActionMachine = createEventMachine<{
  input: {
    value: string
    isOpen: boolean
    onValueChange: (v: string) => void
    onIsOpenChange: (v: boolean) => void
  }
  events: { SELECT: { itemId: string } }
  actions: 'select' | 'close'
}>({
  on: {
    SELECT: ['select', 'close'],
  },
  actions: {
    select: (ctx, payload) => ctx.onValueChange(payload!.itemId),
    close: (ctx) => ctx.onIsOpenChange(false),
  },
})

const computedMachine = createEventMachine<{
  input: { count: number; onCountChange: (c: number) => void }
  events: { INCREMENT: undefined; DECREMENT: undefined }
  computed: { doubled: number; isPositive: boolean }
  actions: 'increment' | 'decrement'
}>({
  computed: {
    doubled: (input) => input.count * 2,
    isPositive: (input) => input.count > 0,
  },
  on: {
    INCREMENT: 'increment',
    DECREMENT: 'decrement',
  },
  actions: {
    increment: (ctx) => ctx.onCountChange(ctx.count + 1),
    decrement: (ctx) => ctx.onCountChange(ctx.count - 1),
  },
})

describe('useEventMachine', () => {
  describe('기본 동작', () => {
    it('send로 이벤트 발송 및 상태 변경', () => {
      const { result } = renderHook(() => {
        const [isOn, setIsOn] = useState(false)
        return {
          ...useEventMachine(toggleMachine, {
            isOn,
            onIsOnChange: setIsOn,
          }),
          isOn,
        }
      })

      expect(result.current.isOn).toBe(false)

      act(() => {
        result.current.send('TOGGLE')
      })

      expect(result.current.isOn).toBe(true)

      act(() => {
        result.current.send('TOGGLE')
      })

      expect(result.current.isOn).toBe(false)
    })
  })

  describe('복수 액션', () => {
    it('React에서 복수 액션 순차 실행', () => {
      const { result } = renderHook(() => {
        const [value, setValue] = useState('')
        const [isOpen, setIsOpen] = useState(true)
        return {
          ...useEventMachine(multiActionMachine, {
            value,
            isOpen,
            onValueChange: setValue,
            onIsOpenChange: setIsOpen,
          }),
          value,
          isOpen,
        }
      })

      expect(result.current.value).toBe('')
      expect(result.current.isOpen).toBe(true)

      act(() => {
        result.current.send('SELECT', { itemId: 'item-1' })
      })

      // select와 close 모두 실행됨
      expect(result.current.value).toBe('item-1')
      expect(result.current.isOpen).toBe(false)
    })
  })

  describe('computed', () => {
    it('computed 값 반환', () => {
      const { result } = renderHook(() => {
        const [count, setCount] = useState(5)
        return {
          ...useEventMachine(computedMachine, {
            count,
            onCountChange: setCount,
          }),
          count,
        }
      })

      expect(result.current.computed.doubled).toBe(10)
      expect(result.current.computed.isPositive).toBe(true)

      act(() => {
        result.current.send('INCREMENT')
      })

      expect(result.current.count).toBe(6)
      expect(result.current.computed.doubled).toBe(12)
    })

    it('computed 값이 조건부 액션에서 사용됨', () => {
      const conditionalMachine = createEventMachine<{
        input: { count: number; onCountChange: (c: number) => void }
        events: { DECREMENT: undefined }
        computed: { canDecrement: boolean }
        actions: 'decrement' | 'noop'
      }>({
        computed: {
          canDecrement: (input) => input.count > 0,
        },
        on: {
          DECREMENT: [
            { when: (ctx) => ctx.canDecrement, do: 'decrement' },
            { do: 'noop' },
          ],
        },
        actions: {
          decrement: (ctx) => ctx.onCountChange(ctx.count - 1),
          noop: () => {},
        },
      })

      const { result } = renderHook(() => {
        const [count, setCount] = useState(1)
        return {
          ...useEventMachine(conditionalMachine, {
            count,
            onCountChange: setCount,
          }),
          count,
        }
      })

      expect(result.current.count).toBe(1)

      act(() => {
        result.current.send('DECREMENT')
      })

      expect(result.current.count).toBe(0)

      // canDecrement가 false이므로 더 이상 감소하지 않음
      act(() => {
        result.current.send('DECREMENT')
      })

      expect(result.current.count).toBe(0)
    })
  })

  describe('effects', () => {
    it('watch 값 변경 시 effect 실행', () => {
      const enterFn = vi.fn()
      const exitFn = vi.fn()

      const effectMachine = createEventMachine<{
        input: { isOpen: boolean; onIsOpenChange: (v: boolean) => void }
        events: { OPEN: undefined; CLOSE: undefined }
        actions: 'open' | 'close'
      }>({
        on: {
          OPEN: 'open',
          CLOSE: 'close',
        },
        effects: [
          {
            watch: (ctx) => ctx.isOpen,
            enter: () => {
              enterFn()
              return () => exitFn()
            },
          },
        ],
        actions: {
          open: (ctx) => ctx.onIsOpenChange(true),
          close: (ctx) => ctx.onIsOpenChange(false),
        },
      })

      const { result } = renderHook(() => {
        const [isOpen, setIsOpen] = useState(false)
        return {
          ...useEventMachine(effectMachine, {
            isOpen,
            onIsOpenChange: setIsOpen,
          }),
          isOpen,
        }
      })

      expect(enterFn).not.toHaveBeenCalled()

      act(() => {
        result.current.send('OPEN')
      })

      expect(result.current.isOpen).toBe(true)
      expect(enterFn).toHaveBeenCalledTimes(1)

      act(() => {
        result.current.send('CLOSE')
      })

      expect(result.current.isOpen).toBe(false)
      expect(exitFn).toHaveBeenCalledTimes(1)
    })

    it('change 콜백에서 prev, curr 값 전달', () => {
      const changeFn = vi.fn()

      const changeMachine = createEventMachine<{
        input: { focusedId: string | null; onFocusedIdChange: (id: string | null) => void }
        events: { FOCUS: { id: string }; BLUR: undefined }
        actions: 'focus' | 'blur'
      }>({
        on: {
          FOCUS: 'focus',
          BLUR: 'blur',
        },
        effects: [
          {
            watch: (ctx) => ctx.focusedId,
            change: (_ctx, prev, curr) => {
              changeFn(prev, curr)
            },
          },
        ],
        actions: {
          focus: (ctx, payload) => ctx.onFocusedIdChange(payload!.id),
          blur: (ctx) => ctx.onFocusedIdChange(null),
        },
      })

      const { result } = renderHook(() => {
        const [focusedId, setFocusedId] = useState<string | null>(null)
        return {
          ...useEventMachine(changeMachine, {
            focusedId,
            onFocusedIdChange: setFocusedId,
          }),
          focusedId,
        }
      })

      act(() => {
        result.current.send('FOCUS', { id: 'item-1' })
      })

      expect(changeFn).toHaveBeenCalledWith(null, 'item-1')

      act(() => {
        result.current.send('FOCUS', { id: 'item-2' })
      })

      expect(changeFn).toHaveBeenCalledWith('item-1', 'item-2')
    })
  })
})
