import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { db } from "../../firebase/firebase";
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from "firebase/firestore";
import TestK10 from "../../components/Tests/TestK10/TestK10";

export default function K10Page() {
  const { sesionId } = useParams<{ sesionId: string }>();
  const navigate = useNavigate();

  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Cargar sesión
  useEffect(() => {
    const cargarSesion = async () => {
      if (!sesionId) return;

      const ref = doc(db, "sesiones", sesionId);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        alert("Sesión no encontrada");
        navigate("/sesiones");
        return;
      }

      setPacienteId(snap.data().pacienteId);
      setLoading(false);
    };

    cargarSesion();
  }, [sesionId, navigate]);

  // 🔹 Guardar resultado
  const handleFinish = async (resultado: any) => {
    if (!pacienteId || !sesionId) return;

    // 1️⃣ Guardar resultado del test
    await addDoc(collection(db, "resultados"), {
      pacienteId,
      sesionId,
      testId: "k10",
      respuestas: resultado.respuestas,
      puntaje: resultado.score,
      nivel: resultado.nivel,
      metodo: resultado.metodo,
      fecha: serverTimestamp(),
    });

    // 2️⃣ Actualizar sesión
    await updateDoc(doc(db, "sesiones", sesionId), {
      estado: "finalizada",
      fechaUltimaSesion: serverTimestamp(),
    });

    // 3️⃣ Volver al perfil
    navigate(`/paciente/${pacienteId}`);
  };

  if (loading) return <p>Cargando test…</p>;

  return (
    <div className="page">
      <TestK10
        userId={pacienteId}
        onFinish={handleFinish}
      />
    </div>
  );
}
 
