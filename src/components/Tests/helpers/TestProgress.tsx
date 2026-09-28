import styles from "./TestProgress.module.css";

type Props = {
  total: number;
  completadas: boolean[];
  titulo?: string;
  itemLabel?: string;
};

export default function TestProgress({
  total,
  completadas,
  titulo = "Progreso",
  itemLabel = "Lámina",
}: Props) {
  const cantidadCompletadas =
    completadas.filter(Boolean).length;

  const porcentaje =
    total > 0
      ? (cantidadCompletadas / total) * 100
      : 0;

  const irAItem = (index: number) => {
    const elemento = document.getElementById(
      `test-item-${index}`,
    );

    elemento?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "center",
    });
    // Move keyboard and screen-reader navigation to the selected response.
    elemento?.querySelector<HTMLElement>("textarea, input, button")?.focus({ preventScroll: true });
  };

  return (
    <aside className={styles.card}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            Evaluación
          </span>

          <h3>{titulo}</h3>
        </div>

        <span className={styles.counter}>
          {cantidadCompletadas} / {total}
        </span>
      </div>

      <div
        className={styles.progressTrack}
        aria-hidden="true"
      >
        <div
          className={styles.progressFill}
          style={{
            width: `${porcentaje}%`,
          }}
        />
      </div>

      <p className={styles.summary} role="status">
        {cantidadCompletadas === total
          ? "Todas las respuestas están completas."
          : `${cantidadCompletadas} de ${total} respondidas`}
      </p>

      <div className={styles.items}>
        {Array.from({ length: total }).map(
          (_, index) => {
            const completa =
              completadas[index] ?? false;

            return (
              <button
                key={index}
                type="button"
                className={`${styles.item} ${
                  completa
                    ? styles.completed
                    : styles.pending
                }`}
                onClick={() => irAItem(index)}
                title={`${itemLabel} ${index + 1}${
                  completa
                    ? " · Respondida"
                    : " · Pendiente"
                }`}
                aria-label={`Ir a ${itemLabel.toLowerCase()} ${
                  index + 1
                }. ${
                  completa
                    ? "Respondida"
                    : "Pendiente"
                }`}
              >
                <span className={styles.itemNumber}>
                  {String(index + 1).padStart(
                    2,
                    "0",
                  )}
                </span>

                {completa && (
                  <span
                    className={styles.check}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          },
        )}
      </div>

      <div className={styles.legend}>
        <span className={styles.legendDot} />

        <p>
          Las respuestas completadas se marcarán automáticamente. Seleccione un número para revisarlas.
        </p>
      </div>
    </aside>
  );
}
