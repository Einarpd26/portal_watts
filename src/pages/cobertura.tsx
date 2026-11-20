"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useCobertura } from '@/hooks/useCobertura';
import Alert from '@/components/ui/Alert';
import AppLayout from '@/components/layout/AppLayout';
import VistaCobertura from '@/components/cobertura/VistaCobertura';
import { PERMISO_MAPA } from '@/utils/clientesScope';
import { logger } from '@/lib/logger';
import type { PageWithLayout } from '@/types';

const CoberturaPage: PageWithLayout = () => {
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

  const { cobertura, error, isLoading } = useCobertura();

  if (authLoading || !user || !autorizado) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-gray-50 p-3 lg:p-4">
      {error && <Alert state="error">{error}</Alert>}
      {isLoading ? <p className="text-sm text-gray-400">Cargando la cobertura...</p> : cobertura && <VistaCobertura cobertura={cobertura} />}
    </div>
  );
};

CoberturaPage.getLayout = (page) => <AppLayout flush fullHeight>{page}</AppLayout>;

export default CoberturaPage;
