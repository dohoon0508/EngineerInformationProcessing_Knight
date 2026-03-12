# 정보처리기사 암기 퀴즈

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

`src/data/topics.js` 파일의 `topics` 배열에 새 객체를 추가하면 됩니다.

```javascript
{
  id: "새-목차-id",
  title: "목차 제목",
  items: [
    {
      id: "항목-id",
      name: "항목 이름",
      aliases: ["대체표기1", "대체표기2"],
      description: "설명"
    }
  ]
}
```

## 기능

- **주관식**: 설명/이름을 보고 정답 입력 (띄어쓰기, 대소문자 유연 처리)
- **전체 보기**: 전체 목록에서 정답 선택 (검색 가능)
- **4지 선다**: 4개 보기 중 정답 선택
- **출제 모드**: "설명 → 이름" / "이름 → 설명" 토글
- **통계**: 정답률, 맞은/틀린 개수, 최근 10문제 기록
- **틀린 문제 가중치**: 자주 틀리는 문제가 더 자주 출제됨
- **localStorage**: 새로고침해도 기록 유지
