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
            {notice.body && renderBody(notice.body)}

            {notice.attachments?.length > 0 && (
              <div className="mt-6 rounded-2xl border border-basil-100 bg-basil-50 p-4">
                <h2 className="text-sm font-semibold text-title">첨부파일</h2>
                <ul className="mt-3 space-y-2">
                  {notice.attachments.map((file, index) => (
                    <li key={`${file.name}-${index}`}>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-xl border border-basil-100 bg-white px-3 py-2.5 text-sm text-basil-700"
                      >
                        <span>{file.name}</span>
                        <span className="text-xs text-basil-600">열기</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        )}
      </div>
    </div>
  );
}

function renderBody(body) {
  const imagePattern = /!\[([^\]]*)\]\((https?:\/\/[^)]+)\)/g;
  const matches = Array.from(body.matchAll(imagePattern));

  if (matches.length === 0) {
    return <p className="mt-5 whitespace-pre-wrap break-keep text-[15px] leading-relaxed text-ink">{body}</p>;
  }

  const parts = [];
  let lastIndex = 0;

  matches.forEach((match, index) => {
    const [fullMatch, altText, imageUrl] = match;
    const startIndex = match.index;

    if (startIndex > lastIndex) {
      parts.push(
        <span key={`text-${index}`} className="whitespace-pre-wrap">
          {body.slice(lastIndex, startIndex)}
        </span>
      );
    }

    parts.push(
      <img
        key={`img-${index}`}
        src={imageUrl}
        alt={altText || "공지 이미지"}
        className="my-4 w-full rounded-2xl border border-basil-100 object-cover"
      />
    );

    lastIndex = startIndex + fullMatch.length;
  });

  if (lastIndex < body.length) {
    parts.push(
      <span key="text-end" className="whitespace-pre-wrap">
        {body.slice(lastIndex)}
      </span>
    );
  }

  return <div className="mt-5 space-y-3 break-keep text-[15px] leading-relaxed text-ink">{parts}</div>;
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
