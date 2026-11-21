"use client";

import PageLoader from '@/components/ui/PageLoader';
import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useGestionTerritorio } from '@/hooks/useGestionTerritorio';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { ListaZonas } from '@/components/territorio/ListaZonas';
import { FormularioZona } from '@/components/territorio/FormularioZona';
import { TarjetaZona } from '@/components/territorio/TarjetaZona';
import { LeyendaMapa } from '@/components/territorio/LeyendaMapa';
import { BotonPlegarPanel, SelectorVistaMovil, type VistaMovil } from '@/components/territorio/ControlesPanelMapa';
import SupervisorZonaModal from '@/components/territorio/SupervisorZonaModal';
import EliminarZonaModal from '@/components/territorio/EliminarZonaModal';
import Alert from '@/components/ui/Alert';
import { cn } from '@/utils/cn';
import { coloresPorZona } from '@/utils/coloresTerritorio';
import { logger } from '@/lib/logger';

// MapLibre necesita WebGL y el navegador: solo se carga en el cliente (ADR-002 §4)
const MapaTerritorial = dynamic(
  () => import('@/components/territorio/MapaTerritorial').then((m) => m.MapaTerritorial),
  { ssr: false, loading: () => <PageLoader className="h-full" /> }
);

// Pasa a pantalla completa todo el contenedor (panel, mapa y avisos), como en la pestaña Rutas
const ID_PANTALLA_COMPLETA = 'mapa-zonas';

const accion = (promesa: Promise<void>, contexto: string) => {
  promesa.catch((err: unknown) => {
    logger.error(`Error no controlado al ${contexto}:`, err);
  });
};

/**
 * Pestaña de zonas (CU-04 y CU-07) con el mismo diseño que la de rutas: panel lateral con la lista
 * o el formulario, y mapa con el contorno de cada zona (la envolvente de sus rutas, ADR-002 D7).
 * Elegir una zona muestra sus acciones en una tarjeta sobre su contorno.
 */
