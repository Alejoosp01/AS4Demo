import type { ButtonHTMLAttributes } from "react";
import "./Boton.css";

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: "principal" | "secundario" | "enlace";
}

export function Boton({ variante = "secundario", className, type = "button", ...props }: BotonProps) {
  return <button type={type} className={`boton boton--${variante}${className ? ` ${className}` : ""}`} {...props} />;
}
