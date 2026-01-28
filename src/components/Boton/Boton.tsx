import React from 'react';
import './BotonPersonalizado.css'; // Asegúrate de crear este archivo CSS

/**
 * Componente de botón reutilizable.
 * @param {object} props
 * @param {'primary' | 'secondary' | 'danger'} props.variant - Define el estilo del botón.
 * @param {string} props.children - El texto o contenido dentro del botón.
 * @param {Function} props.onClick - El manejador de eventos para el clic.
 * @param {boolean} props.disabled - Deshabilita el botón si es true.
 * @param {string} [props.className] - Clases CSS adicionales.
 */
const BotonPersonalizado = ({ variant = 'primary', children, onClick, disabled = false, className = '' }: { variant: 'primary' | 'secondary' | 'danger'; children: string; onClick: Function; disabled: boolean; className?: string; }) => {
  // Construye las clases CSS dinámicamente según las props
  const baseClasses = 'boton-base';
  const variantClass = `boton-${variant}`;
  
  return (
    <button
      className={`${baseClasses} ${variantClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default BotonPersonalizado;