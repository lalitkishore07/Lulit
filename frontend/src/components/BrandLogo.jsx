import { Link } from "react-router-dom";

export default function BrandLogo({
  to = "/feed",
  className = "",
  imageClassName = "",
  animated = true,
  compact = false
}) {
  return (
    <Link
      to={to}
      className={`brand-shell inline-flex items-center gap-2 rounded-2xl px-3 py-2 backdrop-blur transition ${className}`}
      aria-label="Go to Lulit feed"
    >
      <span className={`lulit-mark ${animated ? "lulit-mark-animate" : ""} ${imageClassName}`} aria-hidden="true">
        <span className="lulit-mark-orbit" />
        <span className="lulit-mark-spark" />
        <span className="lulit-mark-center">
          <span className="lulit-mark-l" />
        </span>
      </span>
      {!compact ? <span className="brand-word">LULIT</span> : null}
    </Link>
  );
}
