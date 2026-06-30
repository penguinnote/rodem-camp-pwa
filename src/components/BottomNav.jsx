import { NavLink, useNavigate, useLocation } from "react-router-dom";

// Google Photos 공유 앨범 URL
const PHOTO_ALBUM_URL = "https://photos.app.goo.gl/nZAFegzZbWZtQnx8A";

const tabs = [
  { to: "/", label: "홈", icon: HomeIcon },
  { to: "/schedule", label: "일정", icon: CalendarIcon },
  { to: "/verses", label: "말씀", icon: BookIcon },
  { to: "/rooms", label: "방배정", icon: BedIcon },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  // history를 [홈] 또는 [홈, 현재화면]으로만 유지한다.
  // 홈→탭은 push, 탭→탭은 replace, 탭→홈은 replace로 탭 기록을 쌓지 않는다.
  function handleTab(e, to) {
    e.preventDefault();
    const path = location.pathname;
    if (to === path) return;
    if (to === "/") {
      navigate("/", { replace: true });
    } else if (path === "/") {
      navigate(to);
    } else {
      navigate(to, { replace: true });
    }
  }

  return (
    <nav className="shrink-0 border-t border-[#D4E6EC] bg-white/90 backdrop-blur-md">
      <div className="grid grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            onClick={(e) => handleTab(e, to)}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-3 text-[11px] transition-colors ${
                isActive ? "text-basil-600" : "text-[#9BB3BD]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
                <span className={isActive ? "font-semibold" : "font-medium"}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {/* 사진 — 외부 Google Photos 공유 앨범을 새 탭으로 */}
        <button
          type="button"
          onClick={() => window.open(PHOTO_ALBUM_URL, "_blank")}
          className="flex flex-col items-center gap-1 py-3 text-[11px] text-[#9BB3BD] transition-colors"
        >
          <PhotoIcon active={false} />
          <span className="font-medium">사진</span>
        </button>
      </div>
    </nav>
  );
}

/* --- 인라인 SVG 아이콘 (외부 의존성 없이) --- */
function base(active) {
  return {
    width: 23,
    height: 23,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: active ? 2.1 : 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
}

function HomeIcon({ active }) {
  return (
    <svg {...base(active)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}
function CalendarIcon({ active }) {
  return (
    <svg {...base(active)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}
function BedIcon({ active }) {
  return (
    <svg {...base(active)}>
      <path d="M3 7v12M3 13h18v6M21 13v-2a3 3 0 0 0-3-3H9v5" />
      <circle cx="6.5" cy="10.5" r="1.5" />
    </svg>
  );
}
function BookIcon({ active }) {
  return (
    <svg {...base(active)}>
      {/* 펼친 책 (가운데 책등 + 좌우 페이지) */}
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  );
}
function PhotoIcon({ active }) {
  return (
    <svg {...base(active)}>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M8 6 9.5 3.5h5L16 6" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}
