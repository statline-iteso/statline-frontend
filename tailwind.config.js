/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        // One accent per sport, used in tags and charts.
        basquetbol: "#ea580c",
        americano: "#15803d",
        futbol: "#2563eb",
      },
    },
  },
  plugins: [],
};
