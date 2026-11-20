import type { GetServerSideProps } from 'next';

// La cobertura (CU-13) ahora es un modo del mapa: este enlace se conserva para los marcadores y accesos ya compartidos
export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: '/mapa?vista=cobertura', permanent: false },
});

export default function CoberturaPage() {
  return null;
}
