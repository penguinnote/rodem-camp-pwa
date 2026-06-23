# Firebase 공지 + 푸시 알림 구현 가이드

이 문서는 캠프 PWA에 **관리자 공지 입력 → 전체 사용자 푸시 알림** 기능을 추가하는 전체 과정을 다룬다.

---

## 0. 전체 구조

```
[관리자] /admin 로그인 → 공지 입력 → Firestore "announcements" 저장
                                          │ onCreate 트리거
                                          ▼
                          [Cloud Function] tokens 전체 조회 → FCM 일괄 발송
                                          ▼
[모든 사용자 폰] 백그라운드 푸시 수신 (firebase-messaging-sw.js)
[홈 화면] announcements 실시간 구독 → 공지 배너 표시
```

- **DB**: Firestore — `announcements` 공지 저장, `tokens` 푸시 토큰 저장
- **푸시**: FCM 웹 푸시 VAPID
- **관리자 인증**: Firebase Auth 이메일/비밀번호
- **발송 서버**: Cloud Functions, Firestore onCreate 트리거

---

## 1. Firebase 콘솔 설정

이 단계는 **사람이 직접 수행한다.**

1. https://console.firebase.google.com 에서 **프로젝트 추가**를 선택한다. 예: `camp-pwa`
2. **빌드 → Firestore Database → 데이터베이스 만들기**를 선택하고 프로덕션 모드, 위치 `asia-northeast3` 서울을 지정한다.
3. **빌드 → Authentication → 시작하기**에서 이메일/비밀번호 로그인을 사용 설정한다.
   - **Users 탭 → 사용자 추가**로 관리자 계정 하나를 생성한다. 예: admin@camp.com
4. **프로젝트 설정 → 일반 → 내 앱 → 웹 앱 추가**를 선택해 앱을 등록한다.
   - 표시되는 `firebaseConfig` 객체를 복사해 둔다. 2단계에서 사용한다.
5. **프로젝트 설정 → 클라우드 메시징 → 웹 푸시 인증서**에서 키 쌍을 생성한다.
   - 생성된 공개 키를 복사해 둔다. `VITE_FIREBASE_VAPID_KEY`에 사용한다.
6. 요금제를 **Blaze 종량제로 업그레이드한다.** Cloud Functions 배포에 필요하다. 소규모 사용에서는 무료 한도 안에 들어오지만 결제수단 등록은 필요하다.

---

## 2. 환경변수 설정

레포 루트인 `camp-app/`에 `.env.local` 파일을 생성한다. `.env.local`은 이미 `.gitignore`에 포함되어 있다.

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=camp-pwa.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=camp-pwa
VITE_FIREBASE_STORAGE_BUCKET=camp-pwa.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...
```

설치 명령은 다음과 같다.

```bash
npm install firebase
```

---

## 3. 서비스워커 충돌 해결

`vite-plugin-pwa`는 기본 `generateSW` 모드로 자체 서비스워커를 생성한다. FCM 백그라운드 수신도 서비스워커를 필요로 하는데, 루트 스코프에 서비스워커가 둘이면 충돌한다.

**해결책은 `injectManifest` 모드로 전환하는 것이다.** 단일 커스텀 서비스워커가 오프라인 캐싱과 FCM 백그라운드 수신을 모두 담당하도록 통합한다.

### vite.config.js 수정

```js
VitePWA({
  strategies: "injectManifest",
  srcDir: "src",
  filename: "sw.js",
  registerType: "autoUpdate",
  devOptions: { enabled: false, type: "module" },
  injectManifest: {
    globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
  },
  manifest: { /* 기존 manifest 유지 */ },
})
```

### src/sw.js 신규 — 캐싱과 FCM 백그라운드 수신

```js
import { precacheAndRoute } from "workbox-precaching";
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

precacheAndRoute(self.__WB_MANIFEST);

const firebaseApp = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});
const messaging = getMessaging(firebaseApp);

