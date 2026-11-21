"use client";

import PageLoader from '@/components/ui/PageLoader';
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useGestionPersonal } from '@/hooks/useGestionPersonal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Alert from '@/components/ui/Alert';
import FiltrosPersonal from '@/components/personal/FiltrosPersonal';
import ListaPersonal from '@/components/personal/ListaPersonal';
import { FILTROS_PERSONAL_INICIALES, filtrarPersonal, hayFiltrosActivos } from '@/utils/filtrarPersonal';
import Button from '@/components/ui/Button';
import DarDeBajaModal from '@/components/personal/DarDeBajaModal';
import AppLayout from '@/components/layout/AppLayout';
import { logger } from '@/lib/logger';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import type { PageWithLayout } from '@/types';

const GestionPersonalPage: PageWithLayout = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user && !user.permisos.includes('personal:gestionar')) {
      router.replace('/').catch((navErr: unknown) => {
        logger.error('Error redirigiendo usuario sin permisos:', navErr);
      });
    }
  }, [authLoading, user, router]);

  const {
    personas,
    sucursales,
    cargos,
    isLoading,
    isModalOpen,
    form,
    setForm,
    formErrors,
    isSubmitting,
    toast,
    clearToast,
    editingId,
    openModal,
    openEditModal,
    closeModal,
    submitPersona,
    bajaTarget,
    bajaForm,
    setBajaForm,
    openBaja,
    closeBaja,
    submitBaja,
  } = useGestionPersonal();

  const isEditing = editingId !== null;

  const [filtros, setFiltros] = useState(FILTROS_PERSONAL_INICIALES);
  const visibles = useMemo(() => filtrarPersonal(personas, filtros), [personas, filtros]);
  const personaEnEdicion = isEditing ? (personas.find((p) => p.id === editingId) ?? null) : null;

  // Esc cierra el modal de alta/edición, igual que Cancelar (salvo mientras se envía)
  useEscapeKey(closeModal, isModalOpen && !isSubmitting);

  if (authLoading || !user) return null;
  if (!user.permisos.includes('personal:gestionar')) return null;

  return (
    <div className="min-h-full bg-gray-50">
      <div className="mx-auto max-w-4xl space-y-4 px-6 py-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Personal comercial</h1>
            {!isLoading && (
              <p className="mt-0.5 text-sm text-gray-400">
                {visibles.length === 0
                  ? 'Sin resultados'
                  : hayFiltrosActivos(filtros)
                    ? `${visibles.length} de ${personas.length} ${personas.length === 1 ? 'persona' : 'personas'}`
                    : `${personas.length} ${personas.length === 1 ? 'persona' : 'personas'}`}
              </p>
            )}
          </div>
          <Button onClick={openModal}>Nueva persona</Button>
        </header>

        {toast && (
          <Alert state={toast.type === 'success' ? 'success' : 'error'} onClose={clearToast}>
            {toast.message}
          </Alert>
        )}

        <FiltrosPersonal filtros={filtros} onCambiar={(cambio) => setFiltros((f) => ({ ...f, ...cambio }))} sucursales={sucursales} cargos={cargos} />

        {isLoading ? (
          <PageLoader etiqueta="Cargando colaboradores..." />
        ) : (
          <ListaPersonal personas={visibles} hayFiltros={hayFiltrosActivos(filtros)} onEditar={openEditModal} onCrear={openModal} />
        )}
      </div>

      {/* Modal — nuevo colaborador */}
      {isModalOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl"
          >
            {/* Modal header */}
            <div className="rounded-t-2xl bg-gradient-to-br from-red-900 to-red-600 px-6 py-4">
              <h2 id="modal-title" className="text-base font-bold text-white">
                {isEditing ? 'Editar colaborador' : 'Registrar nuevo colaborador'}
              </h2>
              <p className="text-xs text-white/60">
                {isEditing
                  ? 'Si cambia el cargo o la sucursal, se abre una nueva asignación laboral.'
                  : 'Complete los datos del colaborador y su asignación laboral.'}
              </p>
            </div>

            {/* Modal body */}
            <div className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Nombres"
                  value={form.nombres}
                  onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                  error={formErrors.nombres}
                  placeholder="Juan Carlos"
                />
                <Input
                  label="Apellidos"
                  value={form.apellidos}
                  onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                  error={formErrors.apellidos}
                  placeholder="García López"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="CI"
                  value={form.ci}
                  onChange={(e) => setForm({ ...form, ci: e.target.value })}
                  error={formErrors.ci}
                  placeholder="12345678"
                />
                <Input
                  label="Teléfono (opcional)"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="+591 70000000"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Sucursal"
                  valor={form.id_sucursal}
                  onCambiar={(v) => setForm({ ...form, id_sucursal: v })}
                  opciones={sucursales.map((s) => ({ valor: String(s.id), texto: s.nombre_sucursal }))}
                  error={formErrors.id_sucursal}
                  placeholder="Seleccionar..."
                />
                <Select
                  label="Cargo"
                  valor={form.id_cargo}
                  onCambiar={(v) => setForm({ ...form, id_cargo: v })}
                  opciones={cargos.map((c) => ({ valor: String(c.id), texto: c.nombre_cargo }))}
                  error={formErrors.id_cargo}
                  placeholder="Seleccionar..."
                />
              </div>
              {!isEditing && (
                <Input
                  label="Fecha de ingreso (opcional — por defecto hoy)"
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                />
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              {personaEnEdicion && personaEnEdicion.id !== user.id_persona && (
                <Button
                  variant="danger"
                  size="sm"
                  className="mr-auto"
                  disabled={isSubmitting}
                  onClick={() => {
                    closeModal();
                    openBaja(personaEnEdicion);
                  }}
                >
                  Dar de baja
                </Button>
              )}
              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void submitPersona()}
                disabled={isSubmitting}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {isSubmitting
                  ? isEditing ? 'Guardando...' : 'Registrando...'
                  : isEditing ? 'Guardar cambios' : 'Registrar colaborador'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal — baja laboral */}
      <DarDeBajaModal
        persona={bajaTarget}
        form={bajaForm}
        setForm={setBajaForm}
        isSubmitting={isSubmitting}
        onConfirm={() => void submitBaja()}
        onCancel={closeBaja}
      />
    </div>
  );
};

GestionPersonalPage.getLayout = (page) => <AppLayout flush>{page}</AppLayout>;

export default GestionPersonalPage;
