"use client";

import { useGestionTerritorio } from '@/hooks/useGestionTerritorio';
import ZonaTable from '@/components/territorio/ZonaTable';
import ZonaFormModal from '@/components/territorio/ZonaFormModal';
import SupervisorZonaModal from '@/components/territorio/SupervisorZonaModal';
import EliminarZonaModal from '@/components/territorio/EliminarZonaModal';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import { logger } from '@/lib/logger';

/** Pestaña de zonas y supervisores de zona (CU-04 y CU-07) */
export function ZonasPanel() {
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

  return (
    <>
      <div className="mx-auto flex max-w-7xl justify-end px-6 pt-4">
        <Button onClick={openCrear}>Nueva zona</Button>
      </div>

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
    </>
  );
}
