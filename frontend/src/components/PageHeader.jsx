import { NavLink } from "react-router-dom";
import BrandLogo from "./BrandLogo";

export default function PageHeader({ title }) {
  const navItems = [
    { to: "/feed", label: "Feed" },
    { to: "/create-post", label: "Create" },
    { to: "/profile", label: "Profile" },
    { to: "/messages", label: "Messages" },
    { to: "/dao", label: "DAO" },
    { to: "/settings", label: "Settings" }
  ];

  return (
    <header className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <BrandLogo className="p-2" compact animated={false} imageClassName="h-8 w-8 sm:h-9 sm:w-9" />
        <h1 className="min-w-0 font-display text-2xl sm:text-3xl">{title}</h1>
      </div>
      <div className="w-full xl:w-auto">
        <nav className="flex flex-wrap gap-2 text-sm font-semibold xl:justify-end">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) => `nav-pill ${isActive ? "nav-pill-active" : ""}`}
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
