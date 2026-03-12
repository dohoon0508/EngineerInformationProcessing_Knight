import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./components/HomePage";
import QuizPage from "./components/QuizPage";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/quiz/:topicId" element={<QuizPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
