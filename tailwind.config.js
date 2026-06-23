/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // 포스터 하늘빛/틸 팔레트 (수채화 톤 · 화이트 베이스)
        basil: {
          50: "#F2F8FA",
          100: "#E3EEF0",
          200: "#CFE6EE",
          300: "#A9C4CF",
          400: "#7BB0C4",
          500: "#5A93AC",
          600: "#3F7D99",
          700: "#356A83",
          800: "#2A5468",
          900: "#21343C",
        },
        ink: {
          DEFAULT: "#21343C", // 본문 (짙은 틸-블랙)
          soft: "#52707D", // 보조 텍스트
          faint: "#8AA6B3", // 흐린 텍스트
        },
        // 제목/공지 제목용 짙은 틸 강조색
        title: "#2F5E72",
      },
      fontFamily: {
        sans: [
          "Gowun Batang",
          "Apple SD Gothic Neo",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "serif",
        ],
      },
    },
  },
  plugins: [],
};
