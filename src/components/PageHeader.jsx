// 각 페이지 상단 공통 헤더 (홈 히어로와 동일한 수채화 그라데이션 배경)
const headerBg = [
  "radial-gradient(130px 95px at 16% 20%, rgba(255,250,220,.95), transparent 70%)",
  "radial-gradient(160px 130px at 84% 10%, rgba(150,222,236,.92), transparent 70%)",
  "radial-gradient(170px 140px at 68% 74%, rgba(120,206,228,.8), transparent 72%)",
  "radial-gradient(150px 120px at 18% 90%, rgba(178,234,212,.85), transparent 70%)",
  "radial-gradient(210px 170px at 45% 45%, rgba(220,245,245,.7), transparent 75%)",
  "linear-gradient(165deg,#d3f0f3,#e0f2ec 52%,#f6f1e3)",
].join(", ");

export default function PageHeader({ eyebrow, title, subtitle }) {
  return (
    <header
      className="sticky top-0 z-10 border-b border-basil-100 px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]"
      style={{ background: headerBg }}
    >
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-widest text-basil-600">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-title">
        {title}
      </h1>
      {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
    </header>
  );
}
