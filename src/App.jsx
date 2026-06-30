import { useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import BottomNav from "./components/BottomNav.jsx";
import SplashScreen, { SPLASH_TIMING } from "./components/SplashScreen.jsx";
import Toast from "./components/Toast.jsx";
import { setBadgeCount } from "./lib/badge";
import { goToAnnouncement } from "./lib/nav";
import Home from "./pages/Home.jsx";
import Schedule from "./pages/Schedule.jsx";
import Rooms from "./pages/Rooms.jsx";
import Verses from "./pages/Verses.jsx";
import Admin from "./pages/Admin.jsx";
import Announcements from "./pages/Announcements.jsx";
import AnnouncementDetail from "./pages/AnnouncementDetail.jsx";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // 콜드 스타트마다 스플래시 노출 (마운트 시 1회)
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashStage, setSplashStage] = useState(1);
  const [splashLeaving, setSplashLeaving] = useState(false);

  // 포그라운드 새 공지 인앱 토스트
  const [toast, setToast] = useState(null); // { id, title }
  const lastNoticeIdRef = useRef(null);

  useEffect(() => {
    const toStage2 = setTimeout(() => setSplashStage(2), SPLASH_TIMING.stage2At);
    const toLeave = setTimeout(() => setSplashLeaving(true), SPLASH_TIMING.finishAt);
    const toEnd = setTimeout(
      () => setSplashVisible(false),
      SPLASH_TIMING.finishAt + SPLASH_TIMING.fadeOut
    );
    return () => {
      clearTimeout(toStage2);
      clearTimeout(toLeave);
      clearTimeout(toEnd);
    };
  }, []);

  // 앱이 보이게 되면 읽지 않은 공지 카운트와 앱 아이콘 배지를 초기화
  useEffect(() => {
    function clearBadge() {
      if (document.visibilityState !== "visible") return;
      setBadgeCount(0);
      try {
        navigator.clearAppBadge?.();
      } catch {
        // Badging API 미지원 무시
      }
    }
    clearBadge(); // 앱 진입 시 1회
    document.addEventListener("visibilitychange", clearBadge);
    return () => document.removeEventListener("visibilitychange", clearBadge);
  }, []);

  // 포그라운드에서 새 공지 감지 → 인앱 토스트 (알림 권한 무관, 홈 구독과 별개)
  useEffect(() => {
    const q = query(
      collection(db, "announcements"),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    let initialized = false;
    return onSnapshot(q, (snap) => {
      const doc = snap.empty ? null : snap.docs[0];
      const id = doc?.id ?? null;
      // 첫 스냅샷은 기준값만 저장하고 토스트를 띄우지 않음
      if (!initialized) {
        initialized = true;
        lastNoticeIdRef.current = id;
        return;
      }
      if (id && id !== lastNoticeIdRef.current) {
        lastNoticeIdRef.current = id;
        if (document.visibilityState === "visible") {
          setToast({ id, title: doc.data().title });
        }
      }
    });
  }, []);

  return (
    <>
      {splashVisible && (
        <SplashScreen stage={splashStage} leaving={splashLeaving} />
      )}

      {toast && (
        <Toast
          key={toast.id}
          title={toast.title}
          onClick={() => {
            const id = toast.id;
            setToast(null);
            goToAnnouncement(navigate, location.pathname, id);
          }}
          onClose={() => setToast(null)}
        />
      )}

      {/* 전체 높이 flex 컬럼: 본문만 내부 스크롤, 하단 탭은 항상 맨 아래 고정 */}
      {/* iOS standalone PWA에는 브라우저 툴바가 없어 100vh가 화면 전체를 정확히 잡는다
          (dvh/svh/%는 standalone에서 화면보다 짧게 잡혀 하단 공백이 생김) */}
      <div className="mx-auto flex h-screen max-w-md flex-col bg-white">
        {/* 콘텐츠 영역 (이 안에서만 스크롤) */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/verses" element={<Verses />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/announcements/:id" element={<AnnouncementDetail />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <BottomNav />
      </div>
    </>
  );
}
