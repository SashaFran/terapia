import React, { useState } from 'react';
import styles from "./CamaraModal.module.css";

const ConsentimientoCamara = ({  changeStatus }) => {
  const [isChecked, setIsChecked] = useState(false);

  const handleCheckboxChange = (e) => {
    setIsChecked(e.target.checked);
    changeStatus(e.target.checked);
  };

  return (
    <div className={styles.aviso}>
      <h4 className={styles.avisoTitle}>Aviso de Verificación de Identidad</h4>
      <p>
        Para garantizar la integridad del test, el sistema tomará fotografías aleatorias 
        a través de su cámara web. Estas imágenes se procesarán únicamente para 
        fines de validación de identidad.
      </p>
      <ul style={{ paddingLeft: '20px' }}>
        <li>Las fotos se eliminarán automáticamente al finalizar la revisión.</li>
        <li>No se compartirá su imagen con terceros.</li>
        <li>Cumplimos con la normativa <strong>GDPR</strong> de protección de datos.</li>
      </ul>
      
      <label className={styles.checkbox}>
        <input 
          type="checkbox" 
          checked={isChecked} 
          onChange={handleCheckboxChange} 
          className={styles.checkboxInput}
        />
        Entiendo y acepto el monitoreo fotográfico.
      </label>
    </div>
  );
};

export default ConsentimientoCamara;