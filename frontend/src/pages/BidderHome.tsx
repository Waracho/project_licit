import { Link } from "react-router-dom";
import { HelpCircle, FilePlus2, ClipboardList, Search } from "lucide-react";
import heroUrl from "../assets/licit.webp";
import "./BidderHome.css";
import BidderSteps from "./BidderPages/BidderSteps/BidderSteps";

export default function BidderHome() {
  return (
    <>
      {/* HERO: ocupa el alto de la pantalla */}
      <section
        className="bidder-hero"
        style={{ backgroundImage: `url(${heroUrl})` }}
      >
        <div className="bidder-hero__content">
          <h1 className="bh-title">Encuentra y postula tu licitación en minutos</h1>
          <p className="bh-sub">
            Sube tus documentos, sigue el estado de tus postulaciones y recibe
            notificaciones en cada etapa del proceso.
          </p>

          <div className="bh-actions">
            <Link to="/bidder/tenders/how-to" className="bh-btn">
              <HelpCircle size={18} aria-hidden />
              <span>¿Cómo postular?</span>
            </Link>

            <Link to="/bidder/tenders/new" className="bh-btn bh-btn--primary">
              <FilePlus2 size={18} aria-hidden />
              <span>¡Postular ya!</span>
            </Link>

            <Link to="/bidder/tenders/list" className="bh-btn">
              <ClipboardList size={18} aria-hidden />
              <span>Ver mis postulaciones</span>
            </Link>

            <Link to="/bidder/tenders" className="bh-btn">
              <Search size={18} aria-hidden />
              <span>Explorar licitaciones</span>
            </Link>
          </div>
        </div>
        {/* Nada más dentro del hero */}
      </section>

      {/* Sección siguiente: aparece al hacer scroll */}
      <BidderSteps />
    </>
  );
}
