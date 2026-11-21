"use client";

import PageLoader from '@/components/ui/PageLoader';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useCobertura } from '@/hooks/useCobertura';
import { useMapaClientes } from '@/hooks/useMapaClientes';
import Alert from '@/components/ui/Alert';
import AppLayout from '@/components/layout/AppLayout';
import type { ModoVista } from '@/components/mapa/ConmutadorVista';
import VistaMapa from '@/components/mapa/VistaMapa';
import { PERMISO_COBERTURA, PERMISO_MAPA } from '@/utils/clientesScope';
import { logger } from '@/lib/logger';
import type { PageWithLayout } from '@/types';

const MapaPage: PageWithLayout = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const autorizado = !!user && user.permisos.includes(PERMISO_MAPA);

  useEffect(() => {
    if (!authLoading && user && !autorizado) {
      router.replace('/').catch((navErr: unknown) => {
        logger.error('Error redirigiendo usuario sin permisos:', navErr);
      });
    }
  }, [authLoading, user, autorizado, router]);

  const { mapa, error, isLoading } = useMapaClientes();
  // El Vendedor consulta el mapa de clientes pero no la cobertura (CU-13): lo distingue que no gestiona rutas
  const puedeVerCobertura = autorizado && user.permisos.includes(PERMISO_COBERTURA);
  const { cobertura, error: errorCobertura, isLoading: cargandoCobertura } = useCobertura(puedeVerCobertura);
  // Los enlaces traen ?ruta=ID (ver los clientes de una ruta) o ?vista=cobertura (abrir en el modo Cobertura)
  const ruta = Number(router.query.ruta);
  const idRutaInicial = Number.isInteger(ruta) && ruta > 0 ? ruta : null;
  const modoInicial: ModoVista = router.query.vista === 'cobertura' ? 'cobertura' : 'clientes';

  // La dirección refleja el modo para que recargar o compartir el enlace lo conserve
  const reflejarModo = (modo: ModoVista) => {
    router.replace({ pathname: router.pathname, query: modo === 'cobertura' ? { vista: 'cobertura' } : {} }, undefined, { shallow: true }).catch((navErr: unknown) => {
      logger.error('Error actualizando la dirección del mapa:', navErr);
    });
  };

  if (authLoading || !user || !autorizado) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-gray-50 p-3 lg:p-4">
      {error && <Alert state="error">{error}</Alert>}
      {errorCobertura && <Alert state="error">{errorCobertura}</Alert>}
      {isLoading || cargandoCobertura ? (
        <PageLoader etiqueta="Cargando el mapa..." className="min-h-0 flex-1" />
      ) : (
        mapa && <VistaMapa mapa={mapa} cobertura={cobertura} idRutaInicial={idRutaInicial} modoInicial={modoInicial} alCambiarModo={reflejarModo} />
      )}
    </div>
  );
};

MapaPage.getLayout = (page) => <AppLayout flush fullHeight>{page}</AppLayout>;

export default MapaPage;
