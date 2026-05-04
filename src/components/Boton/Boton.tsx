import React from 'react';
import './BotonPersonalizado.css'; // Asegúrate de crear este archivo CSS


const BotonPersonalizado = ({ variant = 'primary', children, onClick, disabled = false, className = '' }: { variant: 'primary' | 'secondary' | 'danger'; children: string; onClick: React.MouseEventHandler<HTMLButtonElement>; disabled: boolean; className?: string; }) => {
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