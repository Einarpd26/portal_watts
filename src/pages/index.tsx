import type { GetServerSideProps } from "next";
import { createServerClientForReqRes } from "@/lib/supabase/server";

// La raiz del portal no es contenido propio: se redirige segun sesion.
// Un usuario autenticado va al dashboard; uno anonimo, al login.
export default function Home() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const supabase = createServerClientForReqRes(ctx.req, ctx.res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    redirect: {
      destination: user ? "/dashboard" : "/login",
      permanent: false,
    },
  };
};