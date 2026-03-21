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

## Vercel 배포

1. [Vercel](https://vercel.com)에 GitHub 저장소 연결
2. 프로젝트 import 시 자동으로 Vite 설정 감지
3. 배포 후 `main` 브랜치 push 시 자동 재배포

## 프로젝트 구조

```
scripts/
└── validate-topics.mjs  # topics 데이터 검증 (npm run validate:topics)
src/
├── main.jsx          # 앱 진입점
├── App.jsx            # 라우팅 및 레이아웃
├── App.css
├── index.css          # 전역 스타일
├── data/
│   └── topics.js     # 퀴즈 데이터 (목차별 항목)
├── utils/
│   ├── quizEngine.js # 문제 출제 로직
│   ├── normalize.js  # 정답 정규화 (띄어쓰기, 대소문자 등)
│   └── storage.js    # localStorage 통계 저장
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

## 업데이트

- **초기**: 서비스 공격 유형 26개, 주관식/전체 보기/4지 선다, 설명→이름 맞히기
