import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { enablePush } from "../lib/push";
import { formatRelative } from "../lib/time";
import { truncateTitle } from "../lib/text";
import { firstImageUrl, firstFile } from "../lib/blocks";
import { goToAnnouncement } from "../lib/nav";

// 알림 권한이 아직 결정되지 않았을 때만(default) "알림 받기" 버튼을 노출.
// 미지원 환경에서는 Notification 자체가 없으므로 숨김 처리됨.
function initialPermission() {
  return typeof Notification !== "undefined" ? Notification.permission : "unsupported";
}

export default function Home() {
  const [notices, setNotices] = useState([]);
  const [pushMsg, setPushMsg] = useState("");
  const [permission, setPermission] = useState(initialPermission);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const q = query(
      collection(db, "announcements"),
      orderBy("createdAt", "desc"),
      limit(2)
    );
    return onSnapshot(q, (snap) => {
      setNotices(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  async function handleEnablePush() {
    setPushMsg("");
    const result = await enablePush();
    setPermission(initialPermission());
    if (result.ok) {
      setPushMsg("알림이 설정되었어요.");
    } else if (result.reason === "unsupported") {
      setPushMsg("이 기기/브라우저에서는 알림을 지원하지 않아요.");
    } else if (result.reason === "denied") {
      setPushMsg("알림 권한이 거부되었어요. 브라우저 설정에서 허용해주세요.");
    } else {
      setPushMsg("알림 설정에 실패했어요. 다시 시도해주세요.");
    }
  }

  return (
    <div>
      {/* 히어로 — 수채화 하늘빛 그라데이션 (안전영역까지 채움) */}
      <section
        className="relative overflow-hidden px-6 pb-8 pt-[max(2.5rem,calc(env(safe-area-inset-top)+1.25rem))]"
        style={{
          background: [
            "radial-gradient(130px 95px at 16% 20%, rgba(255,250,220,.95), transparent 70%)",
            "radial-gradient(160px 130px at 84% 10%, rgba(150,222,236,.92), transparent 70%)",
            "radial-gradient(170px 140px at 68% 74%, rgba(120,206,228,.8), transparent 72%)",
            "radial-gradient(150px 120px at 18% 90%, rgba(178,234,212,.85), transparent 70%)",
            "radial-gradient(210px 170px at 45% 45%, rgba(220,245,245,.7), transparent 75%)",
            "linear-gradient(165deg,#d3f0f3,#e0f2ec 52%,#f6f1e3)",
          ].join(", "),
        }}
      >
        {/* ✦ 반짝임 (흰색) */}
        <Sparkle className="left-7 top-[16%]" size={9} color="#FFFFFF" />
        <Sparkle className="right-8 top-[24%]" size={13} color="#FFFFFF" />
        <Sparkle className="right-14 top-[60%]" size={7} color="#FFFFFF" />
        <Sparkle className="bottom-[18%] left-[24%]" size={11} color="#FFFFFF" />

        <p className="relative text-[11px] font-semibold uppercase tracking-[0.22em] text-basil-600">
          2026 로뎀나무교회 청년대학부 여름말씀캠프
        </p>

        <h1
          className="relative mt-4 leading-[1.3] tracking-tight text-title"
          style={{
            whiteSpace: "nowrap",
            fontWeight: 400,
            fontSize: "clamp(1.4rem, 6.5vw, 1.65rem)",
          }}
        >
          아담아, 네가 어디 있느냐?
        </h1>

        <p className="relative mt-2 text-[22px] font-bold italic text-title">
          Where are you?
        </p>
      </section>

      {/* 주제 말씀 */}
      <section className="px-6 pb-9 pt-7">
        <blockquote className="rounded-2xl border border-[#D4E6EC] bg-basil-50 p-5">
          <p className="break-keep text-[15px] leading-relaxed text-ink">
            여호와 하나님이 아담을 부르시며 이르시되
            <br />
            네가 어디 있느냐?
          </p>
          <footer className="mt-2 text-sm font-bold text-basil-600">
            창세기 3:9
          </footer>
        </blockquote>
      </section>

      {/* 공지 — Firestore 실시간 구독 (홈에서 가장 강조되는 영역) */}
      <section className="px-6">
        {notices.length > 0 ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-ink">공지</p>
              <Link to="/announcements" className="text-sm font-medium text-basil-600">
                전체 보기 ›
              </Link>
            </div>

            <div className="space-y-3">
              {notices.map((notice, i) => {
                const img = firstImageUrl(notice);
                const file = firstFile(notice);
                return (
                  <button
                    key={notice.id}
                    type="button"
                    onClick={() => goToAnnouncement(navigate, location.pathname, notice.id)}
                    className={`block w-full text-left ${
                      i === 0
                        ? "rounded-3xl border-2 border-basil-500 bg-basil-50 p-6 shadow-sm"
                        : "rounded-3xl border border-basil-100 bg-white p-5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {i === 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-basil-600 px-3 py-1 text-[11px] font-semibold text-white">
                          <BellIcon />
                          공지
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="shrink-0 text-[11px] text-basil-400">
                        {formatRelative(notice.createdAt)}
                      </span>
                    </div>

                    {/* A형: 좌측 본문 + 우측 64px 썸네일(밑단 정렬) */}
                    <div className="mt-3 flex items-end gap-3">
                      <div className="min-w-0 flex-1">
                        <h2
                          className={`truncate font-bold leading-snug text-title ${
                            i === 0 ? "text-2xl" : "text-lg"
                          }`}
                        >
                          {truncateTitle(notice.title)}
                        </h2>
                        {notice.body && (
                          <p className="mt-2 line-clamp-2 break-keep [overflow-wrap:anywhere] text-[15px] leading-relaxed text-ink-soft">
                            {notice.body}
                          </p>
                        )}
                        {file && (
                          <span className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-basil-100 px-2.5 py-1 text-[12px] text-basil-700">
                            <ClipIcon />
                            <span className="truncate">{chipName(file.name)}</span>
                          </span>
                        )}
                      </div>
                      {img && (
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-basil-100">
                          <img src={img} alt="" className="h-full w-full object-cover" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex items-start gap-3 rounded-3xl border border-basil-100 bg-white p-5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-basil-50 text-basil-600">
              <BellIcon />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">공지사항</p>
              <p className="mt-0.5 break-keep text-sm leading-relaxed text-ink-soft">
                등록된 공지가 없습니다. 캠프 기간 중 새 공지가 올라오면 여기에
                표시됩니다.
              </p>
            </div>
          </div>
        )}

        {permission === "default" && (
          <>
            <button
              type="button"
              onClick={handleEnablePush}
              className="mt-3 w-full rounded-xl border border-basil-100 bg-basil-50 py-2.5 text-sm font-semibold text-basil-700"
            >
              알림 받기
            </button>
            <p className="mt-1.5 break-keep text-center text-[11px] text-ink-faint">
              아이폰은 홈 화면에 추가 후 그 아이콘으로 실행해야 알림을 받을 수
              있어요.
            </p>
          </>
        )}
        {pushMsg && (
          <p className="mt-2 text-center text-xs text-ink-faint">{pushMsg}</p>
        )}
      </section>

      <p className="px-6 py-9 text-center text-xs text-ink-faint">
        로뎀나무교회 청년대학부 · 말씀캠프 앱
      </p>
    </div>
  );
}

// 파일명이 10자 초과면 확장자 포함 앞 10자 + …
function chipName(name) {
  if (!name) return "";
  return name.length > 10 ? name.slice(0, 10) + "…" : name;
}

/* --- 아이콘 --- */
const sw = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" {...sw}>
      <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

function ClipIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" {...sw} className="shrink-0">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

/* 히어로 위 ✦ 반짝임 (절대위치) */
function Sparkle({ className = "", size = 10, color = "#E6CF94" }) {
  return (
    <span
      className={`pointer-events-none absolute select-none ${className}`}
      style={{ fontSize: size, color, lineHeight: 1 }}
      aria-hidden="true"
    >
      ✦
    </span>
  );
}
