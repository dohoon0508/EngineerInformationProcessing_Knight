import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import { KakaoAuthProvider } from "./context/KakaoAuthContext";
import HomePage from "./components/HomePage";
import QuizPage from "./components/QuizPage";
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
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/quiz/:topicId" element={<QuizPageWithReset />} />
          </Routes>
        </div>
      </KakaoAuthProvider>
    </BrowserRouter>
  );
}
