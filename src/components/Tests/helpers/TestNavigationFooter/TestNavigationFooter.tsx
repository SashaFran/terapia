import BotonPersonalizado from "../../../Boton/Boton";
import styles from "./TestNavigationFooter.module.css";

type TestNavigationFooterProps = {
  actual: number;
  total: number;

  respondidas: number;
  totalRespuestas: number;

  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => void | Promise<void>;

  disabled?: boolean;
  enviando?: boolean;

  itemLabel?: string;
  descripcion?: string;
  detalleProgreso?: string;
};

export default function TestNavigationFooter({
  actual,
  total,
  respondidas,
  totalRespuestas,
  onPrevious,
  onNext,
  onFinish,
  disabled = false,
  enviando = false,
  itemLabel = "Pregunta",
  descripcion = "Completá todas las respuestas para finalizar la evaluación.",
  detalleProgreso,
}: TestNavigationFooterProps) {
  const primera = actual === 0;
  const ultima = actual === total - 1;

  const completo =
    totalRespuestas > 0 &&
    respondidas >= totalRespuestas;

  const faltantes = Math.max(
    0,
    totalRespuestas - respondidas
  );

  const etiqueta = itemLabel.toLowerCase();

  return (
    <div className={styles.container}>
      {/* NAVEGACIÓN ENTRE PREGUNTAS / LÁMINAS */}

      <nav
        className={styles.navigation}
        aria-label={`Navegación de ${etiqueta}s`}
      >
        <BotonPersonalizado
          variant="secondary"
          disabled={primera || disabled || enviando}
          onClick={onPrevious}
        >
          {etiqueta === "lámina"
            ? "Lámina anterior"
            : "Anterior"}
        </BotonPersonalizado>

        {!ultima && (
          <BotonPersonalizado
            variant="primary"
            disabled={disabled || enviando}
            onClick={onNext}
          >
            {etiqueta === "lámina"
              ? "Siguiente lámina"
              : "Siguiente"}
          </BotonPersonalizado>
        )}
      </nav>

      {/* PANEL DE FINALIZACIÓN */}

      <footer className={styles.finishCard}>
        <div className={styles.finishInformation}>
          <span className={styles.finishEyebrow}>
            PROGRESO GENERAL
          </span>

          <strong>
            {respondidas} de {totalRespuestas}{" "}
            respuestas completadas
          </strong>

          <p>{descripcion}</p>

          {detalleProgreso && (
            <span className={styles.finishSecondary}>
              {detalleProgreso}
            </span>
          )}
        </div>

        <div className={styles.finishAction}>
          <BotonPersonalizado
            variant="primary"
            onClick={onFinish}
            disabled={
              disabled ||
              enviando ||
              !completo
            }
          >
            {enviando
              ? "Enviando..."
              : completo
                ? "Finalizar test"
                : `Faltan ${faltantes} ${
                    faltantes === 1
                      ? "respuesta"
                      : "respuestas"
                  }`}
          </BotonPersonalizado>
        </div>
      </footer>
    </div>
  );
}