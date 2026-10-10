"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { ZonasPanel } from '@/components/territorio/ZonasPanel';
import { RutasPanel } from '@/components/territorio/RutasPanel';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from '@/utils/cn';
import { logger } from '@/lib/logger';
import type { PageWithLayout } from '@/types';

const PERMISO_ZONAS = 'territorio:gestionar';
const PERMISO_RUTAS = 'rutas:gestionar';

type Pestana = 'zonas' | 'rutas';

const TerritorioPage: PageWithLayout = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [elegida, setElegida] = useState<Pestana | null>(null);

  const puedeZonas = user?.permisos.includes(PERMISO_ZONAS) ?? false;
  const puedeRutas = user?.permisos.includes(PERMISO_RUTAS) ?? false;

  // Auth guard: solo quien gestiona zonas o rutas
  useEffect(() => {
    if (!authLoading && user && !puedeZonas && !puedeRutas) {
      router.replace('/dashboard').catch((navErr: unknown) => {
        logger.error('Error redirigiendo usuario sin permisos:', navErr);
      });
    }
  }, [authLoading, user, puedeZonas, puedeRutas, router]);

  if (authLoading || !user) return null;
  if (!puedeZonas && !puedeRutas) return null;

  // Cada pestaña exige su propio permiso; la elegida se corrige si el permiso no alcanza
  const activa: Pestana = elegida === 'rutas' && puedeRutas ? 'rutas' : puedeZonas ? 'zonas' : 'rutas';
  const pestanas: Array<{ id: Pestana; etiqueta: string }> = [
    ...(puedeZonas ? [{ id: 'zonas' as const, etiqueta: 'Zonas' }] : []),
    ...(puedeRutas ? [{ id: 'rutas' as const, etiqueta: 'Rutas' }] : []),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-gray-50">
      {/* Encabezado de una sola fila: el espacio vertical es para el mapa */}
      <header className="flex shrink-0 items-end gap-6 border-b border-gray-200 bg-white px-4 lg:px-6">
        <h1 className="py-3 text-base font-extrabold tracking-tight text-gray-900">Territorio</h1>
        {pestanas.length > 1 && (
          <div role="tablist" aria-label="Secciones de territorio" className="flex gap-5">
            {pestanas.map((p) => (
              <button
                key={p.id}
                role="tab"
                type="button"
                aria-selected={activa === p.id}
                onClick={() => setElegida(p.id)}
                className={cn(
                  '-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors',
                  activa === p.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                )}
              >
                {p.etiqueta}
              </button>
            ))}
          </div>
        )}
      </header>

      {activa === 'zonas' ? <ZonasPanel /> : <RutasPanel />}
    </div>
  );
};

TerritorioPage.getLayout = (page) => (
  <AppLayout flush fullHeight>
    {page}
  </AppLayout>
);

export default TerritorioPage;
