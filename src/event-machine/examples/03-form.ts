/**
 * 예시 3: Form Validation
 * 
 * computed와 always 사용
 * - computed: context에서 파생 값 계산
 * - always: context 변경 시 자동 평가
 * - createEventMachine으로 actions 타입 추론
 */

import { useState, useMemo } from 'react';
import { useEventMachine, createEventMachine } from '../index';

// ============================================
// 1. Context 타입 정의
// ============================================

type FormContext = {
  email: string;
  password: string;
  confirmPassword: string;
  touched: { email: boolean; password: boolean; confirmPassword: boolean };
  error: string | null;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setConfirmPassword: (v: string) => void;
  setTouched: (field: keyof FormContext['touched']) => void;
  setError: (e: string | null) => void;
  onSubmit: (data: { email: string; password: string }) => void;
};

// ============================================
// 2. Events 타입 정의
// ============================================

type FormEvents = {
  CHANGE_EMAIL: { value: string };
  CHANGE_PASSWORD: { value: string };
  CHANGE_CONFIRM_PASSWORD: { value: string };
  BLUR_EMAIL: undefined;
  BLUR_PASSWORD: undefined;
  BLUR_CONFIRM_PASSWORD: undefined;
  SUBMIT: undefined;
  RESET: undefined;
};

// ============================================
// 3. Computed 타입 정의
// ============================================

type FormComputed = {
  isEmailValid: boolean;
  isPasswordValid: boolean;
  isConfirmValid: boolean;
  isValid: boolean;
  canSubmit: boolean;
  emailError: string | null;
  passwordError: string | null;
  confirmError: string | null;
};

// ============================================
// 4. Machine 정의 (createEventMachine 사용)
// ============================================

const formMachine = createEventMachine<
  FormContext,
  FormEvents,
  FormComputed,
  | 'changeEmail' | 'changePassword' | 'changeConfirmPassword'
  | 'blurEmail' | 'blurPassword' | 'blurConfirmPassword'
  | 'showError' | 'clearError' | 'submit' | 'reset'
>({
  // computed: context에서 파생
  computed: {
    isEmailValid: (ctx) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ctx.email),
    isPasswordValid: (ctx) => ctx.password.length >= 8,
    isConfirmValid: (ctx) => ctx.confirmPassword === ctx.password,
    
    isValid: (ctx) => {
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ctx.email);
      const pwValid = ctx.password.length >= 8;
      const confirmValid = ctx.confirmPassword === ctx.password;
      return emailValid && pwValid && confirmValid;
    },

    canSubmit: (ctx) => {
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ctx.email);
      const pwValid = ctx.password.length >= 8;
      const confirmValid = ctx.confirmPassword === ctx.password;
      return emailValid && pwValid && confirmValid && ctx.error === null;
    },

    emailError: (ctx) => {
      if (!ctx.touched.email) return null;
      if (!ctx.email) return '이메일을 입력하세요';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ctx.email)) return '유효한 이메일 형식이 아닙니다';
      return null;
    },

    passwordError: (ctx) => {
      if (!ctx.touched.password) return null;
      if (!ctx.password) return '비밀번호를 입력하세요';
      if (ctx.password.length < 8) return '비밀번호는 8자 이상이어야 합니다';
      return null;
    },

    confirmError: (ctx) => {
      if (!ctx.touched.confirmPassword) return null;
      if (!ctx.confirmPassword) return '비밀번호 확인을 입력하세요';
      if (ctx.confirmPassword !== ctx.password) return '비밀번호가 일치하지 않습니다';
      return null;
    },
  },

  on: {
    CHANGE_EMAIL: 'changeEmail',
    CHANGE_PASSWORD: 'changePassword',
    CHANGE_CONFIRM_PASSWORD: 'changeConfirmPassword',
    BLUR_EMAIL: 'blurEmail',
    BLUR_PASSWORD: 'blurPassword',
    BLUR_CONFIRM_PASSWORD: 'blurConfirmPassword',

    SUBMIT: [
      { when: (ctx) => !ctx.canSubmit, do: 'showError' },
      { do: 'submit' },
    ],

    RESET: 'reset',
  },

  // always: context 변경될 때 자동 평가
  always: [
    // 에러 상태이고 폼이 유효해지면 에러 클리어
    { when: (ctx) => ctx.error !== null && ctx.isValid, do: 'clearError' },
  ],

  actions: {
    changeEmail: (ctx, payload: { value: string }) => {
      ctx.setEmail(payload.value);
    },
    changePassword: (ctx, payload: { value: string }) => {
      ctx.setPassword(payload.value);
    },
    changeConfirmPassword: (ctx, payload: { value: string }) => {
      ctx.setConfirmPassword(payload.value);
    },

    blurEmail: (ctx) => ctx.setTouched('email'),
    blurPassword: (ctx) => ctx.setTouched('password'),
    blurConfirmPassword: (ctx) => ctx.setTouched('confirmPassword'),

    showError: (ctx) => {
      if (!ctx.isEmailValid) {
        ctx.setError('유효한 이메일을 입력하세요');
      } else if (!ctx.isPasswordValid) {
        ctx.setError('비밀번호는 8자 이상이어야 합니다');
      } else if (!ctx.isConfirmValid) {
        ctx.setError('비밀번호가 일치하지 않습니다');
      }
    },

    clearError: (ctx) => ctx.setError(null),

    submit: (ctx) => {
      ctx.onSubmit({ email: ctx.email, password: ctx.password });
    },

    reset: (ctx) => {
      ctx.setEmail('');
      ctx.setPassword('');
      ctx.setConfirmPassword('');
      ctx.setError(null);
    },
  },
});

