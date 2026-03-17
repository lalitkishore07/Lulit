import { useTheme } from "../hooks/useTheme";

const OPTIONS = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "aurora", label: "Aurora" }
];

export default function ThemeSwitcher() {
  const { mode, setMode } = useTheme();

  return (
    <label className="theme-picker" aria-label="Theme selector">
      <span className="theme-picker-label">Theme</span>
      <select className="theme-picker-select" onChange={(event) => setMode(event.target.value)} value={mode}>
        {OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
