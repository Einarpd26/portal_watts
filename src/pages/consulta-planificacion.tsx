"use client";

import PageLoader from '@/components/ui/PageLoader';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useToast, useToastPosition } from '@/contexts/ToastContext';
import { useConsultaPlanificacion } from '@/hooks/useConsultaPlanificacion';
import AppLayout from '@/components/layout/AppLayout';
import VistaConsultaPlanificacion from '@/components/planificacion/VistaConsultaPlanificacion';
import { puedeConsultarPlanificacion } from '@/utils/clientesScope';
import { logger } from '@/lib/logger';
import type { PageWithLayout } from '@/types';

const ConsultaPlanificacionPage: PageWithLayout = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  // Los avisos salen por arriba: abajo quedan la hoja de la ficha y los controles del mapa
  useToastPosition('top');
  const autorizado = !!user && puedeConsultarPlanificacion(user);

  useEffect(() => {
    if (!authLoading && user && !autorizado) {
      router.replace('/').catch((navErr: unknown) => {
        logger.error('Error redirigiendo usuario sin permisos:', navErr);
      });
    }
  }, [authLoading, user, autorizado, router]);

  const { consulta, error, isLoading } = useConsultaPlanificacion(autorizado);

  useEffect(() => {
    if (error) showToast(error, 'error');
  }, [error, showToast]);

  if (authLoading || !user || !autorizado) return null;

  // Como la planificación del supervisor y el mapa: la pantalla llena la ventana y no se desplaza
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 bg-gray-50 p-3 lg:p-4">
      {isLoading ? <PageLoader className="min-h-0 flex-1" /> : consulta && <VistaConsultaPlanificacion consulta={consulta} />}
    </div>
  );
};

ConsultaPlanificacionPage.getLayout = (page) => <AppLayout flush fullHeight>{page}</AppLayout>;

export default ConsultaPlanificacionPage;
