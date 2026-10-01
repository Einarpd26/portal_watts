import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useGestionPersonal } from '@/hooks/useGestionPersonal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import DarDeBajaModal from '@/components/personal/DarDeBajaModal';
import AppLayout from '@/components/layout/AppLayout';
import type { PageWithLayout } from '@/types';

const GestionPersonalPage: PageWithLayout = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user && !user.permisos.includes('personal:gestionar')) {
      void router.replace('/dashboard');
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

  // Auto-open modal when navigated from the navbar "+" button (?new=1)
  useEffect(() => {
    if (router.isReady && router.query.new === '1' && !authLoading && user) {
      openModal();
      void router.replace('/admin/personal', undefined, { shallow: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.new, authLoading, user]);

  if (authLoading || !user) return null;
  if (!user.permisos.includes('personal:gestionar')) return null;

  return (
    <div className="min-h-full bg-gray-50">
      {/* Page header — brand gradient */}
      <header className="px-6 pt-6">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <circle cx="9" cy="8" r="3" />
              <path strokeLinecap="round" d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
              <path strokeLinecap="round" d="M16 5.5a3 3 0 0 1 0 6M21 20c0-2.6-1.7-4.9-4-5.6" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Gestión de Personal Comercial</h1>
            <p className="text-sm text-gray-500 mt-0.5">Registro y administración de colaboradores</p>
          </div>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className="mx-auto max-w-6xl px-6 pt-4">
          <Alert state={toast.type === 'success' ? 'success' : 'error'} onClose={clearToast}>
            {toast.message}
          </Alert>
        </div>
      )}

      {/* Table */}
      <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-sm text-gray-400">Cargando colaboradores...</p>
          </div>
        ) : personas.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2">
            <p className="text-sm font-medium text-gray-500">No hay colaboradores registrados</p>
            <button
              type="button"
              onClick={openModal}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              Registrar el primero
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-400">
                <th className="px-5 py-3 text-left">Colaborador</th>
                <th className="px-5 py-3 text-left">CI</th>
                <th className="px-5 py-3 text-left">Cargo</th>
                <th className="px-5 py-3 text-left">Sucursal</th>
                <th className="px-5 py-3 text-left">Teléfono</th>
                <th className="px-5 py-3 text-left">Acceso digital</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {personas.map((p) => (
                <tr key={p.id} className="transition hover:bg-gray-50/60">
                  <td className="whitespace-nowrap px-5 py-3.5 font-medium text-gray-900">
                    {p.apellidos}, {p.nombres}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 font-mono text-gray-600">{p.ci}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-gray-600">{p.asignacion?.cargo_nombre ?? '—'}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-gray-600">{p.asignacion?.sucursal_nombre ?? '—'}</td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-gray-500">{p.telefono ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    {p.auth_user_id ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-400">
                        Sin cuenta
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-right">
                    <div className="inline-flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEditModal(p)}>
                        Editar
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => openBaja(p)}>
                        Dar de baja
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
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
            <div
              style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)' }}
              className="rounded-t-2xl px-6 py-4"
            >
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
                  value={form.id_sucursal}
                  onChange={(e) => setForm({ ...form, id_sucursal: e.target.value })}
                  error={formErrors.id_sucursal}
                  placeholder="Seleccionar..."
                >
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre_sucursal}</option>
                  ))}
                </Select>
                <Select
                  label="Cargo"
                  value={form.id_cargo}
                  onChange={(e) => setForm({ ...form, id_cargo: e.target.value })}
                  error={formErrors.id_cargo}
                  placeholder="Seleccionar..."
                >
                  {cargos.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre_cargo}</option>
                  ))}
                </Select>
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
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
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