onBackgroundMessage(messaging, (payload) => {
  const { title, body } = payload.notification ?? payload.data ?? {};
  self.registration.showNotification(title ?? "공지", {
    body: body ?? "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  });
});
```

**중요: 서비스워커 디버깅이 어려우면 푸시 테스트는 `npm run build && npm run preview`로 수행한다.**

workbox 패키지가 없으면 설치한다.

```bash
npm install -D workbox-precaching
```

---

## 4. src/firebase.js — 앱 초기화

```js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export async function getMessagingIfSupported() {
  return (await isSupported()) ? getMessaging(app) : null;
}
```

---

## 5. src/lib/push.js — 알림 권한과 토큰 등록

```js
import { getToken } from "firebase/messaging";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, getMessagingIfSupported } from "../firebase";

export async function enablePush() {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return { ok: false, reason: "unsupported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: permission };

  const swReg = await navigator.serviceWorker.ready;
  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: swReg,
  });
  if (!token) return { ok: false, reason: "no-token" };

  await setDoc(doc(db, "tokens", token), {
    token,
    ua: navigator.userAgent,
    createdAt: serverTimestamp(),
  });
  return { ok: true, token };
}
```

홈 화면 공지 영역에 "알림 받기" 버튼을 두고 `enablePush()`를 연결한다.

**중요: iOS는 반드시 홈 화면에 추가한 뒤 설치된 앱으로 실행한 상태에서만 권한 요청과 토큰 발급이 동작한다.** 따라서 "홈 화면에 추가 후 실행해야 알림을 받을 수 있다"는 안내 문구가 필수다.

---

## 6. 홈 공지 배너 — Firestore 실시간 구독

`src/pages/Home.jsx`의 공지 영역에 다음을 적용한다.

```jsx
import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

