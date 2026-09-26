import { useEffect, useState } from "react";
import { collection, addDoc, query, where, getDocs, updateDoc, doc, Timestamp } from "firebase/firestore";
import { useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import TestK10 from "../../components/Tests/TestK10/TestK10";
import TestBFQ from "../../components/Tests/TestBFQ/TestBFQ";
import TestRaven from "../../components/Tests/TestRaven/TestRaven";
import TestZulliger from "../../components/Tests/TestZulliger/TestZulliger";
import TestBender from "../../components/Tests/TestBender/TestBender";
import { generarResumenLaminas } from "../../utils/generarResumenLaminas";
import { useNavigate, useParams } from "react-router-dom";
import ConfirmModal from "../../components/Modal/ConfirmModal/ConfirmModal";

export default function TestRunner() {
  const navigate = useNavigate();
  const { testId } = useParams();
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [bloqueandoSalida, setBloqueandoSalida] = useState(true);
  const [loadingConfirm, setLoadingConfirm] = useState(false);

  const pacienteId = localStorage.getItem("pacienteId"); // 🔥 CLAVE
  const testCompletadoRef = useRef(false);
  const bloqueoAplicadoRef = useRef(false);
  const confirmarSalidaRef = useRef(false);
  const resultadoRef = useRef(doc(collection(db, "resultados")));

  useEffect(() => {
    if (!pacienteId || !testId) return;

    setTestEnCurso({ pacienteId, testId });

    const bloquearSalida = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const bloquearRetroceso = () => {
      if (testCompletadoRef.current || confirmarSalidaRef.current) return;
      const confirmar = window.confirm(
        "¿Seguro que desea salir? Recuerde que al cerrar no podrá volver a ingresar y deberá comunicarse con Administración para solicitar un nuevo acceso.",
      );
      if (!confirmar) {
        window.history.pushState(null, "", window.location.href);
        return;
      }
      confirmarSalidaRef.current = true;
      navigate("/app/tests");
    };

    window.addEventListener("beforeunload", bloquearSalida);
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", bloquearRetroceso);

    return () => {
      window.removeEventListener("beforeunload", bloquearSalida);
      window.removeEventListener("popstate", bloquearRetroceso);

      if (testCompletadoRef.current || bloqueoAplicadoRef.current || !pacienteId)
        return;

      bloqueoAplicadoRef.current = true;

      void (async () => {
        try {
          await updateDoc(doc(db, "pacientes", pacienteId), {
            activo: false,
          });
          const asignacionesPendientes = await getDocs(
            query(collection(db, "asignaciones"), where("pacienteId", "==", pacienteId)),
          );
          await Promise.all(
            asignacionesPendientes.docs.map((asig) => {
              const estado = asig.data().estado;
              if (estado === "completado") return Promise.resolve();
              return updateDoc(doc(db, "asignaciones", asig.id), {
                estado: "abandono",
              });
            }),
          );
        } catch (error) {
          console.error("No se pudo bloquear al paciente al salir del test", error);
        } finally {
          clearPacienteSession();
        }
      })();
    };
  }, [pacienteId, testId]);

  useEffect(() => {
    if (!bloqueandoSalida) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const handlePopState = () => {
      setConfirmarSalida(true);
      window.history.pushState(null, "", window.location.href);
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [bloqueandoSalida]);

  const confirmarAbandonoTest = async () => {
    if (!pacienteId) return;

    setLoadingConfirm(true);
    try {
      await updateDoc(doc(db, "pacientes", pacienteId), { activo: false });

      const pacienteRaw = localStorage.getItem("paciente");
      if (pacienteRaw) {
        const paciente = JSON.parse(pacienteRaw);
        localStorage.setItem(
          "paciente",
          JSON.stringify({ ...paciente, activo: false }),
        );
      }

      localStorage.removeItem("rol");
      localStorage.removeItem("pacienteId");
      setBloqueandoSalida(false);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error al inactivar paciente al abandonar test:", error);
      alert("No se pudo salir del test. Intente nuevamente.");
    } finally {
      setLoadingConfirm(false);
      setConfirmarSalida(false);
    }
  };

  const handleFinish = async (resultado: any) => {
    if (!pacienteId || !testId) {
      alert("Faltan datos del paciente");
      return;
    }
    const pacienteSnapPre = await getDoc(doc(db, "pacientes", pacienteId));
    if (!pacienteSnapPre.exists() || !pacienteSnapPre.data()?.archivodni) {
      alert("Necesitás subir el DNI antes de realizar tests.");
      navigate("/app/subir-dni");
      return;
    }

    const ahora = new Date();

    let data: any = {
      testId,
      respuestas: resultado.respuestas || [],
      metodo: resultado.metodo || "",
      fecha: Timestamp.fromDate(ahora),
      pacienteId, // 🔥 AHORA NUNCA VA NULL
      archivoCaptura: resultado.archivoCaptura || null,
      captura_public_id: resultado.captura_public_id || null,
      tiempoTotalMs: resultado.tiempoTotalMs ?? null,
      out_of_time: resultado.out_of_time === true,
    };

    if (testId === "k10") {
      data.score = resultado.score;
      data.nivel = resultado.nivel;
    }

    if (testId === "bfq") {
      const scoreTotal = Object.values(resultado.dimensiones || {})
        .reduce((acc: number, val: any) => acc + (val || 0), 0);

      data.score = scoreTotal;
      data.nivel = "Perfil Big Five";
      data.dimensiones = resultado.dimensiones;
    }

    if (testId === "raven") {
      data.nivel = resultado.nivel;
      data.errores = resultado.errores ?? null;
    }

    if (testId === "zulliger" || testId === "bender") {
      data.nivel = "Interpretación Láminas";
      data.resumenClinico = generarResumenLaminas({
        pacienteNombre: "Paciente",
        fecha: ahora,
        respuestas: resultado.respuestas,
      });
    }

    const q = query(
      collection(db, "asignaciones"),
      where("pacienteId", "==", pacienteId),
      where("testId", "==", testId)
    );

    const snap = await getDocs(q);

    const batch = writeBatch(db);
    batch.set(resultadoRef.current, data);
    snap.docs.forEach((d) =>
      batch.update(doc(db, "asignaciones", d.id), {
        estado: "completado",
        fechaCompletado: Timestamp.fromDate(ahora),
      }),
    );

    await Promise.all(updates);
    const todasAsignacionesSnap = await getDocs(
      query(collection(db, "asignaciones"), where("pacienteId", "==", pacienteId)),
    );
    await batch.commit();
    testCompletadoRef.current = true;
    clearTestEnCurso();

    const asignaciones = todasAsignacionesSnap.docs.map((d) => d.data());
    const total = asignaciones.length;
    const completados = asignaciones.filter(
      (a: any) => a.estado === "completado",
    ).length;

    if (total > 0 && total === completados) {
      await updateDoc(doc(db, "pacientes", pacienteId), {
        activo: false,
      });

      const pacienteRaw = localStorage.getItem("paciente");
      if (pacienteRaw) {
        const paciente = JSON.parse(pacienteRaw);
        localStorage.setItem(
          "paciente",
          JSON.stringify({ ...paciente, activo: false }),
        );
      }
    }

    setBloqueandoSalida(false);
    navigate("/app/tests");
  };

  if (!pacienteId) return <p>Paciente no encontrado</p>;

  return (
    <>
      {testId === "k10" && <TestK10 onFinish={handleFinish} userId={pacienteId} />}
      {testId === "bfq" && <TestBFQ onFinish={handleFinish} userId={pacienteId} />}
      {testId === "laminas" && <TestLaminas onFinish={handleFinish} userId={pacienteId} />}
      {testId === "raven" && <TestRaven onFinish={handleFinish} userId={pacienteId} />}
      {!["k10", "bfq", "laminas", "raven"].includes(testId || "") && (
        <p>Test no encontrado</p>
      )}

      <ConfirmModal
        abierto={confirmarSalida}
        onCerrar={() => setConfirmarSalida(false)}
        titulo="No se puede salir del test"
        mensaje="Si abandona ahora, su acceso quedará inactivo."
        warning="Solo continúe si desea terminar la evaluación y bloquear su cuenta."
        onConfirm={confirmarAbandonoTest}
        loading={loadingConfirm}
      />
    </>
  );
  if (testId === "k10") return <TestK10 onFinish={handleFinish} userId={pacienteId} />;
  if (testId === "bfq") return <TestBFQ onFinish={handleFinish} userId={pacienteId} />;
  if (testId === "zulliger") return <TestZulliger onFinish={handleFinish} userId={pacienteId} />;
  if (testId === "bender") return <TestBender onFinish={handleFinish} userId={pacienteId} />;
  if (testId === "raven") return <TestRaven onFinish={handleFinish} userId={pacienteId} />;

  return <p>Test no encontrado</p>;
}
