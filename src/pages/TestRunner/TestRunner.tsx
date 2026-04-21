import { collection, addDoc, query, where, getDocs, updateDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import TestK10 from "../../components/Tests/TestK10/TestK10";
import TestBFQ from "../../components/Tests/TestBFQ/TestBFQ";
import TestLaminas from "../../components/Tests/TestLaminas/TestLaminas";
import TestRaven from "../../components/Tests/TestRaven/TestRaven";
import { generarResumenLaminas } from "../../utils/generarResumenLaminas";
import { useNavigate, useParams } from "react-router-dom";

export default function TestRunner() {
  const navigate = useNavigate();
  const { testId } = useParams();

  const pacienteId = localStorage.getItem("pacienteId"); // 🔥 CLAVE

  const handleFinish = async (resultado: any) => {
    if (!pacienteId || !testId) {
      alert("Faltan datos del paciente");
      return;
    }

    const ahora = new Date();

    let data: any = {
      testId,
      respuestas: resultado.respuestas || [],
      metodo: resultado.metodo || "",
      fecha: Timestamp.fromDate(ahora),
      pacienteId, // 🔥 AHORA NUNCA VA NULL
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

    navigate("/app/tests");
  };

  if (testId === "k10") return <TestK10 onFinish={handleFinish} />;
  if (testId === "bfq") return <TestBFQ onFinish={handleFinish} />;
  if (testId === "laminas") return <TestLaminas onFinish={handleFinish} />;
  if (testId === "raven") return <TestRaven onFinish={handleFinish} />;

  return <p>Test no encontrado</p>;
}