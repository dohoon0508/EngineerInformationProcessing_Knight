# 정보처리기사 암기 퀴즈

문제로 밖에 못외울 것 같아서 만들게됨.

**배포**: https://engineerinformationprocessingknight.vercel.app/

React + Vite 기반의 정보처리기사 시험 대비 암기 퀴즈 웹사이트입니다.

## 실행 방법

```bash
# 의존성 설치 (최초 1회)
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 `http://localhost:5173` 으로 접속하세요.

### 환경 변수 (로컬)

저장소에는 비밀값을 넣지 마세요. 프로젝트 루트에 **`.env`** 를 만들고 (`.gitignore`에 포함됨) 예시는 **`.env.example`** 참고.

| 변수 | 설명 |
|------|------|
| `VITE_KAKAO_JAVASCRIPT_KEY` | 카카오 **JavaScript 키** (웹 SDK용). 없으면 로그인 UI가 숨겨집니다. |
| `VITE_ENABLE_CLOUD_SYNC` | `true` / `1` / `yes` — 배포 도메인의 `/api/stats` 로 통계 동기화 (빌드 시 주입·**재배포 필요**) |
| `VITE_STATS_API_BASE` | 비우면 `window.location.origin` 사용. 별도 API 도메인이면 `https://xxx.vercel.app` 만 입력 |

**카카오 개발자 콘솔**: 앱 → 플랫폼(Web) 사이트 도메인에 `http://localhost:5173` 과 Vercel URL을 등록하고, **카카오 로그인** 활성화·Redirect URI를 맞춥니다.

카카오 로그인(인가 코드·`/api/kakao-token`·로컬 프록시·Vercel 환경 변수) 상세는 루트의 **[KAKAO_LOGIN.md](./KAKAO_LOGIN.md)** 를 참고하세요.

**Admin 키(REST API 시크릿 등)는 프론트·GitHub에 넣지 마세요.** 통계 API는 사용자 **액세스 토큰**으로 본인만 확인합니다.

### 기기 간 통계 동기화 (선택, Vercel + Neon)

1. [Neon](https://neon.tech) 등에서 PostgreSQL 생성 후 연결 문자열을 **Vercel 환경 변수** `DATABASE_URL` 로 등록 (로컬 `vercel dev` 시에도 동일).
2. Vercel에 `VITE_ENABLE_CLOUD_SYNC=true` 를 빌드 시 주입 (프론트).
3. 배포 후 로그인한 상태에서 풀이하면 `api/stats.js`가 토큰 검증 후 DB에 JSON 저장합니다.
4. (선택) `scripts/neon-schema.sql` 로 테이블을 미리 만들 수 있습니다. 없어도 API가 `CREATE TABLE IF NOT EXISTS` 로 생성합니다.

## Vercel 배포

1. [Vercel](https://vercel.com)에 GitHub 저장소 연결
2. 프로젝트 import 시 자동으로 Vite 설정 감지
3. 위 환경 변수를 Vercel **Project → Settings → Environment Variables** 에 등록
4. 배포 후 `main` 브랜치 push 시 자동 재배포

## 프로젝트 구조

```
api/
└── stats.js            # Vercel Serverless: 카카오 토큰 검증 + 통계 저장 (DATABASE_URL)
scripts/
├── validate-topics.mjs  # topics 데이터 검증 (npm run validate:topics)
└── neon-schema.sql      # (선택) Neon 테이블
src/
├── context/
│   └── KakaoAuthContext.jsx  # 카카오 SDK·로그인 상태
├── main.jsx          # 앱 진입점
├── App.jsx            # 라우팅 및 레이아웃
├── App.css
├── index.css          # 전역 스타일
├── data/
│   └── topics.js     # 퀴즈 데이터 (목차별 항목)
├── utils/
│   ├── quizEngine.js # 문제 출제 로직
│   ├── normalize.js  # 정답 정규화 (띄어쓰기, 대소문자 등)
│   ├── storage.js    # localStorage 통계 (게스트 / 카카오 계정별 키)
│   └── statsSync.js  # (선택) /api/stats 클라우드 동기화
└── components/
    ├── HomePage.jsx      # 홈 화면 (목차 선택)
    ├── QuizPage.jsx      # 퀴즈 화면
    ├── QuizStats.jsx     # 통계 카드
    ├── SubjectiveQuestion.jsx   # 주관식
    ├── MultipleChoiceQuestion.jsx  # 4지 선다
    └── FullListQuestion.jsx    # 전체 보기
```

## 새 목차 추가 방법

`src/data/topics.js`의 `topics` 배열에 객체를 추가하면 홈에 자동 반영됩니다.

```javascript
{
  id: "새-목차-id",
  title: "목차 제목",
  items: [
    {
      id: "항목-id",
      nameKo: "한글 이름",
      nameEn: "English name",
      aliases: ["대체표기1", "대체표기2"],
      examDescription: "출제 목록·교재용 전체 설명",
      quizPrompt: "선택: 퀴즈에만 쓸 문구(정답 단어가 본문에 나오지 않게)",
      shortDescription: "선택: 짧은 요약",
    },
  ],
}
```

데이터 검증: `npm run validate:topics`  
(선택) 로컬 전용 메모는 `docs/` 폴더에 두면 되며, `.gitignore`로 원격 저장소에는 포함되지 않습니다.

## 기능

- **주관식**: 설명/이름을 보고 정답 입력 (띄어쓰기, 대소문자 유연 처리)
- **전체 보기**: 전체 목록에서 정답 선택 (검색 가능)
- **4지 선다**: 4개 보기 중 정답 선택
- **출제 방식**: 설명을 보고 공격 유형 이름 맞히기
- **통계**: 정답률, 맞은/틀린 개수, 최근 10문제 기록
- **틀린 문제 가중치**: 자주 틀리는 문제가 더 자주 출제됨
- **localStorage**: 새로고침해도 기록 유지
- **카카오 로그인**: 계정별로 통계 분리 저장(키 `…-kakao-{id}`), 비로그인은 기존 게스트 키
- **(선택) 클라우드 동기화**: Neon + `api/stats` — 로그인 시 서버가 더 최신이면 로컬을 덮어쓰고, 로컬이 더 최신이면 서버로 즉시 업로드. 풀이할 때마다 디바운스 업로드.

## 업데이트

- **초기**: 서비스 공격 유형 26개, 주관식/전체 보기/4지 선다, 설명→이름 맞히기
