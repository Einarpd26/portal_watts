"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useGestionTerritorio } from '@/hooks/useGestionTerritorio';
import ZonaTable from '@/components/territorio/ZonaTable';
import ZonaFormModal from '@/components/territorio/ZonaFormModal';
import SupervisorZonaModal from '@/components/territorio/SupervisorZonaModal';
import EliminarZonaModal from '@/components/territorio/EliminarZonaModal';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import AppLayout from '@/components/layout/AppLayout';
import { logger } from '@/lib/logger';
import type { PageWithLayout } from '@/types';

const PERMISO = 'territorio:gestionar';

const TerritorioPage: PageWithLayout = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Auth guard: solo quien tiene el permiso de territorio
  useEffect(() => {
    if (!authLoading && user && !user.permisos.includes(PERMISO)) {
      router.replace('/dashboard').catch((navErr: unknown) => {
        logger.error('Error redirigiendo usuario sin permisos:', navErr);
      });
    }
  }, [authLoading, user, router]);

  const {
    zonas,
    supervisores,
    sucursales,
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
    supervisorTarget,
    supervisorSeleccion,
    setSupervisorSeleccion,
    openSupervisor,
    closeSupervisor,
    submitSupervisor,
    toast,
    clearToast,
  } = useGestionTerritorio();

  if (authLoading || !user) return null;
  if (!user.permisos.includes(PERMISO)) return null;

  return (
    <div className="min-h-full bg-gray-50">
      <header className="px-6 pt-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Territorio</h1>
            <p className="mt-0.5 text-sm text-gray-500">Zonas comerciales y sus supervisores</p>
          </div>
          <Button onClick={openCrear}>Nueva zona</Button>
        </div>
      </header>

      {toast && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <Alert state={toast.type} onClose={clearToast}>
            {toast.message}
          </Alert>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 py-6">
        <ZonaTable
          zonas={zonas}
          isLoading={isLoading}
          mostrarSucursal={sucursales.length > 1}
          onEdit={openEditar}
          onDelete={openEliminar}
          onSupervisor={openSupervisor}
        />
      </div>

      <ZonaFormModal
        open={formModal.open}
        editando={formModal.zona !== null}
        form={form}
        setForm={setForm}
        errors={formErrors}
        sucursales={sucursales}
        isSubmitting={isSubmitting}
        onSubmit={() => {
          submitForm().catch((err: unknown) => {
            logger.error('Error no controlado al guardar la zona:', err);
          });
        }}
        onCancel={closeForm}
      />

      <SupervisorZonaModal
        zona={supervisorTarget}
        candidatos={supervisores}
        seleccion={supervisorSeleccion}
        onSeleccion={setSupervisorSeleccion}
        isSubmitting={isSubmitting}
        onConfirm={() => {
          submitSupervisor().catch((err: unknown) => {
            logger.error('Error no controlado al asignar el supervisor:', err);
          });
        }}
        onCancel={closeSupervisor}
      />

      <EliminarZonaModal
        zona={deleteTarget}
        isSubmitting={isSubmitting}
        onConfirm={() => {
          submitEliminar().catch((err: unknown) => {
            logger.error('Error no controlado al eliminar la zona:', err);
          });
        }}
        onCancel={closeEliminar}
      />
    </div>
  );
};

TerritorioPage.getLayout = (page) => <AppLayout flush>{page}</AppLayout>;

export default TerritorioPage;
