"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useMapaClientes } from '@/hooks/useMapaClientes';
import Alert from '@/components/ui/Alert';
import AppLayout from '@/components/layout/AppLayout';
import VistaMapaClientes from '@/components/clientes/VistaMapaClientes';
import { PERMISO_MAPA } from '@/utils/clientesScope';
import { logger } from '@/lib/logger';
import type { PageWithLayout } from '@/types';

const MapaPage: PageWithLayout = () => {
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

  const { mapa, error, isLoading } = useMapaClientes();
  // La cobertura enlaza aquí con ?ruta=ID para ver los clientes de una ruta
  const ruta = Number(router.query.ruta);
  const idRutaInicial = Number.isInteger(ruta) && ruta > 0 ? ruta : null;

  if (authLoading || !user || !autorizado) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-gray-50 p-3 lg:p-4">
      {error && <Alert state="error">{error}</Alert>}
      {isLoading ? <p className="text-sm text-gray-400">Cargando el mapa de clientes...</p> : mapa && <VistaMapaClientes mapa={mapa} idRutaInicial={idRutaInicial} />}
    </div>
  );
};

MapaPage.getLayout = (page) => <AppLayout flush fullHeight>{page}</AppLayout>;

export default MapaPage;
