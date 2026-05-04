import { useEffect, useRef } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase/firebase";
import TestK10 from "../../components/Tests/TestK10/TestK10";
import TestBFQ from "../../components/Tests/TestBFQ/TestBFQ";
import TestLaminas from "../../components/Tests/TestLaminas/TestLaminas";
import TestRaven from "../../components/Tests/TestRaven/TestRaven";
import { generarResumenLaminas } from "../../utils/generarResumenLaminas";
import { useNavigate, useParams } from "react-router-dom";
import {
  clearPacienteSession,
  clearTestEnCurso,
  getPacienteSession,
  setTestEnCurso,
} from "../../utils/pacienteSession";

export default function TestRunner() {
  const navigate = useNavigate();
  const { testId } = useParams();

  const pacienteId = localStorage.getItem("pacienteId"); // 🔥 CLAVE
  const testCompletadoRef = useRef(false);
  const bloqueoAplicadoRef = useRef(false);
  const confirmarSalidaRef = useRef(false);

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
    };

    // K10
    if (testId === "k10") {
      data.score = resultado.score;
      data.nivel = resultado.nivel;
    }

    // BFQ
    if (testId === "bfq") {
      const scoreTotal = Object.values(resultado.dimensiones || {})
        .reduce((acc: number, val: any) => acc + (val || 0), 0);

      data.score = scoreTotal;
      data.nivel = "Perfil Big Five";
      data.dimensiones = resultado.dimensiones;
    }

    // Raven
    if (testId === "raven") {
      data.nivel = resultado.nivel;
      data.errores = resultado.errores;
    }

    // Láminas
    if (testId === "laminas") {
      data.nivel = "Interpretación Láminas";
      data.resumenClinico = generarResumenLaminas({
        pacienteNombre: "Paciente",
        fecha: ahora,
        respuestas: resultado.respuestas,
      });
    }

    // 💾 GUARDAR
    testCompletadoRef.current = true;
    clearTestEnCurso();

    await addDoc(collection(db, "resultados"), data);

    // 🔥 ACTUALIZAR ASIGNACIÓN
    const q = query(
      collection(db, "asignaciones"),
      where("pacienteId", "==", pacienteId),
      where("testId", "==", testId)
    );

    const snap = await getDocs(q);

    const updates = snap.docs.map((d) =>
      updateDoc(doc(db, "asignaciones", d.id), {
        estado: "completado",
        fechaCompletado: Timestamp.fromDate(ahora),
      })
    );

    await Promise.all(updates);

    const [asignacionesActualizadas, pacienteSnap] = await Promise.all([
      getDocs(
        query(collection(db, "asignaciones"), where("pacienteId", "==", pacienteId)),
      ),
      getDoc(doc(db, "pacientes", pacienteId)),
    ]);

    const asignaciones = asignacionesActualizadas.docs.map((d) => d.data());
    const totalAsignaciones = asignaciones.length;
    const completadas = asignaciones.filter(
      (a: any) => a.estado === "completado",
    ).length;
    const pacienteData = pacienteSnap.data();
    const dniCargado = !!pacienteData?.archivodni;
    const flujoTerminado = totalAsignaciones > 0 && completadas === totalAsignaciones;

    if (flujoTerminado && dniCargado && pacienteData?.activo !== false) {
      await updateDoc(doc(db, "pacientes", pacienteId), { activo: false });

      const parsed = getPacienteSession();
      if (parsed) {
        localStorage.setItem(
          "paciente",
          JSON.stringify({
            ...parsed,
            activo: false,
          }),
        );
      }
    }

    navigate("/app/tests");
  };

  if (!pacienteId) return <p>Paciente no encontrado</p>;

  if (testId === "k10") return <TestK10 onFinish={handleFinish} userId={pacienteId} />;
  if (testId === "bfq") return <TestBFQ onFinish={handleFinish} userId={pacienteId} />;
  if (testId === "laminas") return <TestLaminas onFinish={handleFinish} userId={pacienteId} />;
  if (testId === "raven") return <TestRaven onFinish={handleFinish} userId={pacienteId} />;

  return <p>Test no encontrado</p>;
}