# 카카오 로그인 (Vite + React + Vercel 단일 프로젝트)

## 아키텍처 요약

| 구분 | 방식 |
|------|------|
| 브라우저 | **JavaScript SDK v2** — `Kakao.init(자바스크립트 키)` + `Kakao.Auth.authorize({ redirectUri })` |
| 서버 | **Vercel Function** `api/kakao-token.js` → 카카오 `POST /oauth/token` (인가 코드 → 액세스 토큰) |
| 구형 API | `Kakao.Auth.login()` 은 SDK v2에서 제거됨. 사용하지 않음. |

코드 모듈: `src/kakao/` (설명 주석·redirect URI·토큰 교환 fetch)

---

## 환경 변수

### 프론트 (Vite — `VITE_` 접두사, 빌드 시 주입)

| 변수 | 필수 | 설명 |
|------|------|------|
| `VITE_KAKAO_JAVASCRIPT_KEY` | 로그인 켤 때 | 카카오 **JavaScript 키** |
| `VITE_KAKAO_REDIRECT_URI` | 선택 | `authorize`·토큰 교환·콘솔 등록값이 **완전히 같아야** 할 때 전체 URL 고정 (예: `http://localhost:5173/login`) |
| `VITE_KAKAO_REDIRECT_PATH` | 선택 | 경로만 바꿀 때 (기본 `/login`) |
| `VITE_STATS_API_BASE` | 선택 | API가 다른 도메인일 때 베이스 URL |
| `VITE_DEV_API_PROXY` | 선택 | 로컬 Vite 프록시 대상 (비우면 `VITE_STATS_API_BASE` 또는 기본 배포 URL) |

### 서버 (Vercel — `VITE_` 없음, Git/브라우저에 노출 금지)

| 변수 | 필수 | 설명 |
|------|------|------|
| `KAKAO_REST_API_KEY` | 예 | 카카오 **REST API 키** (`/oauth/token` 의 `client_id`) |
| `KAKAO_CLIENT_SECRET` | 예 | 카카오 앱 **Client Secret** |
| `KAKAO_OAUTH_REDIRECT_PATHS` | 선택 | 허용 pathname, 쉼표 구분 (기본 `/login`) |

---

## 카카오 Developers 콘솔 체크리스트

1. **카카오 로그인** 사용 설정 ON  
2. **플랫폼 키 → JavaScript 키**  
   - **JavaScript SDK 도메인**: `http://localhost:5173`, 배포 도메인 등  
   - **Redirect URI**: 앱이 쓰는 값과 **글자 단위 동일** (예: `http://localhost:5173/login`)  
3. **앱 키**에서 REST API 키·Client Secret 을 Vercel 환경 변수에 복사 (시크릿은 서버만)

`redirect_uri` 불일치 시 카카오에서 `redirect_uri_mismatch` 계열 오류가 난다.

---

## 로컬 테스트 (`npm run dev`)

1. 프로젝트 루트 `.env`에 `VITE_KAKAO_JAVASCRIPT_KEY` 등 설정 (`.env.example` 참고)  
2. **Vite는 `/api/*`를 서버리스가 없는 로컬에서 직접 처리하지 않는다.**  
   `vite.config.js`가 `/api`를 **배포된 Vercel URL**로 프록시한다.  
   - 다른 프로젝트 URL을 쓰려면 `VITE_DEV_API_PROXY` 또는 `VITE_STATS_API_BASE` 설정  
3. **Vercel(또는 `vercel dev`) 쪽**에 `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET` 이 있어야 토큰 교환이 된다.  
4. `vite.config.js` 수정 후에는 **`npm run dev` 재시작**  
5. 브라우저에서 로그인 → `/login?code=...` → 자동으로 `/api/kakao-token` 호출 (프록시 경유)

404가 나면: 프록시 대상 URL이 맞는지, 배포에 `api/kakao-token.js`가 포함됐는지, dev 서버를 재시작했는지 확인.

**405**이고 응답이 HTML(`index.html`)이면: `vercel.json`의 SPA rewrite가 `/(.*)` 로 **`/api`까지** `index.html`로 보내고 있을 수 있다. 이 레포는 `/api`를 제외한 rewrite를 사용한다 — 최신 `vercel.json` 반영 후 **재배포**할 것.

---

## Vercel 배포

1. GitHub 연동 프로젝트에 `api/kakao-token.js` 포함 여부 확인  
2. **Settings → Environment Variables**에 다음 추가 (Production 등)  
   - `VITE_KAKAO_JAVASCRIPT_KEY`  
   - `KAKAO_REST_API_KEY`  
   - `KAKAO_CLIENT_SECRET`  
   - (선택) `VITE_STATS_API_BASE`, 클라우드 통계용 `DATABASE_URL` 등  
3. 환경 변수 변경 후 **Redeploy** (특히 `VITE_*` 변경 시)

배포 후에는 프론트와 API가 같은 origin 이므로 별도 프록시 없이 `POST /api/kakao-token` 이 동작한다.

---

## UI 동작

- 세션 확인 중: 로그인 페이지에 "로그인 상태 확인 중…"  
- 인가 코드 교환 중: "카카오 로그인 처리 중…", 버튼 비활성  
- 실패: 빨간 안내 박스 + 상세 문구 + 닫기 (기존 `alert` 대신)

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `src/kakao/config.js` | SDK URL, 상수, JS vs REST 설명 주석 |
| `src/kakao/redirectUri.js` | `redirect_uri` 계산 |
| `src/kakao/exchangeToken.js` | `POST /api/kakao-token` 클라이언트 |
| `src/context/KakaoAuthContext.jsx` | SDK 로드, authorize, 코드 교환, 사용자 상태 |
| `src/components/LoginPage.jsx` | 로그인 UI·오류 표시 |
| `api/kakao-token.js` | Vercel 서버리스 토큰 교환 |
| `vite.config.js` | 로컬 `/api` → Vercel 프록시 |
