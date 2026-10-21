import styles from "./TestTimer.module.css";

type TestTimerProps = {
  minutes: number;
  seconds: number;
  label?: string;
};

export default function TestTimer({
  minutes,
  seconds,
  label = "TIEMPO RESTANTE",
}: TestTimerProps) {
  const totalSegundos = Math.max(
    0,
    minutes * 60 + seconds
  );

  const peligro = totalSegundos < 60;
  const advertencia =
    totalSegundos >= 60 && totalSegundos < 300;

  const minutosFormateados = String(
    Math.floor(totalSegundos / 60)
  ).padStart(2, "0");

  const segundosFormateados = String(
    totalSegundos % 60
  ).padStart(2, "0");

  return (
    <div
      className={`${styles.timerPanel} ${
        peligro
          ? styles.danger
          : advertencia
            ? styles.warning
            : ""
      }`}
      role="timer"
      aria-label={`${label}: ${minutosFormateados} minutos y ${segundosFormateados} segundos`}
    >
      <span className={styles.timerLabel}>
        {label}
      </span>

      <strong className={styles.timerValue}>
        {minutosFormateados}:{segundosFormateados}
      </strong>

      <div className={styles.timerTrack} aria-hidden="true">
        <div className={styles.timerIndicator} />
      </div>
    </div>
  );
}