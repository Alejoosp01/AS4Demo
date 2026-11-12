import type { ReactNode } from "react";
import "./Aviso.css";

interface AvisoProps {
  tipo?: "error" | "info" | "alerta";
  children: ReactNode;
}

export function Aviso({ tipo = "info", children }: AvisoProps) {
  return (
    <div className={`aviso aviso--${tipo}`} role={tipo === "error" ? "alert" : undefined}>
      {children}
    </div>
  );
}
