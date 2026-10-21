import styles from "./TestNavigator.module.css";

type Props = {
  total: number;
  actual: number;
  respondidas: boolean[];
  visitadas: boolean[];
  onSelect: (index: number) => void;
  disabled?: boolean;
  itemLabel?: string;
  descripcion?: string;
};

export default function TestNavigator({
  total,
  actual,
  respondidas,
  visitadas,
  onSelect,
  disabled = false,
  itemLabel = "Pregunta",
  descripcion,
}: Props) {
  const cantidad = respondidas.filter(Boolean).length;

  const porcentaje =
    total > 0 ? (cantidad / total) * 100 : 0;

  return (
    <section
      className={styles.navigator}
      aria-label={`Registro de respuestas: ${itemLabel}`}
    >
      <div className={styles.navigatorHeader}>
        <div>
          <span className={styles.sectionEyebrow}>
            SEGUIMIENTO
          </span>

          <h2>Registro de respuestas</h2>

          <p>
            {descripcion ??
              `Seleccioná un número para ir directamente a ${itemLabel.toLowerCase() === "lámina" ? "esa lámina" : "esa pregunta"}.`}
          </p>
        </div>

        <span className={styles.answerCounter}>
          {cantidad} de {total}
        </span>
      </div>

      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label="Progreso de la evaluación"
        aria-valuenow={cantidad}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className={styles.progressFill}
          style={{ width: `${porcentaje}%` }}
        />
      </div>

      <div className={styles.questionGrid}>
        {Array.from({ length: total }, (_, index) => {
          const esActual = index === actual;
          const respondida = Boolean(respondidas[index]);
          const visitada = Boolean(visitadas[index]);

          const estadoClase = esActual
            ? styles.questionCurrent
            : respondida
              ? styles.questionAnswered
              : visitada
                ? styles.questionVisited
                : styles.questionPending;

          return (
            <button
              key={index}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(index)}
              className={`${styles.questionButton} ${estadoClase}`}
              aria-current={esActual ? "step" : undefined}
              aria-label={`${itemLabel} ${index + 1}: ${
                respondida
                  ? "respondida"
                  : visitada
                    ? "visitada sin responder"
                    : "pendiente"
              }`}
            >
              <span>{index + 1}</span>

              {respondida && (
                <span
                  className={styles.questionCheck}
                  aria-hidden="true"
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className={styles.legend}>
        <span>
          <i className={styles.legendAnswered} />
          Respondida
        </span>

        <span>
          <i className={styles.legendCurrent} />
          Actual
        </span>

        <span>
          <i className={styles.legendPending} />
          Pendiente
        </span>
      </div>
    </section>
  );
}