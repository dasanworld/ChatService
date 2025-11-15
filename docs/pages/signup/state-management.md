# Signup Page - State Management Implementation

> **관련 문서**: docs/state-management.md, docs/pages/signup/plan.md  
> **Context**: AuthContext  
> **우선순위**: P0  
> **상태**: 미구현

---

## 📋 개요

회원가입 페이지는 **AuthContext**를 사용하여 사용자 인증 상태를 관리합니다.

---

## 🎯 필요한 Context

### 1. AuthContext (필수)

**사용 목적:**
- 회원가입 후 자동 로그인
- 세션 생성 및 저장
- 사용자 상태 전역 관리

**필요한 기능:**
```typescript
const {
  signup,          // (email, password, nickname) => Promise<void>
  isLoading,       // boolean
  error,           // string | null
  isAuthenticated, // boolean
} = useAuth();
```

---

## 🏗️ 구현 계획

### Phase 1: AuthContext 생성

#### 1.1 상태 정의 (`src/features/auth/types.ts`)

```typescript
export interface AuthState {
  user: User | null;
  session: Session | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';
  error: string | null;
}

export interface User {
  id: string;
  email: string;
  nickname: string;
  avatar_url?: string;
  created_at: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}
```

---

#### 1.2 Action 타입 (`src/features/auth/types.ts`)

```typescript
export type AuthAction =
  | { type: 'AUTH_REQUEST' }
  | { type: 'SIGNUP_SUCCESS'; payload: { user: User; session: Session } }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; session: Session } }
  | { type: 'AUTH_FAILURE'; payload: { error: string } }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_SESSION'; payload: { session: Session } };
```

---

#### 1.3 Reducer (`src/features/auth/context/authReducer.ts`)

```typescript
import type { AuthState, AuthAction } from '../types';

export const initialAuthState: AuthState = {
  user: null,
  session: null,
  status: 'idle',
  error: null,
};

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_REQUEST':
      return {
        ...state,
        status: 'loading',
        error: null,
      };

    case 'SIGNUP_SUCCESS':
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        session: action.payload.session,
        status: 'authenticated',
        error: null,
      };

    case 'AUTH_FAILURE':
      return {
        ...state,
        status: 'error',
        error: action.payload.error,
      };

    case 'LOGOUT':
      return {
        ...initialAuthState,
        status: 'unauthenticated',
      };

    case 'REFRESH_SESSION':
      return {
        ...state,
        session: action.payload.session,
      };

    default:
      return state;
  }
}
```

---

#### 1.4 Context Provider (`src/features/auth/context/AuthContext.tsx`)

```typescript
"use client";

import {
  createContext,
  useReducer,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { apiClient, extractApiErrorMessage, isAxiosError } from '@/lib/remote/api-client';
import { authReducer, initialAuthState } from './authReducer';
import type { AuthState } from '../types';

interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  signup: (email: string, password: string, nickname: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  // Signup
  const signup = useCallback(async (
    email: string,
    password: string,
    nickname: string
  ) => {
    dispatch({ type: 'AUTH_REQUEST' });

    try {
      const response = await apiClient.post('/api/auth/signup', {
        email,
        password,
        nickname,
      });

      const data = response.data;

      dispatch({
        type: 'SIGNUP_SUCCESS',
        payload: {
          user: {
            id: data.userId,
            email: data.email,
            nickname: data.nickname,
            created_at: new Date().toISOString(),
          },
          session: {
            access_token: data.session?.accessToken ?? '',
            refresh_token: data.session?.refreshToken ?? '',
            expires_at: data.session?.expiresAt ?? 0,
          },
        },
      });
    } catch (error) {
      const errorMessage = isAxiosError(error)
        ? extractApiErrorMessage(error, '회원가입에 실패했습니다')
        : '회원가입 처리 중 오류가 발생했습니다';

      dispatch({
        type: 'AUTH_FAILURE',
        payload: { error: errorMessage },
      });

      throw error;
    }
  }, []);

  // Login
  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'AUTH_REQUEST' });

    try {
      const response = await apiClient.post('/api/auth/login', {
        email,
        password,
      });

      const data = response.data;

      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: {
            id: data.userId,
            email: data.email,
            nickname: data.nickname ?? '',
            created_at: new Date().toISOString(),
          },
          session: {
            access_token: data.session.accessToken,
            refresh_token: data.session.refreshToken,
            expires_at: data.session.expiresAt,
          },
        },
      });
    } catch (error) {
      const errorMessage = isAxiosError(error)
        ? extractApiErrorMessage(error, '로그인에 실패했습니다')
        : '로그인 처리 중 오류가 발생했습니다';

      dispatch({
        type: 'AUTH_FAILURE',
        payload: { error: errorMessage },
      });

      throw error;
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  // Refresh Session
  const refreshSession = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/auth/me');
      const data = response.data;

      if (data.user) {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user: data.user,
            session: data.session,
          },
        });
      } else {
        dispatch({ type: 'LOGOUT' });
      }
    } catch (error) {
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  // Computed values
  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    isAuthenticated: state.status === 'authenticated',
    isLoading: state.status === 'loading',
    signup,
    login,
    logout,
    refreshSession,
  }), [state, signup, login, logout, refreshSession]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

#### 1.5 Custom Hook (`src/features/auth/hooks/useAuth.ts`)

```typescript
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  
  return context;
}
```

---

### Phase 2: useSignup Hook 리팩토링

#### 기존 코드 수정 (`src/features/auth/hooks/useSignup.ts`)

```typescript
"use client";

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from './useAuth';
import type { SignupFormData } from '../schemas/signup';

