import styles from "./LoadingState.module.css";

type Props = {
  message?: string;
};

export default function LoadingState({
  message = "Cargando...",
}: Props) {
  return (
    <div className={styles.loading} role="status" aria-live="polite">
      <div className={styles.indicator} aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
