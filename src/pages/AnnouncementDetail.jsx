import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { formatRelative } from "../lib/time";

// Firestore Timestamp → 정확한 날짜시간 문자열 (예: 2026. 6. 23. 오후 1:36)
function formatExact(createdAt) {
  if (!createdAt) return "";
  const date = typeof createdAt.toDate === "function" ? createdAt.toDate() : createdAt;
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AnnouncementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notice, setNotice] = useState(undefined); // undefined: 로딩, null: 없음

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const snap = await getDoc(doc(db, "announcements", id));
      if (!cancelled) setNotice(snap.exists() ? snap.data() : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div>
      {/* 상단 뒤로가기 */}
      <header className="sticky top-0 z-10 border-b border-basil-100 bg-white/90 px-5 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))] backdrop-blur-md">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-medium text-basil-600"
        >
          <BackIcon />
          뒤로
        </button>
      </header>

      <div className="px-6 py-6">
        {notice === undefined ? (
          <p className="text-sm text-ink-faint">불러오는 중…</p>
        ) : notice === null ? (
          <p className="rounded-2xl border border-basil-100 bg-white p-6 text-sm text-ink-soft">
            공지를 찾을 수 없습니다.
          </p>
        ) : (
          <article>
            <h1 className="break-keep text-2xl font-bold leading-snug text-title">
              {notice.title}
            </h1>
            <p className="mt-2 text-[13px] text-ink-faint">
              {formatRelative(notice.createdAt)}
              {formatExact(notice.createdAt) && (
                <span className="text-ink-faint"> · {formatExact(notice.createdAt)}</span>
              )}
            </p>
            {notice.body && (
              <p className="mt-5 whitespace-pre-wrap break-keep text-[15px] leading-relaxed text-ink">
                {notice.body}
              </p>
            )}
          </article>
        )}
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
