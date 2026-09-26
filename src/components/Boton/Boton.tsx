import type { ButtonHTMLAttributes } from "react";
import Tooltip from "@mui/material/Tooltip";
import './BotonPersonalizado.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'info';
  tooltip?: string;
};

export default function BotonPersonalizado({
  variant = 'primary', children, className = '', type = 'button', tooltip, ...props
}: Props) {
  const button = (
    <button type={type} className={`boton-base boton-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
  return tooltip ? (
    <Tooltip title={tooltip} describeChild arrow enterTouchDelay={300}>
      <span style={{ display: 'inline-flex', maxWidth: '100%' }} tabIndex={props.disabled ? 0 : undefined}>
        {button}
      </span>
    </Tooltip>
  ) : button;
}
