import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { resizeImage, uploadToStorage } from "../lib/upload";

let blockSeq = 0;
const newId = () => `b${Date.now()}_${blockSeq++}`;
const emptyText = () => ({ _id: newId(), type: "text", value: "" });

export default function Admin() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState([emptyText()]);
  const [isPinned, setIsPinned] = useState(false);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  async function login(e) {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, pw);
    } catch {
      setMsg("로그인 실패");
    }
  }

  function updateBlock(id, patch) {
    setBlocks((prev) =>
      prev.map((b) => (b._id === id ? { ...b, ...patch } : b))
    );
  }

  function removeBlock(id) {
    setBlocks((prev) => prev.filter((b) => b._id !== id));
  }

  function moveBlock(id, dir) {
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b._id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function addText() {
    setBlocks((prev) => [...prev, emptyText()]);
  }

  function addLink() {
    setBlocks((prev) => [...prev, { _id: newId(), type: "link", url: "", label: "" }]);
  }

  // 이미지/파일 선택 → 블록 추가(업로드 중) → 업로드 완료 시 url 채움
  async function handlePick(e, kind) {
    const input = e.target;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    const id = newId();
    const base =
      kind === "image"
        ? { _id: id, type: "image", url: "", path: "", uploading: true, progress: 0 }
        : { _id: id, type: "file", url: "", path: "", name: file.name, uploading: true, progress: 0 };
    setBlocks((prev) => [...prev, base]);

    try {
      const toUpload = kind === "image" ? await resizeImage(file) : file;
      const { url, path } = await uploadToStorage(toUpload, (pct) =>
        updateBlock(id, { progress: pct })
      );
      updateBlock(id, { url, path, uploading: false });
    } catch (err) {
      console.error("upload failed", err);
      removeBlock(id);
      setMsg("업로드에 실패했습니다. 다시 시도해주세요.");
    }
  }

  async function send(e) {
    e.preventDefault();
    setMsg("");

    if (!title.trim()) {
      setMsg("제목을 입력해주세요.");
      return;
    }
    if (blocks.some((b) => b.uploading)) {
      setMsg("업로드가 끝난 뒤 발송해주세요.");
      return;
    }

    // 저장용 블록 정리: 빈 텍스트 제거, 내부 필드(_id 등) 제거
    const cleaned = blocks
      .map((b) => {
        if (b.type === "text")
          return b.value.trim() ? { type: "text", value: b.value } : null;
        if (b.type === "image")
          return b.url ? { type: "image", url: b.url, path: b.path } : null;
        if (b.type === "file")
          return b.url ? { type: "file", url: b.url, name: b.name, path: b.path } : null;
        if (b.type === "link")
          return b.url?.trim()
            ? { type: "link", url: b.url.trim(), label: b.label?.trim() || b.url.trim() }
            : null;
        return null;
      })
      .filter(Boolean);

    if (cleaned.length === 0) {
      setMsg("내용을 한 가지 이상 추가해주세요.");
      return;
    }

    // body: 첫 텍스트 블록 (홈/목록 미리보기 + 푸시 본문 호환)
    const body = (blocks.find((b) => b.type === "text")?.value || "").trim();

    setSending(true);
    try {
      const batch = writeBatch(db);
      const newRef = doc(collection(db, "announcements"));
      batch.set(newRef, {
        title: title.trim(),
        body,
        blocks: cleaned,
        pinned: isPinned,
        createdAt: serverTimestamp(),
      });
      // 한 번에 하나만 고정: 기존 고정 공지들을 모두 해제
      if (isPinned) {
        const prevPinned = await getDocs(
          query(collection(db, "announcements"), where("pinned", "==", true))
        );
        prevPinned.forEach((d) => batch.update(d.ref, { pinned: false }));
      }
      await batch.commit();

      setTitle("");
      setBlocks([emptyText()]);
      setIsPinned(false);
      setMsg("공지 발송 완료");
    } catch (err) {
      console.error("send failed", err);
      setMsg("발송에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSending(false);
    }
  }

  if (!user) {
    return (
      <form onSubmit={login} className="space-y-3 p-6">
        <h1 className="text-xl font-bold text-ink">관리자 로그인</h1>
        <input
          className="w-full rounded-xl border border-basil-100 bg-basil-50 px-4 py-2.5"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="w-full rounded-xl border border-basil-100 bg-basil-50 px-4 py-2.5"
          placeholder="비밀번호"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <button className="w-full rounded-xl bg-basil-600 py-2.5 font-semibold text-white">
          로그인
        </button>
        {msg && <p className="text-sm text-ink-soft">{msg}</p>}
      </form>
    );
  }

  return (
    <form onSubmit={send} className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">공지 작성</h1>
        <button type="button" onClick={() => signOut(auth)} className="text-sm text-ink-faint">
          로그아웃
        </button>
      </div>

      <input
        className="w-full rounded-xl border border-basil-100 bg-basil-50 px-4 py-2.5"
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
      />

      {/* 블록 리스트 */}
      <div className="space-y-3">
        {blocks.map((block, i) => (
          <BlockEditor
            key={block._id}
            block={block}
            isFirst={i === 0}
            isLast={i === blocks.length - 1}
            onPatch={(patch) => updateBlock(block._id, patch)}
            onRemove={() => removeBlock(block._id)}
            onMoveUp={() => moveBlock(block._id, -1)}
            onMoveDown={() => moveBlock(block._id, 1)}
          />
        ))}
      </div>

      {/* 블록 추가 버튼 */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={addText}
          className="rounded-full border border-basil-200 px-3 py-1.5 text-sm font-medium text-basil-700"
        >
          텍스트 추가
        </button>
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="rounded-full border border-basil-200 px-3 py-1.5 text-sm font-medium text-basil-700"
        >
          이미지 추가
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full border border-basil-200 px-3 py-1.5 text-sm font-medium text-basil-700"
        >
          파일 추가
        </button>
        <button
          type="button"
          onClick={addLink}
          className="rounded-full border border-basil-200 px-3 py-1.5 text-sm font-medium text-basil-700"
        >
          링크 추가
        </button>
      </div>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handlePick(e, "image")}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        onChange={(e) => handlePick(e, "file")}
        className="hidden"
      />

      <label className="flex items-center gap-2.5 rounded-xl border border-basil-100 bg-basil-50 px-4 py-3">
        <input
          type="checkbox"
          checked={isPinned}
          onChange={(e) => setIsPinned(e.target.checked)}
          className="h-4 w-4 accent-basil-600"
        />
        <span className="text-sm font-medium text-ink">이 공지를 홈에 고정</span>
      </label>

      <button
        disabled={sending}
        className="w-full rounded-xl bg-basil-600 py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {sending ? "발송 중…" : "공지 발송 (푸시)"}
      </button>
      {msg && <p className="text-sm text-basil-600">{msg}</p>}
    </form>
  );
}

const BLOCK_LABEL = { text: "텍스트", image: "이미지", file: "파일", link: "링크" };

function BlockEditor({ block, isFirst, isLast, onPatch, onRemove, onMoveUp, onMoveDown }) {
  return (
    <div className="rounded-2xl border border-basil-100 bg-white p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-basil-500">
          {BLOCK_LABEL[block.type] ?? block.type}
        </span>
        <div className="flex items-center gap-1">
          <IconBtn label="위로" disabled={isFirst} onClick={onMoveUp}>
            <path d="m6 15 6-6 6 6" />
          </IconBtn>
          <IconBtn label="아래로" disabled={isLast} onClick={onMoveDown}>
            <path d="m6 9 6 6 6-6" />
          </IconBtn>
          <IconBtn label="삭제" onClick={onRemove}>
            <path d="M18 6 6 18M6 6l12 12" />
          </IconBtn>
        </div>
      </div>

      {block.type === "text" && (
        <textarea
          rows={4}
          className="w-full rounded-xl border border-basil-100 bg-basil-50 px-3 py-2 text-[15px]"
          placeholder="내용을 입력하세요."
          value={block.value}
          onChange={(e) => onPatch({ value: e.target.value })}
        />
      )}

      {block.type === "link" && (
        <div className="space-y-2">
          <input
            className="w-full rounded-xl border border-basil-100 bg-basil-50 px-3 py-2 text-sm"
            placeholder="표시 이름 (예: 말씀 자료 드라이브)"
            value={block.label}
            onChange={(e) => onPatch({ label: e.target.value })}
          />
          <input
            type="url"
            inputMode="url"
            className="w-full rounded-xl border border-basil-100 bg-basil-50 px-3 py-2 text-sm"
            placeholder="https://..."
            value={block.url}
            onChange={(e) => onPatch({ url: e.target.value })}
          />
        </div>
      )}

      {block.type === "image" &&
        (block.uploading ? (
          <ProgressBar progress={block.progress} label="이미지 업로드 중" />
        ) : (
          <img
            src={block.url}
            alt=""
            className="w-full rounded-xl border border-basil-100"
            style={{ height: "auto" }}
          />
        ))}

      {block.type === "file" &&
        (block.uploading ? (
          <ProgressBar progress={block.progress} label="파일 업로드 중" />
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-basil-50 px-3 py-2.5">
            <ClipIcon />
            <span className="truncate text-sm text-ink">{block.name}</span>
          </div>
        ))}
    </div>
  );
}

function ProgressBar({ progress, label }) {
  return (
    <div>
      <p className="mb-1 text-xs text-ink-faint">
        {label} {progress}%
      </p>
      <div className="h-2 w-full overflow-hidden rounded-full bg-basil-100">
        <div
          className="h-full rounded-full bg-basil-500 transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function IconBtn({ children, label, disabled, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg p-1.5 text-ink-faint disabled:opacity-30"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}

function ClipIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-basil-600"
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