const [notice, setNotice] = useState(null);
useEffect(() => {
  const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(1));
  return onSnapshot(q, (snap) => {
    setNotice(snap.empty ? null : snap.docs[0].data());
  });
}, []);
```

`notice`가 있으면 제목과 본문을, 없으면 "등록된 공지가 없습니다"를 표시한다.

---

## 7. 관리자 페이지 src/pages/Admin.jsx

```jsx
import { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  async function login(e) {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, email, pw); }
    catch { setMsg("로그인 실패"); }
  }

  async function send(e) {
    e.preventDefault();
    await addDoc(collection(db, "announcements"), {
      title, body, createdAt: serverTimestamp(),
    });
    setTitle(""); setBody(""); setMsg("공지 발송 완료");
  }

  if (!user) {
    return (
      <form onSubmit={login} className="space-y-3 p-6">
        <h1 className="text-xl font-bold text-ink">관리자 로그인</h1>
        <input className="w-full rounded-xl border border-basil-100 bg-basil-50 px-4 py-2.5"
          placeholder="이메일" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input type="password" className="w-full rounded-xl border border-basil-100 bg-basil-50 px-4 py-2.5"
          placeholder="비밀번호" value={pw} onChange={(e)=>setPw(e.target.value)} />
        <button className="w-full rounded-xl bg-basil-600 py-2.5 font-semibold text-white">로그인</button>
        {msg && <p className="text-sm text-ink-soft">{msg}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={send} className="space-y-3 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">공지 작성</h1>
        <button type="button" onClick={()=>signOut(auth)} className="text-sm text-ink-faint">로그아웃</button>
      </div>
      <input className="w-full rounded-xl border border-basil-100 bg-basil-50 px-4 py-2.5"
        placeholder="제목" value={title} onChange={(e)=>setTitle(e.target.value)} required />
      <textarea rows={4} className="w-full rounded-xl border border-basil-100 bg-basil-50 px-4 py-2.5"
        placeholder="내용" value={body} onChange={(e)=>setBody(e.target.value)} required />
      <button className="w-full rounded-xl bg-basil-600 py-2.5 font-semibold text-white">공지 발송</button>
      {msg && <p className="text-sm text-basil-600">{msg}</p>}
    </form>
  );
}
```

`src/App.jsx`에 라우트를 추가한다. `<Route path="/admin" element={<Admin />} />`

**관리자 페이지는 하단 탭에 노출하지 않으며, URL로만 접근한다.**

---

## 8. Cloud Function — 공지 저장 시 전체 푸시 발송

```bash
npm install -g firebase-tools
firebase login
firebase init functions
```

`firebase init functions` 실행 시 기존 프로젝트를 선택하고 JavaScript, 2세대를 지정한다.

`functions/index.js`는 다음과 같다.

```js
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

exports.sendAnnouncement = onDocumentCreated(
  { document: "announcements/{id}", region: "asia-northeast3" },
  async (event) => {
    const data = event.data.data();
    const tokensSnap = await getFirestore().collection("tokens").get();
    const tokens = tokensSnap.docs.map((d) => d.id);
    if (tokens.length === 0) return;

    const res = await getMessaging().sendEachForMulticast({
      tokens,
      data: { title: String(data.title), body: String(data.body) },
    });

    const dead = [];
    res.responses.forEach((r, i) => {
      if (!r.success) dead.push(tokens[i]);
    });
    await Promise.all(dead.map((t) =>
      getFirestore().collection("tokens").doc(t).delete()
    ));
  }
);
```

**중요: 메시지는 `notification`이 아니라 `data` 페이로드로 보낸다.** `notification` 페이로드를 사용하면 FCM이 알림을 자동 표시하고 서비스워커가 다시 표시해 알림이 중복으로 도착한다.

배포 명령은 다음과 같다.

```bash
firebase deploy --only functions
```

---

## 9. Firestore 보안 규칙

`firestore.rules`는 다음과 같다.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /announcements/{id} {
      allow read: if true;
      allow create, update, delete: if request.auth != null;
    }
    match /tokens/{token} {
      allow create: if true;
      allow read, update, delete: if false;
    }
  }
}
```

배포 명령은 다음과 같다.

```bash
firebase deploy --only firestore:rules
```

---

## 10. 테스트 순서

1. `npm run build && npm run preview`를 실행하고 데스크톱 크롬에서 "알림 받기"로 권한을 허용한 뒤, Firestore `tokens`에 토큰이 생성되는지 확인한다.
2. `/admin`에 로그인해 공지를 발송하고 데스크톱에 푸시가 도착하는지 확인한다.
3. 배포 후 폰에서 테스트한다.
4. **아이폰은 Safari로 접속한 뒤 홈 화면에 추가하고, 홈 아이콘으로 실행한 상태에서 "알림 받기"로 권한을 허용해야 한다.** 이 순서를 지키지 않으면 토큰이 발급되지 않는다.

**중요: 푸시 팝업은 앱이 백그라운드 상태일 때만 표시된다.** 앱 화면을 보고 있는 동안에는 표시되지 않는다.

---

## 11. 배포

```bash
firebase init hosting
npm run build
firebase deploy --only hosting
```

`firebase init hosting` 실행 시 public 디렉터리는 `dist`, SPA 설정은 Yes로 지정한다.

배포된 URL로 QR 코드를 생성해 캠프 안내자료에 삽입한다.

---

## 체크리스트

- [ ] Firebase 프로젝트, Firestore, Auth, VAPID 키
- [ ] `.env.local` 작성 및 `npm install firebase`
- [ ] vite.config injectManifest 및 `src/sw.js`
- [ ] `src/firebase.js`, `src/lib/push.js`
- [ ] 홈 공지 배너 실시간 구독 및 "알림 받기" 버튼
- [ ] `/admin` 페이지 및 라우트
- [ ] Cloud Function 배포
- [ ] Firestore 보안 규칙 배포
- [ ] 데스크톱에서 폰 순서로 푸시 테스트
- [ ] Hosting 배포 및 QR 생성
