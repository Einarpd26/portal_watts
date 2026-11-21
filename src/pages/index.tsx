import type { GetServerSideProps } from "next";
import { createServerClientForReqRes } from "@/lib/supabase/server";
import { rutaInicialPorRol } from "@/utils/rutaInicial";

// La raiz del portal no es contenido propio: se redirige segun sesion y rol.
// Un usuario anonimo va al login; uno autenticado, a la pantalla de su rol.
export default function Home() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createServerClientForReqRes(ctx.req, ctx.res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { redirect: { destination: "/login", permanent: false } };

  const { data: persona } = await supabase
    .from("personas")
    .select("usuario_roles ( roles ( codigo ) )")
    .eq("auth_user_id", user.id)
    .single();

  const relaciones = Array.isArray(persona?.usuario_roles)
    ? persona.usuario_roles
    : persona?.usuario_roles
      ? [persona.usuario_roles]
      : [];
  const rol = relaciones[0]?.roles?.codigo ?? "SIN_ROL";

  return { redirect: { destination: rutaInicialPorRol(rol), permanent: false } };
};
