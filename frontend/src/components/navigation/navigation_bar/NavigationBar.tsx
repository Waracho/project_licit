// src/components/navigation/NavigationBar.tsx
import { Link } from "react-router-dom";
import "./NavigationBar.css";
import UserMenu, { type MenuItem } from "../user_menu/UserMenu"

type Props = {
  userMenuItems?: MenuItem[];
  userLabel?: string;
};

export default function NavigationBar({ userMenuItems, userLabel }: Props) {
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <Link to="/logged" className="topbar__brand">LicitAgil</Link>
        <nav className="topbar__nav">
          <Link to="/logged">Inicio</Link>
        </nav>
        <div className="topbar__actions">
          {userMenuItems?.length ? (
            <UserMenu items={userMenuItems} align="right" label={userLabel} />
          ) : null}
        </div>
      </div>
    </header>
  );
}