export function ZonasPanel() {
  const g = useGestionTerritorio();
  const [busqueda, setBusqueda] = useState('');
  const [filtroSucursal, setFiltroSucursal] = useState<number | null>(null);
  const [vistaMovil, setVistaMovil] = useState<VistaMovil>('lista');
  const [panelPlegado, setPanelPlegado] = useState(false);

  // Esc equivale a Cancelar (salvo mientras se envía o con un diálogo abierto, que maneja el suyo)
  const editando = g.formModal.open;
  useEscapeKey(g.closeForm, editando && !g.isSubmitting && !g.supervisorTarget && !g.deleteTarget);

  const coloresZona = useMemo(() => coloresPorZona(g.zonas), [g.zonas]);
  // El selector es solo para quien opera varias sucursales (Gerencia global)
  const puedeElegirSucursal = g.alcanceGlobal && g.sucursales.length > 1;
  // Con una sucursal elegida el prefijo de sucursal en cada zona sobra
  const mostrarSucursal = g.sucursales.length > 1 && filtroSucursal === null;

  // El filtro de sucursal alcanza a la lista, al mapa y a la leyenda; los colores salen de todas las
  // zonas para que cada una conserve el suyo al cambiar de filtro
  const zonasDeSucursal = useMemo(
    () => (filtroSucursal === null ? g.zonas : g.zonas.filter((z) => z.id_sucursal === filtroSucursal)),
    [filtroSucursal, g.zonas]
  );
  const rutasDeSucursal = useMemo(() => {
    if (filtroSucursal === null) return g.rutas;
    const ids = new Set(zonasDeSucursal.map((z) => z.id));
    return g.rutas.filter((r) => ids.has(r.id_zona));
  }, [filtroSucursal, g.rutas, zonasDeSucursal]);
  const contornosDeSucursal = useMemo(() => {
    if (filtroSucursal === null) return g.contornos;
    const ids = new Set(zonasDeSucursal.map((z) => z.id));
    return g.contornos.filter((c) => ids.has(c.id_zona));
  }, [filtroSucursal, g.contornos, zonasDeSucursal]);

  const zonasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return zonasDeSucursal;
    return zonasDeSucursal.filter((z) => z.codigo_zona.toLowerCase().includes(q) || z.zona.toLowerCase().includes(q));
  }, [busqueda, zonasDeSucursal]);

  // Cambiar de sucursal deja sin selección: la zona elegida podría quedar fuera del filtro
  const cambiarSucursal = (id: number | null) => {
    setFiltroSucursal(id);
    g.setSeleccionId(null);
  };

  const zonaElegida = editando ? null : (zonasDeSucursal.find((z) => z.id === g.seleccionId) ?? null);
  // Sin rutas la zona no tiene contorno donde anclar la tarjeta: entonces flota arriba del mapa
  const conContorno = zonaElegida !== null && contornosDeSucursal.some((c) => c.id_zona === zonaElegida.id);
  const tarjeta = zonaElegida && (
    <TarjetaZona
      zona={zonaElegida}
      color={coloresZona.get(zonaElegida.id)}
      mostrarSucursal={mostrarSucursal}
      onEditar={() => {
        g.openEditar(zonaElegida);
        setVistaMovil('lista');
      }}
      onSupervisor={() => g.openSupervisor(zonaElegida)}
      onEliminar={() => g.openEliminar(zonaElegida)}
      onCerrar={() => g.setSeleccionId(null)}
    />
  );

  return (
    <div id={ID_PANTALLA_COMPLETA} className="flex min-h-0 flex-1 flex-col bg-white lg:flex-row">
      {/* El aviso flota: si empujara el contenido, el mapa saltaría al ocultarse */}
      {g.toast && (
        <div className="fixed left-1/2 top-24 z-50 w-[min(92vw,28rem)] -translate-x-1/2 shadow-lg">
          <Alert state={g.toast.type} onClose={g.clearToast}>
            {g.toast.message}
          </Alert>
        </div>
      )}

      <SelectorVistaMovil vista={vistaMovil} onCambiar={setVistaMovil} etiquetaLista={editando ? 'Datos' : 'Lista'} />

      <aside
        className={cn(
          'min-h-0 w-full shrink-0 flex-col border-gray-200 bg-white lg:w-80 lg:border-r',
          vistaMovil === 'lista' ? 'flex flex-1 lg:flex-none' : 'hidden',
          panelPlegado ? 'lg:hidden' : 'lg:flex'
        )}
      >
        {editando ? (
          <FormularioZona
            editando={g.formModal.zona}
            form={g.form}
            setForm={g.setForm}
            errors={g.formErrors}
            sucursales={g.sucursales}
            alcanceGlobal={g.alcanceGlobal}
            confirmaCambio={g.confirmaCambioSucursal}
            setConfirmaCambio={g.setConfirmaCambioSucursal}
            isSubmitting={g.isSubmitting}
            onGuardar={() => accion(g.submitForm(), 'guardar la zona')}
            onCancelar={g.closeForm}
          />
        ) : (
          <ListaZonas
            zonas={zonasFiltradas}
            coloresZona={coloresZona}
            isLoading={g.isLoading}
            mostrarSucursal={mostrarSucursal}
            sucursales={puedeElegirSucursal ? g.sucursales : []}
            filtroSucursal={filtroSucursal}
            onFiltroSucursal={cambiarSucursal}
            busqueda={busqueda}
            onBusqueda={setBusqueda}
            seleccionId={g.seleccionId}
            onSeleccionar={g.setSeleccionId}
            onNueva={g.openCrear}
          />
        )}
      </aside>

      <section
        aria-label="Mapa de zonas"
        className={cn('relative min-h-0 flex-1 bg-gray-100 lg:block', vistaMovil === 'mapa' ? 'block' : 'hidden')}
      >
        <MapaTerritorial
          seleccion="zona"
          rutas={rutasDeSucursal}
          seleccionId={g.seleccionId}
          onSeleccionar={g.setSeleccionId}
          vistaPrevia={null}
          vistaPreviaInvalida={false}
          conflictos={[]}
          contornos={contornosDeSucursal}
          coloresZona={coloresZona}
          idPantallaCompleta={ID_PANTALLA_COMPLETA}
          dibujo={null}
          tarjetaSeleccion={conContorno ? tarjeta : null}
        />

        <LeyendaMapa zonas={zonasDeSucursal} coloresZona={coloresZona} />

        <div className="absolute left-2 top-2 z-10">
          <BotonPlegarPanel plegado={panelPlegado} onAlternar={() => setPanelPlegado((v) => !v)} />
        </div>

        {zonaElegida && !conContorno && (
          <div className="absolute left-1/2 top-14 z-10 -translate-x-1/2 rounded-xl border border-gray-200 bg-white shadow-2xl">
            {tarjeta}
          </div>
        )}
      </section>

      <SupervisorZonaModal
        zona={g.supervisorTarget}
        candidatos={g.supervisores}
        seleccion={g.supervisorSeleccion}
        onSeleccion={g.setSupervisorSeleccion}
        isSubmitting={g.isSubmitting}
        onConfirm={() => accion(g.submitSupervisor(), 'asignar el supervisor')}
        onCancel={g.closeSupervisor}
      />

      <EliminarZonaModal
        zona={g.deleteTarget}
        isSubmitting={g.isSubmitting}
        onConfirm={() => accion(g.submitEliminar(), 'eliminar la zona')}
        onCancel={g.closeEliminar}
      />
    </div>
  );
}
