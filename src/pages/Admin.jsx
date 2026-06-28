import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "../firebase";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [msg, setMsg] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  async function login(e) {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, pw);
    } catch {
      setMsg("로그인 실패");
    }
  }

  function insertAtCursor(markdown) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setBody((prev) => `${prev}${prev ? "\n" : ""}${markdown}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = `${body.slice(0, start)}${markdown}${body.slice(end)}`;

    setBody(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + markdown.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  async function uploadFile(file) {
    const safeName = file.name.replace(/\s+/g, "_");
    const storageRef = ref(storage, `announcements/${Date.now()}_${safeName}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }

  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMsg("이미지 파일만 업로드할 수 있습니다.");
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    setMsg("이미지 업로드 중…");

    try {
      const url = await uploadFile(file);
      insertAtCursor(`![${file.name}](${url})`);
      setMsg("이미지 업로드 완료");
    } catch {
      setMsg("이미지 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  async function handlePdfUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setMsg("PDF 파일만 첨부할 수 있습니다.");
      e.target.value = "";
      return;
    }

    setIsUploading(true);
    setMsg("PDF 업로드 중…");

    try {
      const url = await uploadFile(file);
      setAttachments((prev) => [...prev, { name: file.name, url }]);
      setMsg("PDF 첨부 완료");
    } catch {
      setMsg("PDF 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  }

  async function send(e) {
    e.preventDefault();
    if (!title.trim()) {
      setMsg("제목을 입력해주세요.");
      return;
    }

    await addDoc(collection(db, "announcements"), {
      title: title.trim(),
      body,
      attachments,
      createdAt: serverTimestamp(),
    });
    setTitle("");
    setBody("");
    setAttachments([]);
    setMsg("공지 발송 완료");
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
    <form onSubmit={send} className="space-y-3 p-6">
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
      <textarea
        ref={textareaRef}
        rows={6}
        className="w-full rounded-xl border border-basil-100 bg-basil-50 px-4 py-2.5"
        placeholder="내용을 입력하고, 아래 버튼으로 이미지를 넣거나 PDF를 첨부할 수 있습니다."
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="rounded-full border border-basil-200 px-3 py-1.5 text-sm font-medium text-basil-700"
        >
          이미지 추가
        </button>
        <button
          type="button"
          onClick={() => pdfInputRef.current?.click()}
          className="rounded-full border border-basil-200 px-3 py-1.5 text-sm font-medium text-basil-700"
        >
          PDF 첨부
        </button>
      </div>
      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
      <input ref={pdfInputRef} type="file" accept="application/pdf" onChange={handlePdfUpload} className="hidden" />

      {attachments.length > 0 && (
        <div className="rounded-2xl border border-basil-100 bg-basil-50 p-3">
          <p className="text-sm font-semibold text-title">첨부된 PDF</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            {attachments.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2">
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                  className="text-xs text-basil-600"
                >
                  제거
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button disabled={isUploading} className="w-full rounded-xl bg-basil-600 py-2.5 font-semibold text-white disabled:opacity-60">
        {isUploading ? "업로드 중…" : "공지 발송 (푸시)"}
      </button>
      {msg && <p className="text-sm text-basil-600">{msg}</p>}
    </form>
  );
}