export const useSignup = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signup, error: authError, isLoading } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignup = useCallback(
    async (data: SignupFormData) => {
      setErrorMessage(null);

      try {
        await signup(data.email, data.password, data.nickname);

        // Handle invite token if exists
        const inviteToken = searchParams.get('invite');
        if (inviteToken) {
          router.replace(`/invite/${inviteToken}`);
        } else {
          router.replace('/dashboard');
        }

        return { ok: true };
      } catch (error) {
        setErrorMessage(authError ?? '회원가입에 실패했습니다');
        return { ok: false };
      }
    },
    [signup, authError, router, searchParams]
  );

  return {
    signup: handleSignup,
    isSubmitting: isLoading,
    errorMessage: errorMessage ?? authError,
  };
};
```

---

### Phase 3: Provider 통합

#### `src/app/providers.tsx` 수정

```typescript
"use client";

import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/features/auth/context/AuthContext";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      forcedTheme="light"
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

---

## 📊 데이터 흐름

### Flux 패턴 아키텍처

```mermaid
graph LR
    A[Action Creator<br/>signup, login] --> B[Dispatcher<br/>dispatch]
    B --> C[Store<br/>AuthReducer]
    C --> D[View<br/>SignupForm]
    D --> A
    
    style A fill:#e1f5ff
    style B fill:#fff4e1
    style C fill:#e8f5e9
    style D fill:#f3e5f5
```

**Flux 흐름 설명:**
1. **Action Creator** (signup, login): 사용자 액션을 Action 객체로 변환
2. **Dispatcher** (dispatch): Action을 Store로 전달
3. **Store** (AuthReducer): 상태 업데이트 로직 실행
4. **View** (SignupForm): 새 상태를 구독하고 UI 렌더링

---

### 회원가입 플로우 (Sequence Diagram)

```mermaid
sequenceDiagram
    participant User
    participant SignupForm
    participant useSignup
    participant AuthContext
    participant Dispatcher
    participant AuthReducer
    participant API
    
    User->>SignupForm: 폼 제출
    SignupForm->>useSignup: handleSignup(data)
    useSignup->>AuthContext: signup(email, password, nickname)
    
    Note over AuthContext: Action Creator
    AuthContext->>Dispatcher: dispatch({type: 'AUTH_REQUEST'})
    Dispatcher->>AuthReducer: authReducer(state, action)
    AuthReducer-->>AuthContext: newState {status: 'loading'}
    AuthContext->>SignupForm: isLoading: true
    
    AuthContext->>API: POST /api/auth/signup
    API-->>AuthContext: {userId, email, nickname, session}
    
    Note over AuthContext: Action Creator
    AuthContext->>Dispatcher: dispatch({type: 'SIGNUP_SUCCESS', payload})
    Dispatcher->>AuthReducer: authReducer(state, action)
    AuthReducer-->>AuthContext: newState {user, session, authenticated}
    
    AuthContext->>useSignup: success
    useSignup->>Router: redirect to /dashboard or /invite/{token}
```

---

### Action → Store → View 상태 변화

