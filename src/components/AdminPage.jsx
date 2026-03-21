import { useState } from "react";
import { Link } from "react-router-dom";
import { getClientApiOrigin } from "../utils/apiOrigin";
import "./AdminPage.css";

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  async function load() {
    setError("");
    setPayload(null);
    const origin = getClientApiOrigin();
    if (!origin) {
      setError("API 주소를 알 수 없습니다.");
      return;
    }
    if (!secret.trim()) {
      setError("관리자 비밀키를 입력하세요.");
      return;
    }
    setLoading(true);
    try {
      const r = await fetch(`${origin}/api/admin-overview`, {
        method: "GET",
        headers: { "X-Admin-Secret": secret.trim() },
      });
      const data = await r.json().catch(() => ({}));
      if (r.status === 401) {
        setError("비밀키가 올바르지 않습니다.");
        return;
      }
      if (r.status === 503) {
        setError(
          data?.error === "admin not configured"
            ? "서버에 ADMIN_DASHBOARD_SECRET 이 설정되지 않았습니다."
            : "데이터베이스 또는 관리자 설정을 확인하세요."
        );
        return;
      }
      if (!r.ok) {
        setError(data?.error || `요청 실패 (${r.status})`);
        return;
      }
      setPayload(data);
    } catch (e) {
      setError(e?.message || "네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <Link to="/" className="admin-back">
          ← 홈
        </Link>
        <h1>관리자 요약</h1>
        <p className="admin-lead">
          클라우드에 동기화된 사용자만 표시됩니다. 닉네임·이메일은 DB에 저장하지 않아 카카오 ID만 보입니다.
        </p>
      </header>

      <section className="admin-auth-panel">
        <label className="admin-label" htmlFor="admin-secret">
          관리자 비밀키 (서버 환경 변수 ADMIN_DASHBOARD_SECRET)
        </label>
        <div className="admin-auth-row">
          <input
            id="admin-secret"
            type="password"
            className="admin-secret-input"
            autoComplete="off"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="배포 환경에 설정한 값"
          />
          <button type="button" className="admin-load-btn" disabled={loading} onClick={() => void load()}>
            {loading ? "불러오는 중…" : "불러오기"}
          </button>
        </div>
        {error && <p className="admin-error">{error}</p>}
      </section>

      {payload && (
        <section className="admin-results">
          <p className="admin-meta">
            기준 시각: {payload.generatedAt} · 사용자 수: {payload.userCount}
          </p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">카카오 ID</th>
                  <th scope="col">마지막 통계 동기화</th>
                  <th scope="col">참여 목차 수</th>
                  <th scope="col">정답 누적</th>
                  <th scope="col">오답 누적</th>
                  <th scope="col">채점 횟수</th>
                  <th scope="col">즐겨찾기 문항 수</th>
                </tr>
              </thead>
              <tbody>
                {payload.users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="admin-table-empty">
                      동기화된 사용자가 없습니다.
                    </td>
                  </tr>
                ) : (
                  payload.users.map((u) => (
                    <tr key={u.kakaoId}>
                      <td className="admin-mono">{u.kakaoId}</td>
                      <td>{u.lastStatsSyncAt ? new Date(u.lastStatsSyncAt).toLocaleString("ko-KR") : "—"}</td>
                      <td>{u.topicsTouched}</td>
                      <td>{u.totalCorrect}</td>
                      <td>{u.totalWrong}</td>
                      <td>{u.totalAttempts}</td>
                      <td>{u.favoriteCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
