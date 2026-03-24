import { Link } from "react-router-dom";
import BrandLogo from "./BrandLogo";

export default function PageHeader({ title }) {
  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <BrandLogo className="p-2" compact animated={false} imageClassName="h-8 w-8 sm:h-9 sm:w-9" />
        <h1 className="font-display text-2xl sm:text-3xl">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <nav className="flex gap-2 text-sm font-semibold">
          <Link className="nav-pill" to="/feed">
            Feed
          </Link>
          <Link className="nav-pill" to="/create-post">
            Create
          </Link>
          <Link className="nav-pill" to="/profile">
            Profile
          </Link>
          <Link className="nav-pill" to="/messages">
            Messages
          </Link>
          <Link className="nav-pill" to="/dao">
            DAO
          </Link>
          <Link className="nav-pill" to="/settings">
            Settings
          </Link>
        </nav>
      </div>
    </header>
  );
}
