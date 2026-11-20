"use client";

import { cn } from '@/utils/cn';
import { COLOR_SIN_CLASE, DESCRIPCION_CLASE, colorDeCliente } from '@/utils/clientesMapa';
import { formatearFecha, formatearMonto, formatearPorcentaje } from '@/utils/formatoClientes';
import type { ClienteMapa, RutaItem } from '@/types';

interface FichaClienteProps {
  cliente: ClienteMapa;
  ruta: RutaItem | undefined;
  onCerrar: () => void;
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{etiqueta}</dt>
      <dd className="text-xs text-gray-800">{valor}</dd>
    </div>
  );
}

/**
 * Ficha del cliente elegido: su clase del Pareto y cuánto vendió. En pantallas angostas es una hoja inferior que
 * no tapa el mapa entero; en las anchas, una tarjeta de la columna lateral (ADR-004 D7).
 */
export default function FichaCliente({ cliente, ruta, onCerrar }: FichaClienteProps) {
  const clase = cliente.clasificacion;
  return (
    <aside
      aria-label={`Ficha del cliente ${cliente.codigo_cliente}`}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 max-h-1/2 overflow-y-auto rounded-t-2xl border border-gray-200 bg-white p-4 shadow-2xl',
        'lg:static lg:z-auto lg:max-h-none lg:rounded-2xl lg:shadow-sm'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          {/* El color de la clase es un dato del mapa: se aplica como estilo */}
          <span
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: clase ? colorDeCliente(clase) : COLOR_SIN_CLASE }}
            aria-label={clase ? `Clase ${clase}` : 'No habilitado'}
          >
            {clase ?? '–'}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-gray-900">{cliente.nombre_comercial ?? cliente.nombre_completo}</p>
            <p className="text-xs text-gray-500">
              {cliente.codigo_cliente}
              {ruta ? ` · ${ruta.codigo_ruta}` : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar la ficha"
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
        >
          Cerrar
        </button>
      </div>

      <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
        {clase
          ? `${DESCRIPCION_CLASE[clase]}. Vendió ${formatearMonto(cliente.total_ventas)} en 6 meses; con él, la ruta acumula el ${formatearPorcentaje(cliente.porcentaje_acumulado)} de sus ventas.`
          : 'Cliente no habilitado: no se clasifica ni cuenta para la cobertura.'}
      </p>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        <Dato etiqueta="Última compra" valor={formatearFecha(cliente.ultima_compra)} />
        <Dato etiqueta="Rubro" valor={cliente.rubro} />
        <Dato etiqueta="Teléfono" valor={cliente.telefono} />
        <Dato etiqueta="Ruta" valor={ruta ? `${ruta.codigo_ruta} — ${ruta.ruta}` : null} />
      </dl>
      <dl className="mt-2 space-y-2">
        <Dato etiqueta="Dirección" valor={cliente.direccion} />
        <Dato etiqueta="Referencia" valor={cliente.referencia} />
      </dl>
    </aside>
  );
}
