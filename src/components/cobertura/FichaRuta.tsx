"use client";

import Link from 'next/link';
import { BotonCerrarFicha } from '@/components/mapa/BotonCerrarFicha';
import { Dato } from '@/components/mapa/Dato';
import { HojaInferior } from '@/components/mapa/HojaInferior';
import { PanelLateral } from '@/components/mapa/PanelLateral';
import { COLOR_TRAMO, ETIQUETA_TRAMO, momentoDeCalculo, nombreDelMes, tramoDe } from '@/utils/coberturaRutas';
import type { RutaCobertura } from '@/types';

interface FichaRutaProps {
  ruta: RutaCobertura;
  /** Mes calculado («2026-11-01») y momento del último recálculo; null si todavía no se calculó */
  mes: string | null;
  calculadoEn: string | null;
  onCerrar: () => void;
  /** panel: columna junto al mapa (escritorio) · hoja: hoja inferior que se estira (celular) */
  variante: 'panel' | 'hoja';
}

/**
 * Ficha de la ruta elegida en la cobertura: su porcentaje con el tramo, cuántos clientes faltan por atender y un
 * acceso a sus clientes (CU-13 A2). En el escritorio es un panel junto al mapa; en el celular, una hoja inferior
 * con gestos. Quien la use debe darle `key` con el id de la ruta.
 */
export default function FichaRuta({ ruta, mes, calculadoEn, onCerrar, variante }: FichaRutaProps) {
  const tramo = tramoDe(ruta.porcentaje);
  const etiqueta = `Ficha de la ruta ${ruta.codigo_ruta}`;
  const faltan = ruta.clientes_habilitados - ruta.clientes_atendidos;
  const nombreMes = nombreDelMes(mes);
  const momento = momentoDeCalculo(calculadoEn);

  const contenido = (
    <>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-900">{ruta.ruta}</p>
          <p className="text-xs text-gray-400">
            {ruta.codigo_ruta} · {ruta.codigo_zona}
          </p>
        </div>
        <BotonCerrarFicha onClick={onCerrar} />
      </div>

      <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2.5">
        {/* El color del tramo es un dato de la ruta: se aplica como estilo */}
        <p className="text-2xl font-extrabold tabular-nums" style={{ color: COLOR_TRAMO[tramo] }}>
          {ruta.porcentaje} %
        </p>
        <p className="text-xs text-gray-600">
          {ruta.clientes_atendidos} de {ruta.clientes_habilitados} clientes atendidos
          {faltan > 0 ? ` · faltan ${faltan}` : ''}
        </p>
      </div>

      <dl className="space-y-1.5">
        <Dato etiqueta="Tramo">{ETIQUETA_TRAMO[tramo]}</Dato>
        <Dato etiqueta="Zona">{ruta.codigo_zona}</Dato>
        <Dato etiqueta="Supervisor">{ruta.supervisor_nombre ?? <span className="text-gray-400">Sin supervisor</span>}</Dato>
        {nombreMes && <Dato etiqueta="Mes">{nombreMes}</Dato>}
        {momento && <Dato etiqueta="Recálculo">{momento}</Dato>}
      </dl>
      <p className="mt-3 text-[11px] text-gray-500">Las ventas de hoy se incorporan en el próximo recálculo nocturno.</p>

      <Link href={`/mapa?ruta=${ruta.id}`} className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700">
        Ver clientes de la ruta
      </Link>
    </>
  );

  return variante === 'panel' ? (
    <PanelLateral etiqueta={etiqueta}>{contenido}</PanelLateral>
  ) : (
    <HojaInferior etiqueta={etiqueta} onCerrar={onCerrar}>
      {contenido}
    </HojaInferior>
  );
}
