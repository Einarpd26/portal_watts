import Button from '@/components/ui/Button';
import CamposNuevoAcceso, { type CamposNuevoAccesoProps } from './CamposNuevoAcceso';

interface NuevoAccesoFormProps extends CamposNuevoAccesoProps {
  isSubmitting: boolean;
  onSubmit: () => void;
}

/** «Dar acceso» como tarjeta, para la columna lateral de escritorio; en pantallas chicas es una hoja (NuevoAccesoHoja) */
export default function NuevoAccesoForm({ isSubmitting, onSubmit, ...campos }: NuevoAccesoFormProps) {
  return (
    <div className="bg-white rounded-card shadow-card p-6">
      <div className="mb-5">
        <h2 className="text-base font-bold text-gray-900">Dar Acceso</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Otorgá credenciales de acceso a un colaborador activo
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        noValidate
        className="space-y-4"
      >
        <CamposNuevoAcceso {...campos} />

        <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting} className="w-full">
          Dar Acceso
        </Button>
      </form>
    </div>
  );
}
