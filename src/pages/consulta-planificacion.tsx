"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useConsultaPlanificacion } from '@/hooks/useConsultaPlanificacion';
import Alert from '@/components/ui/Alert';
import AppLayout from '@/components/layout/AppLayout';
import VistaConsultaPlanificacion from '@/components/planificacion/VistaConsultaPlanificacion';
import { PERMISO_MAPA } from '@/utils/clientesScope';
import { logger } from '@/lib/logger';
import type { PageWithLayout } from '@/types';

const ConsultaPlanificacionPage: PageWithLayout = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const autorizado = !!user && user.permisos.includes(PERMISO_MAPA);

  useEffect(() => {
    if (!authLoading && user && !autorizado) {
      router.replace('/dashboard').catch((navErr: unknown) => {
        logger.error('Error redirigiendo usuario sin permisos:', navErr);
      });
    }
  }, [authLoading, user, autorizado, router]);

  const { consulta, error, isLoading } = useConsultaPlanificacion(autorizado);

  if (authLoading || !user || !autorizado) return null;

  return (
    <div className="min-h-full bg-gray-50">
      <header className="px-6 pt-6">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Consultar planificación</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Qué rutas visita cada vendedor y qué rutas quedaron sin planificar. Las rutas con trazo naranja están
            planificadas más de una vez en la semana.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-4 px-6 py-8">
        {error && <Alert state="error">{error}</Alert>}
        {isLoading ? <p className="text-sm text-gray-400">Cargando la planificación...</p> : consulta && <VistaConsultaPlanificacion consulta={consulta} />}
      </div>
    </div>
  );
};

ConsultaPlanificacionPage.getLayout = (page) => <AppLayout flush>{page}</AppLayout>;

export default ConsultaPlanificacionPage;