```mermaid
stateDiagram-v2
    [*] --> idle: 초기 상태
    idle --> loading: AUTH_REQUEST Action
    loading --> authenticated: SIGNUP_SUCCESS Action
    loading --> error: AUTH_FAILURE Action
    authenticated --> unauthenticated: LOGOUT Action
    error --> loading: 재시도
    
    note right of loading
        Store: {status: 'loading'}
        View: 로딩 스피너 표시
    end note
    
    note right of authenticated
        Store: {user, session}
        View: Dashboard로 리다이렉트
    end note
    
    note right of error
        Store: {error: message}
        View: 에러 메시지 표시
    end note
```

---

## 🏛️ Context 아키텍처 상세 설계

### AuthContext 데이터 흐름

```mermaid
graph TB
    subgraph "AuthProvider (Context + useReducer)"
        A[AuthState<br/>user, session, status, error]
        B[authReducer<br/>Pure Function]
        C[Action Creators<br/>signup, login, logout]
    end
    
    subgraph "Data Sources"
        D1[API: POST /api/auth/signup]
        D2[API: POST /api/auth/login]
        D3[API: GET /api/auth/me]
    end
    
    subgraph "Child Components"
        E1[SignupForm]
        E2[LoginForm]
        E3[Protected Route]
        E4[User Avatar]
    end
    
    C -->|dispatch| B
    B -->|update| A
    
    C -->|fetch| D1
    C -->|fetch| D2
    C -->|fetch| D3
    
    A -->|subscribe| E1
    A -->|subscribe| E2
    A -->|subscribe| E3
    A -->|subscribe| E4
    
    E1 -->|call| C
    E2 -->|call| C
    
    style A fill:#e8f5e9
    style B fill:#fff4e1
    style C fill:#e1f5ff
```

---

### AuthState 인터페이스 설계

```typescript
/**
 * AuthContext의 중앙 상태
 * - 단일 진실의 원천 (Single Source of Truth)
 * - Immutable: Reducer를 통해서만 업데이트
 */
interface AuthState {
  // 사용자 정보
  user: User | null;
  
  // 세션 정보
  session: Session | null;
  
  // 상태 플래그
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';
  
  // 에러 메시지
  error: string | null;
  
  // 추가: 세션 만료 시간 추적
  expiresAt: number | null;
  
  // 추가: 마지막 활동 시간 (auto-refresh 판단용)
  lastActivityAt: string | null;
}

/**
 * 사용자 엔티티
 */
interface User {
  id: string;              // UUID from auth.users
  email: string;
  nickname: string;
  avatar_url?: string;
  created_at: string;
  updated_at?: string;
}

/**
 * 세션 엔티티
 */
interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;      // Unix timestamp (ms)
  token_type: 'Bearer';
}
```

---

### AuthAction 인터페이스 설계

```typescript
/**
 * Discriminated Union 패턴
 * - TypeScript가 type으로 자동 타입 좁히기
 * - Reducer에서 exhaustive checking 가능
 */
type AuthAction =
  // 요청 시작
  | { 
      type: 'AUTH_REQUEST';
    }
  
  // 회원가입 성공
  | { 
      type: 'SIGNUP_SUCCESS';
      payload: {
        user: User;
        session: Session;
      };
    }
  
  // 로그인 성공
  | { 
      type: 'LOGIN_SUCCESS';
      payload: {
        user: User;
        session: Session;
      };
    }
  
  // 인증 실패
  | { 
      type: 'AUTH_FAILURE';
      payload: {
        error: string;
        errorCode?: string;  // 'INVALID_CREDENTIALS', 'EMAIL_ALREADY_EXISTS' 등
      };
    }
  
  // 로그아웃
  | { 
      type: 'LOGOUT';
    }
  
  // 세션 갱신
  | { 
      type: 'REFRESH_SESSION';
      payload: {
        session: Session;
      };
    }
  
  // 활동 기록 (auto-refresh 트리거용)
  | {
      type: 'RECORD_ACTIVITY';
    }
  
  // 에러 초기화
  | {
      type: 'CLEAR_ERROR';
    };
```

---

### AuthContext 노출 인터페이스

