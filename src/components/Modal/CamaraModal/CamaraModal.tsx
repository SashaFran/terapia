import { useState } from "react";

import styles from "./CamaraModal.module.css";

type Props = {
  changeStatus: (accepted: boolean) => void;
};

export default function ConsentimientoCamara({
  changeStatus,
}: Props) {
  const [isChecked, setIsChecked] =
    useState(false);

  const handleCheckboxChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const checked = e.target.checked;

    setIsChecked(checked);
    changeStatus(checked);
  };

  return (
    <section className={styles.consent}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            Verificación de identidad
          </span>

          <h3>Monitoreo fotográfico</h3>

          <p>
            Durante la evaluación se podrán realizar
            capturas mediante la cámara del dispositivo
            para validar la identidad del participante.
          </p>
        </div>

        <span
          className={styles.cameraMark}
          aria-hidden="true"
        >
          ID
        </span>
      </div>

      <div className={styles.details}>
        <div className={styles.detail}>
          <span className={styles.check}>✓</span>

          <p>
            Las imágenes se utilizarán exclusivamente
            para la verificación de identidad asociada
            a esta evaluación.
          </p>
        </div>

        <div className={styles.detail}>
          <span className={styles.check}>✓</span>

          <p>
            Las capturas no forman parte de las
            respuestas del test.
          </p>
        </div>

        <div className={styles.detail}>
          <span className={styles.check}>✓</span>

          <p>
            El acceso a la cámara se solicitará al
            comenzar la evaluación.
          </p>
        </div>
      </div>

      <label
        className={`${styles.acceptance} ${
          isChecked
            ? styles.acceptanceChecked
            : ""
        }`}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={handleCheckboxChange}
          className={styles.checkboxInput}
        />

        <span
          className={styles.customCheckbox}
          aria-hidden="true"
        >
          {isChecked ? "✓" : ""}
        </span>

        <span className={styles.acceptanceCopy}>
          <strong>
            Entiendo y acepto el monitoreo
            fotográfico.
          </strong>

          <small>
            Este consentimiento es necesario para
            iniciar la evaluación.
          </small>
        </span>
      </label>
    </section>
  );
}