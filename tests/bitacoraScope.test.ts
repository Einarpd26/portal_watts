import test from "node:test";
import assert from "node:assert/strict";
import { resolverAlcanceBitacora } from "../src/utils/bitacoraUtils.ts";

function depsCon(personal: { ids: number[]; emails: string[] }) {
  const consultadas: number[] = [];
  return {
    consultadas,
    deps: {
      personalDeSucursal: async (idSucursal: number) => {
        consultadas.push(idSucursal);
        return personal;
      },
    },
  };
}

test("bitácora: el alcance global ve todo y no consulta personal", async () => {
  const { deps, consultadas } = depsCon({ ids: [1], emails: ["a@x.com"] });

  const r = await resolverAlcanceBitacora({ alcance_tipo: "GLOBAL", id_sucursal: null }, deps);

  assert.deepEqual(r, { tipo: "global" });
  assert.deepEqual(consultadas, []);
});

test("bitácora: un fiscalizador sin sucursal asignada se deniega", async () => {
  const { deps, consultadas } = depsCon({ ids: [1], emails: [] });

  const r = await resolverAlcanceBitacora({ alcance_tipo: "SUCURSAL", id_sucursal: null }, deps);

  assert.deepEqual(r, { tipo: "denegado" });
  assert.deepEqual(consultadas, []);
});

test("bitácora: un fiscalizador solo consulta el personal de SU sucursal", async () => {
  const { deps, consultadas } = depsCon({ ids: [3], emails: ["x@x.com"] });

  await resolverAlcanceBitacora({ alcance_tipo: "SUCURSAL", id_sucursal: 2 }, deps);

  assert.deepEqual(consultadas, [2]);
});

test("bitácora: una sucursal sin personal no muestra nada", async () => {
  const { deps } = depsCon({ ids: [], emails: [] });

  const r = await resolverAlcanceBitacora({ alcance_tipo: "SUCURSAL", id_sucursal: 5 }, deps);

  assert.deepEqual(r, { tipo: "vacio" });
});

test("bitácora: con personal se arma el filtro por actor, destinatario y correo", async () => {
  const { deps } = depsCon({ ids: [1, 2], emails: ["a@x.com"] });

  const r = await resolverAlcanceBitacora({ alcance_tipo: "SUCURSAL", id_sucursal: 1 }, deps);

  assert.deepEqual(r, {
    tipo: "filtro",
    filtro: 'id_persona.in.(1,2),detalles_json->>id_persona.in.(1,2),usuario_email.in.("a@x.com")',
  });
});

test("bitácora: un error al resolver el personal se propaga para responder 500", async () => {
  const deps = {
    personalDeSucursal: async () => {
      throw new Error("db caída");
    },
  };

  await assert.rejects(
    resolverAlcanceBitacora({ alcance_tipo: "SUCURSAL", id_sucursal: 1 }, deps),
    /db caída/
  );
});