```typescript
/**
 * useAuth() 훅이 반환하는 인터페이스
 * - 컴포넌트에서 사용할 모든 값과 함수
 * - Read-only 값 + Action Creator 함수
 */
interface AuthContextValue {
  // ===== 상태 값 (Read-only) =====
  
  /** 현재 사용자 (null이면 미로그인) */
  user: User | null;
  
  /** 현재 세션 (null이면 미로그인) */
  session: Session | null;
  
  /** 인증 상태 */
  status: AuthState['status'];
  
  /** 에러 메시지 */
  error: string | null;
  
  
  // ===== 계산된 값 (Derived State) =====
  
  /** 로그인 여부 */
  isAuthenticated: boolean;
  // computed: status === 'authenticated' && user !== null
  
  /** 로딩 중 여부 */
  isLoading: boolean;
  // computed: status === 'loading'
  
  /** 에러 상태 여부 */
  hasError: boolean;
  // computed: status === 'error' && error !== null
  
  /** 세션 만료 여부 */
  isSessionExpired: boolean;
  // computed: expiresAt !== null && Date.now() > expiresAt
  
  
  // ===== Action Creator 함수 =====
  
  /**
   * 회원가입
   * @throws {Error} 가입 실패 시
   */
  signup: (
    email: string,
    password: string,
    nickname: string
  ) => Promise<void>;
  
  /**
   * 로그인
   * @throws {Error} 로그인 실패 시
   */
  login: (
    email: string,
    password: string
  ) => Promise<void>;
  
  /**
   * 로그아웃
   * - 항상 성공 (네트워크 실패해도 로컬 상태 정리)
   */
  logout: () => Promise<void>;
  
  /**
   * 세션 갱신
   * - 현재 refresh_token으로 새 access_token 발급
   * @throws {Error} 갱신 실패 시 (재로그인 필요)
   */
  refreshSession: () => Promise<void>;
  
  /**
   * 사용자 정보 다시 불러오기
   * - 페이지 새로고침 시 세션 복원용
   */
  reloadUser: () => Promise<void>;
  
  /**
   * 에러 메시지 초기화
   */
  clearError: () => void;
  
  /**
   * 비밀번호 재설정 요청
   */
  requestPasswordReset: (email: string) => Promise<void>;
  
  /**
   * 비밀번호 재설정 (토큰 사용)
   */
  resetPassword: (token: string, newPassword: string) => Promise<void>;
}
```

---

### Context 내부 데이터 흐름

```mermaid
sequenceDiagram
    participant Component as Component (useAuth)
    participant Context as AuthContext
    participant Reducer as authReducer
    participant State as AuthState
    participant API as API Server
    
    Note over Component: 사용자가 signup 호출
    Component->>Context: signup(email, password, nickname)
    
    Note over Context: 1. 요청 시작 Action
    Context->>Reducer: dispatch({type: 'AUTH_REQUEST'})
    Reducer->>State: status = 'loading', error = null
    State-->>Component: isLoading = true (re-render)
    
    Note over Context: 2. API 호출
    Context->>API: POST /api/auth/signup
    API-->>Context: {userId, email, nickname, session}
    
    Note over Context: 3. 성공 Action
    Context->>Reducer: dispatch({type: 'SIGNUP_SUCCESS', payload})
    Reducer->>State: user = {...}, session = {...}, status = 'authenticated'
    State-->>Component: isAuthenticated = true, user = {...} (re-render)
    
    Note over Component: 컴포넌트가 리다이렉트 처리
```

---

### 하위 컴포넌트 사용 예시

```typescript
// ===== SignupForm.tsx =====
function SignupForm() {
  const {
    signup,          // Action Creator
    isLoading,       // Computed value
    error,           // State value
    clearError,      // Action Creator
  } = useAuth();
  
  // 폼 제출 시 signup 호출
  // isLoading이 true면 버튼 비활성화
  // error가 있으면 메시지 표시
}

// ===== ProtectedRoute.tsx =====
function ProtectedRoute({ children }) {
  const {
    isAuthenticated,     // Computed value
    isLoading,           // Computed value
    reloadUser,          // Action Creator
  } = useAuth();
  
  useEffect(() => {
    // 페이지 로드 시 세션 복원
    if (!isAuthenticated && !isLoading) {
      reloadUser();
    }
  }, []);
  
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return children;
}

// ===== UserAvatar.tsx =====
function UserAvatar() {
  const {
    user,       // State value
    logout,     // Action Creator
  } = useAuth();
  
  if (!user) return null;
  
  // user.avatar_url, user.nickname 사용
  // 드롭다운에서 logout 호출
}
```

---

### Reducer 상태 전이 매트릭스

