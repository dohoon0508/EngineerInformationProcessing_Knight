import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { KakaoAuthProvider } from "./context/KakaoAuthContext";
import HomePage from "./components/HomePage";
import QuizPage from "./components/QuizPage";
import LoginPage from "./components/LoginPage";
import RequireAuth from "./components/RequireAuth";
import AppAuthBar from "./components/AppAuthBar";
import "./App.css";

/** 주제 변경 시 상태(출제 모드·직전 문항 등)를 초기화하기 위해 topicId로 리마운트 */
function QuizPageWithReset() {
  const { topicId } = useParams();
  return <QuizPage key={topicId} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <KakaoAuthProvider>
        <div className="app">
          <AppAuthBar />
          {/* flex 자식에 margin:0 auto(홈)가 있으면 폭이 콘텐츠만큼만 줄어드는 문제를 막기 위해 블록 래퍼 */}
          <div className="app-body">
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <HomePage />
                  </RequireAuth>
                }
              />
              <Route
                path="/quiz/:topicId"
                element={
                  <RequireAuth>
                    <QuizPageWithReset />
                  </RequireAuth>
                }
              />
            </Routes>
          </div>
        </div>
      </KakaoAuthProvider>
    </BrowserRouter>
  );
}
