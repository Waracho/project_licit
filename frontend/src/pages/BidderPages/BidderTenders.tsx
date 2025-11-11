import { Link } from "react-router-dom";
import { HelpCircle, FilePlus2, ClipboardList } from "lucide-react";
import "./BidderTenders.css";

export default function BidderTenders() {
  return (
    <div className="bt-container">
      <div className="bt-grid">
        <Link to="/bidder/tenders/how-to" className="bt-tile bt-tile--large">
          <div className="bt-icon"><HelpCircle size={36} aria-hidden /></div>
          <h3 className="bt-title">¿Cómo postular?</h3>
          <p className="bt-sub">Guía rápida de pasos y requisitos</p>
        </Link>

        <Link to="/bidder/tenders/new" className="bt-tile">
          <div className="bt-icon"><FilePlus2 size={32} aria-hidden /></div>
          <h3 className="bt-title">Postular</h3>
          <p className="bt-sub">Crear una nueva licitación</p>
        </Link>

        <Link to="/bidder/tenders/list" className="bt-tile">
          <div className="bt-icon"><ClipboardList size={32} aria-hidden /></div>
          <h3 className="bt-title">Ver mis postulaciones</h3>
          <p className="bt-sub">Revisa el estado de tus envíos</p>
        </Link>
      </div>
    </div>
  );
}
