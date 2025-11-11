import { Link, NavLink } from "react-router-dom";
import "./NavigationBar.css";
import UserMenu, { type MenuItem } from "../user_menu/UserMenu";
import type { NavItem } from "../../../features/auth/navForRol";

type Props = {
  userMenuItems?: MenuItem[];
  navItems?: NavItem[];
  brandTo?: string;
};

export default function NavigationBar({ userMenuItems, navItems, brandTo = "/logged" }: Props) {
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <Link to={brandTo} className="topbar__brand">LicitAgil</Link>

        <nav className="topbar__nav">
          {navItems?.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={!!it.exact} // 👈 solo Inicio es exacto
              className={({ isActive }) => "topbar__link" + (isActive ? " is-active" : "")}
            >
              {it.icon ? <span className="topbar__link-icon">{it.icon}</span> : null}
              <span>{it.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="topbar__actions">
          {userMenuItems?.length ? <UserMenu items={userMenuItems} align="right" /> : null}
        </div>
      </div>
    </header>
  );
}