"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useGestionUsuarios } from '@/hooks/useGestionUsuarios';
import NuevoAccesoForm from '@/components/usuarios/NuevoAccesoForm';
import NuevoAccesoHoja from '@/components/usuarios/NuevoAccesoHoja';
import UsuariosTable from '@/components/usuarios/UsuariosTable';
import ConfirmAccesoModal from '@/components/usuarios/ConfirmAccesoModal';
import CredencialesTemporalesModal from '@/components/usuarios/CredencialesTemporalesModal';
import RevocarAccesoModal from '@/components/usuarios/RevocarAccesoModal';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import AppLayout from '@/components/layout/AppLayout';
import { logger } from '@/lib/logger';
import type { PageWithLayout } from '@/types';

const GestionAccesosPage: PageWithLayout = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Auth guard: redirect if no permission
  useEffect(() => {
    if (!authLoading && user && !user.permisos.includes('cuentas:gestionar')) {
      router.replace('/').catch((navErr: unknown) => {
        logger.error('Error redirigiendo usuario sin permisos:', navErr);
      });
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
    submitUnlock,
    toast,
    clearToast,
  } = useGestionUsuarios();

  // En pantallas chicas «Dar acceso» es una hoja que se abre con un botón; desde xl es la columna lateral
  const [hojaAbierta, setHojaAbierta] = useState(false);

  // La hoja se cierra al resolverse la confirmación, con éxito o con error: el aviso de la página quedaría detrás de ella
  const confirmarAcceso = async () => {
    try {
      await submitInvite();
    } finally {
      setHojaAbierta(false);
    }
  };

  const camposAcceso = { personasSinCuenta, roles, sucursales, form, setForm, formErrors };

  // While auth is loading or user doesn't have permission, render nothing
  if (authLoading || !user) return null;
  if (!user.permisos.includes('cuentas:gestionar')) return null;

  return (
    <div className="min-h-full bg-gray-50">
      {/* Page header — brand gradient */}
      <header className="px-4 pt-4 md:px-6 md:pt-6">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="hidden flex-shrink-0 items-center justify-center h-10 w-10 rounded-xl bg-primary-50 sm:flex">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg md:text-xl font-extrabold text-gray-900 tracking-tight">Gestión de Accesos</h1>
            <p className="hidden sm:block text-sm text-gray-500 mt-0.5">Alta y revocación de cuentas de usuario</p>
          </div>
          <Button size="sm" className="shrink-0 xl:hidden" onClick={() => setHojaAbierta(true)}>
            + Dar acceso
          </Button>
        </div>
      </header>

      {/* Toast alert */}
      {toast && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4">
          <Alert state={toast.type === 'warning' ? 'warning' : toast.type} onClose={clearToast}>
            {toast.message}
          </Alert>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6 items-start">
        <div className="hidden xl:block">
          <NuevoAccesoForm {...camposAcceso} isSubmitting={isSubmitting} onSubmit={openConfirm} />
        </div>

        <UsuariosTable
          users={activeUsers}
          isLoading={isLoading}
          onRevoke={openRevoke}
          onUnlock={submitUnlock}
          callerAlcanceTipo={user.alcance_tipo}
          callerIdSucursal={user.id_sucursal}
          callerIdPersona={user.id_persona}
        />
      </div>

      <NuevoAccesoHoja
        {...camposAcceso}
        abierta={hojaAbierta}
        isSubmitting={isSubmitting}
        onSubmit={openConfirm}
        onCerrar={() => setHojaAbierta(false)}
      />

      {/* Modals */}
      <ConfirmAccesoModal
        open={confirmModal.open}
        preview={confirmModal.preview}
        isSubmitting={isSubmitting}
        onConfirm={() => {
          confirmarAcceso().catch((err: unknown) => {
            logger.error('Error no controlado al dar acceso:', err);
          });
        }}
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
