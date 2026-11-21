"use client";

import AppLayout from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import type { PageWithLayout } from "@/types";

// Destino de una cuenta autenticada sin rol asignado: no hay módulo al que llevarla.
const SinAccesoPage: PageWithLayout = () => {
  const { user } = useAuth();

  return (
    <div className="mx-auto mt-12 max-w-sm text-center">
      <h1 className="text-lg font-bold text-gray-800">Tu cuenta no tiene un rol asignado</h1>
      <p className="mt-2 text-sm text-gray-500">
        {user ? <>Hola, <strong>{user.nombres}</strong>. </> : null}
        Pedile a Gerencia Comercial que te asigne un rol para poder usar el portal.
      </p>
    </div>
  );
};

SinAccesoPage.getLayout = (page) => <AppLayout>{page}</AppLayout>;
export default SinAccesoPage;
