import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { K10_TEST } from "../../../data/tests/k10";
import BotonPersonalizado from "../../Boton/Boton";
import styles from "../TestK10/Testk10.module.css";
import Modal from "../../Modal/Modal.tsx";
import ConsentimientoCamara from "../../Modal/CamaraModal/CamaraModal.tsx";
import CapturaAutomatica from "../../../services/cameraService.tsx";

import {
  addDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../../firebase/firebase.tsx";

type ResultadoK10 = {
  score: number;
  nivel: string;
  respuestas: number[];
  metodo: string;
  tiempoTotalMs: number;
  archivoCaptura: string | null;
};

export default function TestK10() {
  const navigate = useNavigate();

  const [canStart, setCanStart] = useState(false);
  const [testIniciado, setTestIniciado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [respuestas, setRespuestas] = useState<number[]>(
    Array(K10_TEST.preguntas.length).fill(0)
  );

  const [fotoUrl, setFotoUrl] = useState<string | null>(null);

  const startTimeRef = useRef<number>(0);

  // 🔥 Fuente única de verdad
  const pacienteStorage = localStorage.getItem("paciente");
  const paciente = pacienteStorage ? JSON.parse(pacienteStorage) : null;
  const userId = paciente?.id;

  // ----------------------------
  // Acciones
  // ----------------------------
  const iniciarTest = () => {
    if (!userId) {
      alert("Error de sesión. Volvé a iniciar.");
      return;
    }

    setTestIniciado(true);
    startTimeRef.current = Date.now();
  };

  const responder = (index: number, valor: number) => {
    setRespuestas((prev) => {
      const copia = [...prev];
      copia[index] = valor;
      return copia;
    });
  };

  const calcularResultado = async () => {
    if (!testIniciado || enviando) return;

    if (!userId) {
      alert("Error crítico: paciente no identificado");
      return;
    }

    setEnviando(true);

    const tiempoTotalMs = Date.now() - startTimeRef.current;
    const total = respuestas.reduce((a, b) => a + b, 0);

    let nivel = "";
    if (total <= 12) nivel = "Malestar psicológico bajo o moderado";
    else if (total <= 19) nivel = "Malestar psicológico moderado a severo";
    else if (total <= 29) nivel = "Malestar psicológico severo";
    else nivel = "Malestar psicológico muy severo";

    const resultado: ResultadoK10 = {
      score: total,
      nivel,
      respuestas,
      metodo: "K10",
      tiempoTotalMs,
      archivoCaptura: fotoUrl,
    };

    try {
      // 🧾 1. Guardar resultado
      await addDoc(collection(db, "resultados"), {
        pacienteId: userId,
        testId: "k10",
        ...resultado,
        fecha: new Date(),
        archivoCaptura: resultado.archivoCaptura || null,
      });

      // 🔗 2. Sincronizar asignación automáticamente
      const q = query(
        collection(db, "asignaciones"),
        where("pacienteId", "==", userId),
        where("testId", "==", "k10")
      );

      const snap = await getDocs(q);

      if (!snap.empty) {
        const asignacionDoc = snap.docs[0];

        await updateDoc(doc(db, "asignaciones", asignacionDoc.id), {
          estado: "completado",
          fechaCompletado: new Date(),
        });

        console.log("✅ Asignación actualizada automáticamente");
      }

      navigate("/app/dashboard", { replace: true });
    } catch (error) {
      console.error("❌ Error al guardar el K10:", error);
      setEnviando(false);
    }
  };

  const incompleto = respuestas.some((r) => r === 0);

  // ----------------------------
  // UI inicial
  // ----------------------------
  if (!testIniciado) {
    return (
      <Modal
        abierto={true}
        onCerrar={() => {}}
        titulo="Instrucciones para la Evaluación (K-10)"
      >
        <div style={{ marginBottom: "15px" }}>
          <li>Esta evaluación monitoriza el tiempo (solo estadístico).</li>
          <li>El tiempo NO afecta el resultado.</li>
          <li>Respondé con sinceridad.</li>
        </div>

        <ConsentimientoCamara changeStatus={setCanStart} />

        <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
          <BotonPersonalizado
            variant="primary"
            onClick={iniciarTest}
            disabled={!canStart}
          >
            Comenzar Evaluación
          </BotonPersonalizado>
        </div>
      </Modal>
    );
  }

  // ----------------------------
  // UI test
  // ----------------------------
  return (
    <div className={`global-container ${styles.container}`}>
      {userId && (
        <CapturaAutomatica
          pacienteId={userId}
          onCapturaTerminada={(url) => setFotoUrl(url)}
        />
      )}

      <div className={styles.testContainer}>
        {K10_TEST.preguntas.map((pregunta, i) => (
          <div key={i} className={styles.testCard}>
            <p>
              <strong>{i + 1}.</strong> {pregunta}
            </p>

            <div className={styles.testCardItems}>
              {K10_TEST.opciones.map((op) => (
                <label key={op.valor}>
                  <input
                    type="radio"
                    name={`pregunta-${i}`}
                    checked={respuestas[i] === op.valor}
                    onChange={() => responder(i, op.valor)}
                  />
                  {op.label}
                </label>
              ))}
            </div>
          </div>
        ))}

        <BotonPersonalizado
          variant="primary"
          disabled={incompleto || enviando}
          onClick={calcularResultado}
        >
          {enviando ? "Guardando..." : "Finalizar test"}
        </BotonPersonalizado>
      </div>
    </div>
  );
}