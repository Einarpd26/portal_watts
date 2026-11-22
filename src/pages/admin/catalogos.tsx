"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { ETIQUETAS, useGestionCatalogos } from '@/hooks/useGestionCatalogos';
import CatalogoTable from '@/components/catalogos/CatalogoTable';
import CatalogoFormHoja from '@/components/catalogos/CatalogoFormHoja';
import EliminarCatalogoModal from '@/components/catalogos/EliminarCatalogoModal';
import Alert from '@/components/ui/Alert';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from '@/utils/cn';
import { logger } from '@/lib/logger';
import { CATALOGO_TIPOS } from '@/utils/catalogoValidation';
import type { PageWithLayout } from '@/types';

const PERMISO = 'catalogos:gestionar';

const CatalogosPage: PageWithLayout = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Auth guard: solo quien tiene el permiso de catálogos
  useEffect(() => {
    if (!authLoading && user && !user.permisos.includes(PERMISO)) {
      router.replace('/').catch((navErr: unknown) => {
        logger.error('Error redirigiendo usuario sin permisos:', navErr);
      });
    }
  }, [authLoading, user, router]);

  const {
    tipo,
    cambiarTipo,
    items,
    isLoading,
    isSubmitting,
    formModal,
    form,
    setForm,
    formErrors,
    openCrear,
    openEditar,
    closeForm,
    submitForm,
    deleteTarget,
    openEliminar,
    closeEliminar,
    submitEliminar,
    toast,
    clearToast,
  } = useGestionCatalogos();

  if (authLoading || !user) return null;
  if (!user.permisos.includes(PERMISO)) return null;

  const etiqueta = ETIQUETAS[tipo];

  return (
    <div className="min-h-full bg-gray-50">
      <header className="px-4 pt-5 md:px-6 md:pt-6">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Catálogos</h1>
          <p className="mt-0.5 text-sm text-gray-500">Sucursales y cargos de la empresa</p>
        </div>
      </header>

      {toast && (
        <div className="mx-auto max-w-5xl px-4 pt-4 md:px-6">
          <Alert state={toast.type} onClose={clearToast}>
            {toast.message}
          </Alert>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 pt-4 md:px-6">
        <div className="flex items-end justify-between gap-3 border-b border-gray-200">
          <div role="tablist" aria-label="Catálogos" className="flex gap-1">
            {CATALOGO_TIPOS.map((t) => (
              <button
                key={t}
                role="tab"
                type="button"
                aria-selected={tipo === t}
                onClick={() => cambiarTipo(t)}
                className={cn(
                  '-mb-px border-b-2 px-4 py-2 text-sm font-semibold capitalize transition-colors',
                  tipo === t
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                )}
              >
                {ETIQUETAS[t].plural}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={openCrear}
            className="mb-1.5 shrink-0 rounded-lg px-2 py-1.5 text-sm font-semibold text-primary-600 transition-colors hover:bg-primary-50"
          >
            + Nueva {etiqueta.singular}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-4 md:px-6 md:py-6">
        <CatalogoTable
          items={items}
          isLoading={isLoading}
          etiqueta={etiqueta}
          onEdit={openEditar}
          onDelete={openEliminar}
        />
      </div>

      <CatalogoFormHoja
        open={formModal.open}
        editando={formModal.item !== null}
        etiqueta={etiqueta.singular}
        descripcionObligatoria={tipo === 'sucursales'}
        form={form}
        setForm={setForm}
        errors={formErrors}
        isSubmitting={isSubmitting}
        onSubmit={() => {
          submitForm().catch((err: unknown) => {
            logger.error('Error no controlado al guardar el catálogo:', err);
          });
        }}
        onCancel={closeForm}
      />

      <EliminarCatalogoModal
        item={deleteTarget}
        etiqueta={etiqueta.singular}
        isSubmitting={isSubmitting}
        onConfirm={() => {
          submitEliminar().catch((err: unknown) => {
            logger.error('Error no controlado al eliminar del catálogo:', err);
          });
        }}
        onCancel={closeEliminar}
      />
    </div>
  );
};

CatalogosPage.getLayout = (page) => <AppLayout flush>{page}</AppLayout>;

export default CatalogosPage;
