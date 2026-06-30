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
            <h1 className="break-keep [overflow-wrap:anywhere] text-2xl font-bold leading-snug text-title">
              {notice.title}
            </h1>
            <p className="mt-2 text-[13px] text-ink-faint">
              {formatRelative(notice.createdAt)}
            </p>
            {formatExact(notice.createdAt) && (
              <p className="mt-0.5 text-[13px] text-ink-faint">
                {formatExact(notice.createdAt)}
              </p>
            )}

            {Array.isArray(notice.blocks) && notice.blocks.length > 0 ? (
              <div className="mt-5 space-y-4">
                {notice.blocks.map((block, i) => (
                  <BlockView key={i} block={block} />
                ))}
              </div>
            ) : (
              notice.body && (
                <p className="mt-5 whitespace-pre-wrap break-keep [overflow-wrap:anywhere] text-[15px] leading-relaxed text-ink">
                  {notice.body}
                </p>
              )
            )}
          </article>
        )}
      </div>
    </div>
  );
}

function BlockView({ block }) {
  if (block.type === "text") {
    return (
      <p className="whitespace-pre-wrap break-keep [overflow-wrap:anywhere] text-[15px] leading-[1.8] text-ink">
        {block.value}
      </p>
    );
  }

  if (block.type === "image") {
    return (
      <img
        src={block.url}
        alt=""
        className="w-full max-w-full rounded-2xl"
        style={{ height: "auto" }}
      />
    );
  }

  if (block.type === "link") {
    return (
      <a
        href={block.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-2xl border border-basil-200 bg-basil-50 p-4"
      >
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: "#67BDDB" }}
        >
          <LinkIcon />
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold text-basil-700">
          {block.label || block.url}
        </span>
        <span className="shrink-0 text-basil-600">›</span>
      </a>
    );
  }

  if (block.type === "file") {
    return (
      <a
        href={block.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-stretch gap-3 rounded-2xl border border-basil-100 bg-white p-3"
      >
        <span
          className="flex h-[84px] w-[84px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl text-basil-600"
          style={{ background: "#f2f8fa" }}
        >
          <PdfIcon />
          <span className="text-[11px] font-bold">PDF</span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="truncate font-semibold text-ink">{block.name}</span>
          <span className="mt-1 text-sm font-medium text-basil-600">
            보기 / 다운로드 ›
          </span>
        </span>
      </a>
    );
  }

  return null;
}

function PdfIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
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
