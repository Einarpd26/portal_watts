import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useGestionUsuarios } from '@/hooks/useGestionUsuarios';
import NuevoAccesoForm from '@/components/usuarios/NuevoAccesoForm';
import UsuariosTable from '@/components/usuarios/UsuariosTable';
import ConfirmAccesoModal from '@/components/usuarios/ConfirmAccesoModal';
import CredencialesTemporalesModal from '@/components/usuarios/CredencialesTemporalesModal';
import RevocarAccesoModal from '@/components/usuarios/RevocarAccesoModal';
import Alert from '@/components/ui/Alert';
import AppLayout from '@/components/layout/AppLayout';
import type { PageWithLayout } from '@/types';

const GestionAccesosPage: PageWithLayout = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Auth guard: redirect if no permission
  useEffect(() => {
    if (!authLoading && user && !user.permisos.includes('cuentas:gestionar')) {
      void router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  const {
    personasSinCuenta,
    activeUsers,
    roles,
    sucursales,
    isLoading,
    form,
    setForm,
    formErrors,
    isSubmitting,
    confirmModal,
    openConfirm,
    closeConfirm,
    revokeModal,
    openRevoke,
    closeRevoke,
    credenciales,
    closeCredenciales,
    submitInvite,
    submitRevoke,
    toast,
    clearToast,
  } = useGestionUsuarios();

  // While auth is loading or user doesn't have permission, render nothing
  if (authLoading || !user) return null;
  if (!user.permisos.includes('cuentas:gestionar')) return null;

  return (
    <div className="min-h-full bg-gray-50">
      {/* Page header — brand gradient */}
      <header className="px-6 pt-6">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-xl bg-primary-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Gestión de Accesos</h1>
            <p className="text-sm text-gray-500 mt-0.5">Alta y revocación de cuentas de usuario</p>
          </div>
        </div>
      </header>

      {/* Toast alert */}
      {toast && (
        <div className="max-w-7xl mx-auto px-6 pt-4">
          <Alert state={toast.type === 'warning' ? 'warning' : toast.type} onClose={clearToast}>
            {toast.message}
          </Alert>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6 items-start">
        <NuevoAccesoForm
          personasSinCuenta={personasSinCuenta}
          roles={roles}
          sucursales={sucursales}
          form={form}
          setForm={setForm}
          formErrors={formErrors}
          isSubmitting={isSubmitting}
          onSubmit={openConfirm}
        />

        <UsuariosTable
          users={activeUsers}
          isLoading={isLoading}
          onRevoke={openRevoke}
          callerAlcanceTipo={user.alcance_tipo}
          callerIdSucursal={user.id_sucursal}
        />
      </div>

      {/* Modals */}
      <ConfirmAccesoModal
        open={confirmModal.open}
        preview={confirmModal.preview}
        isSubmitting={isSubmitting}
        onConfirm={submitInvite}
        onCancel={closeConfirm}
      />

      <CredencialesTemporalesModal credenciales={credenciales} onClose={closeCredenciales} />

      <RevocarAccesoModal
        open={revokeModal.open}
        user={revokeModal.user}
        isSubmitting={isSubmitting}
        onConfirm={submitRevoke}
        onCancel={closeRevoke}
      />
    </div>
  );
};

GestionAccesosPage.getLayout = (page) => <AppLayout flush>{page}</AppLayout>;

export default GestionAccesosPage;
