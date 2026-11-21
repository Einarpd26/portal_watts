"use client";

import CampoBusqueda from "@/components/ui/CampoBusqueda";
import ControlSegmentado from "@/components/ui/ControlSegmentado";
import SelectorCompacto from "@/components/ui/SelectorCompacto";
import type { FiltroCuenta, FiltrosPersonal as Filtros } from "@/utils/filtrarPersonal";

const OPCIONES_CUENTA: ReadonlyArray<{ valor: FiltroCuenta; texto: string }> = [
  { valor: "todas", texto: "Todos" },
  { valor: "con", texto: "Con cuenta" },
  { valor: "sin", texto: "Sin cuenta" },
];

interface FiltrosPersonalProps {
  filtros: Filtros;
  onCambiar: (cambio: Partial<Filtros>) => void;
  sucursales: ReadonlyArray<{ id: number; nombre_sucursal: string }>;
  cargos: ReadonlyArray<{ id: number; nombre_cargo: string }>;
}

/** Búsqueda por nombre o CI, filtro de cuenta, sucursal y cargo */
export default function FiltrosPersonal({ filtros, onCambiar, sucursales, cargos }: FiltrosPersonalProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <CampoBusqueda valor={filtros.busqueda} onCambiar={(busqueda) => onCambiar({ busqueda })} placeholder="Buscar por nombre o CI…" etiqueta="Buscar colaborador" />
        </div>
        <ControlSegmentado etiqueta="Cuenta de acceso" valor={filtros.cuenta} opciones={OPCIONES_CUENTA} onCambiar={(cuenta) => onCambiar({ cuenta })} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelectorCompacto
          etiqueta="Sucursal"
          valor={filtros.idSucursal}
          onCambiar={(idSucursal) => onCambiar({ idSucursal })}
          opciones={[{ valor: "", texto: "Todas las sucursales" }, ...sucursales.map((s) => ({ valor: String(s.id), texto: s.nombre_sucursal }))]}
        />
        <SelectorCompacto
          etiqueta="Cargo"
          valor={filtros.idCargo}
          onCambiar={(idCargo) => onCambiar({ idCargo })}
          opciones={[{ valor: "", texto: "Todos los cargos" }, ...cargos.map((c) => ({ valor: String(c.id), texto: c.nombre_cargo }))]}
        />
      </div>
    </div>
  );
}