// ============================================
// 5. Hook
// ============================================

type UseFormProps = {
  onSubmit: (data: { email: string; password: string }) => void;
};

export function useSignupForm({ onSubmit }: UseFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [touched, setTouchedState] = useState({
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [error, setError] = useState<string | null>(null);

  const setTouched = (field: keyof typeof touched) => {
    setTouchedState((prev) => ({ ...prev, [field]: true }));
  };

  const ctx = useMemo<FormContext>(
    () => ({
      email,
      password,
      confirmPassword,
      touched,
      error,
      setEmail,
      setPassword,
      setConfirmPassword,
      setTouched,
      setError,
      onSubmit,
    }),
    [email, password, confirmPassword, touched, error, onSubmit]
  );

  const { send, computed } = useEventMachine(formMachine, ctx);

  return {
    // Values
    email,
    password,
    confirmPassword,
    error,
    ...computed,

    // Actions
    submit: () => send('SUBMIT'),
    reset: () => send('RESET'),

    // Props getters
    getEmailProps: () => ({
      type: 'email' as const,
      value: email,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        send('CHANGE_EMAIL', { value: e.target.value }),
      onBlur: () => send('BLUR_EMAIL'),
      'aria-invalid': computed.emailError ? true : undefined,
    }),

    getPasswordProps: () => ({
      type: 'password' as const,
      value: password,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        send('CHANGE_PASSWORD', { value: e.target.value }),
      onBlur: () => send('BLUR_PASSWORD'),
      'aria-invalid': computed.passwordError ? true : undefined,
    }),

    getConfirmPasswordProps: () => ({
      type: 'password' as const,
      value: confirmPassword,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        send('CHANGE_CONFIRM_PASSWORD', { value: e.target.value }),
      onBlur: () => send('BLUR_CONFIRM_PASSWORD'),
      'aria-invalid': computed.confirmError ? true : undefined,
    }),

    getSubmitProps: () => ({
      type: 'submit' as const,
      disabled: !computed.canSubmit,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        send('SUBMIT');
      },
    }),
  };
}

// ============================================
// 6. 사용 예시
// ============================================

/*
function SignupForm() {
  const form = useSignupForm({
    onSubmit: (data) => {
      console.log('Submit:', data);
    },
  });

  return (
    <form>
      <div>
        <label>이메일</label>
        <input {...form.getEmailProps()} />
        {form.emailError && <span>{form.emailError}</span>}
      </div>

      <div>
        <label>비밀번호</label>
        <input {...form.getPasswordProps()} />
        {form.passwordError && <span>{form.passwordError}</span>}
      </div>

      <div>
        <label>비밀번호 확인</label>
        <input {...form.getConfirmPasswordProps()} />
        {form.confirmError && <span>{form.confirmError}</span>}
      </div>

      {form.error && <div className="error">{form.error}</div>}

      <button {...form.getSubmitProps()}>가입하기</button>
      <button type="button" onClick={form.reset}>초기화</button>
    </form>
  );
}
*/
