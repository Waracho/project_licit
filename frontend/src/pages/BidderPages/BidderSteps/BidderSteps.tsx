import { FileText, UploadCloud, Send } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import "./BidderSteps.css";

type Step = {
  title: string;
  detail: string;
  icon: ReactNode; // <-- en vez de JSX.Element
};

const STEPS: Step[] = [
  {
    title: "Completa el formulario",
    detail:
      "Ingresa los datos básicos de la licitación: código, categoría, departamento y requisitos. Puedes guardar como borrador.",
    icon: <FileText size={22} aria-hidden />,
  },
  {
    title: "Sube tus archivos",
    detail:
      "Adjunta tus PDFs y documentos de respaldo. Aceptamos varios archivos y te indicamos si falta alguno obligatorio.",
    icon: <UploadCloud size={22} aria-hidden />,
  },
  {
    title: "¡Postula!",
    detail:
      "Revisa el resumen, confirma y envía. Te notificaremos el avance de tu postulación y cualquier observación.",
    icon: <Send size={22} aria-hidden />,
  },
];

export default function BidderSteps() {
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setInView(true),
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={rootRef}
      className={`steps ${inView ? "is-inview" : ""}`}
      aria-label="Pasos para postular"
    >
      <div className="steps__inner">
        <div className="steps__grid" onMouseLeave={() => setActive(active)}>
          {STEPS.map((s, i) => {
            const isActive = i === active;
            return (
              <button
                key={s.title}
                type="button"
                className={`step-card${isActive ? " is-active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                aria-pressed={isActive}
              >
                <span className="step-card__icon">{s.icon}</span>
                <span className="step-card__title">{s.title}</span>
              </button>
            );
          })}
        </div>

        <div className="step-detail" role="region" aria-live="polite">
          <p className="step-detail__text">{STEPS[active].detail}</p>
        </div>
      </div>
    </section>
  );
}
