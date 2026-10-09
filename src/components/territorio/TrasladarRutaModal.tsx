"use client";

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type { RutaItem, ZonaDeRuta } from '@/types';

interface TrasladarRutaModalProps {
  ruta: RutaItem | null;
  zonas: ZonaDeRuta[];
  isSubmitting: boolean;
  onConfirm: (idZonaDestino: number) => void;
  onCancel: () => void;
}

export function TrasladarRutaModal({ ruta, zonas, isSubmitting, onConfirm, onCancel }: TrasladarRutaModalProps) {
  const [idZonaDestino, setIdZonaDestino] = useState<number | null>(null);

  useEscapeKey(onCancel, ruta !== null && !isSubmitting);

  if (!ruta) return null;

  const zonaActual = zonas.find((z) => z.id === ruta.id_zona);
  const destinos = zonas.filter((z) => z.id !== ruta.id_zona && z.id_sucursal === zonaActual?.id_sucursal);

  const handleConfirm = () => {
    if (idZonaDestino !== null) onConfirm(idZonaDestino);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="trasladar-ruta-title"
        className="relative w-full max-w-md rounded-card bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,.25)]"
      >
        <h3 id="trasladar-ruta-title" className="mb-1 text-lg font-bold text-gray-900">
          Trasladar ruta
        </h3>
        <p className="mb-5 text-sm text-gray-600">
          {ruta.codigo_ruta} · {ruta.ruta}
          {zonaActual ? ` · Zona actual: ${zonaActual.codigo_zona}` : ''}
        </p>

        {destinos.length === 0 ? (
          <p className="text-sm text-amber-700">
            No hay otras zonas disponibles en esta sucursal a las que trasladar la ruta.
          </p>
        ) : (
          <Select
            label="Zona de destino"
            value={idZonaDestino ?? ''}
            onChange={(e) => setIdZonaDestino(e.target.value ? Number(e.target.value) : null)}
            disabled={isSubmitting}
          >
            <option value="">Seleccionar zona</option>
            {destinos.map((z) => (
              <option key={z.id} value={z.id}>
                {z.codigo_zona} — {z.zona}
              </option>
            ))}
          </Select>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            isLoading={isSubmitting}
            disabled={isSubmitting || idZonaDestino === null || destinos.length === 0}
          >
            Trasladar
          </Button>
        </div>
      </div>
    </div>
  );
}