| 현재 상태 | Action | 다음 상태 | 변경사항 |
|-----------|--------|-----------|----------|
| `idle` | `AUTH_REQUEST` | `loading` | status만 변경 |
| `loading` | `SIGNUP_SUCCESS` | `authenticated` | user, session 설정 |
| `loading` | `LOGIN_SUCCESS` | `authenticated` | user, session 설정 |
| `loading` | `AUTH_FAILURE` | `error` | error 메시지 설정 |
| `authenticated` | `LOGOUT` | `unauthenticated` | 모든 상태 초기화 |
| `authenticated` | `REFRESH_SESSION` | `authenticated` | session만 업데이트 |
| `error` | `CLEAR_ERROR` | `idle` | error 초기화 |
| `any` | `RECORD_ACTIVITY` | `unchanged` | lastActivityAt 업데이트 |

---

### 성능 최적화 전략

```typescript
/**
 * Context Value 메모이제이션
 */
const value = useMemo<AuthContextValue>(() => ({
  // 상태 값 (이미 메모이제이션됨 by useReducer)
  ...state,
  
  // 계산된 값 (매 렌더마다 재계산)
  isAuthenticated: state.status === 'authenticated' && state.user !== null,
  isLoading: state.status === 'loading',
  hasError: state.status === 'error',
  isSessionExpired: state.expiresAt !== null && Date.now() > state.expiresAt,
  
  // Action Creator (useCallback으로 메모이제이션)
  signup,
  login,
  logout,
  refreshSession,
  reloadUser,
  clearError,
  requestPasswordReset,
  resetPassword,
}), [
  state,
  signup,
  login,
  logout,
  refreshSession,
  reloadUser,
  clearError,
  requestPasswordReset,
  resetPassword,
]);

/**
 * 선택적 구독 (성능 최적화)
 * - 특정 값만 필요한 컴포넌트는 별도 훅 제공
 */
function useAuthUser() {
  const { user } = useAuth();
  return user;
}

function useAuthStatus() {
  const { isAuthenticated, isLoading } = useAuth();
  return { isAuthenticated, isLoading };
}
```

---

## ✅ 구현 체크리스트

### Phase 1: AuthContext 생성
- [ ] `src/features/auth/types.ts` - 상태 및 Action 타입 정의
- [ ] `src/features/auth/context/authReducer.ts` - Reducer 구현
- [ ] `src/features/auth/context/AuthContext.tsx` - Context Provider 구현
- [ ] `src/features/auth/hooks/useAuth.ts` - Custom Hook

### Phase 2: Hook 리팩토링
- [ ] `useSignup` Hook을 AuthContext 사용하도록 수정
- [ ] 기존 `useCurrentUser` Hook과 통합 검토

### Phase 3: Provider 통합
- [ ] `src/app/providers.tsx`에 AuthProvider 추가
- [ ] 모든 페이지에서 AuthContext 접근 가능하도록 설정

### Phase 4: 테스트
- [ ] 회원가입 플로우 테스트
- [ ] 에러 처리 테스트
- [ ] 리다이렉션 테스트

---

## 🔄 기존 코드와의 통합

### CurrentUserContext 마이그레이션 계획

**현재 상태:**
- `CurrentUserContext`는 Supabase Auth를 직접 호출
- `useState`로 상태 관리

**변경 계획:**
1. `CurrentUserContext` → `AuthContext`로 통합
2. `useReducer` 패턴 적용
3. API 엔드포인트를 통한 인증 처리

**마이그레이션 단계:**
```typescript
// Step 1: AuthContext 완성
// Step 2: CurrentUserProvider를 AuthProvider로 교체
// Step 3: 모든 useCurrentUser() 호출을 useAuth()로 변경
// Step 4: CurrentUserContext 파일 제거
```

---

## 📝 참고사항

### 세션 저장
- 세션은 Supabase가 자동으로 쿠키에 저장
- AuthContext는 메모리에만 상태 유지
- 페이지 새로고침 시 `refreshSession()` 호출 필요

### 에러 처리
- API 에러는 AuthContext에서 catch
- 사용자 친화적인 메시지로 변환
- errorMessage는 컴포넌트에서 표시

### 성능 최적화
- Context value는 useMemo로 메모이제이션
- signup/login/logout 함수는 useCallback으로 최적화

---

**문서 버전**: v1.0  
**최종 수정**: 2025년 11월 15일
