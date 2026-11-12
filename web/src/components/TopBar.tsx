import "./TopBar.css";

interface TopBarProps {
  usuario?: { nombre: string; rol: "ASESOR" | "GERENTE" };
  onSalir?: () => void;
}

const ROL = { ASESOR: "Asesor", GERENTE: "Gerencia" };

export function TopBar({ usuario, onSalir }: TopBarProps) {
  return (
    <header className="top-bar">
      <span className="top-bar__agency">AS4 Seguros LTDA</span>
      {usuario ? (
        <span className="top-bar__user">
          <span>{usuario.nombre} ({ROL[usuario.rol]})</span>
          {onSalir ? <button type="button" className="top-bar__salir no-imprimir" onClick={onSalir}>Salir</button> : null}
        </span>
      ) : null}
    </header>
  );
}
