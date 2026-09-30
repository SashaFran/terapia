import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TestK10 from "../../components/Tests/TestK10/TestK10";
import TestBFQ from "../../components/Tests/TestBFQ/TestBFQ";
import TestRaven from "../../components/Tests/TestRaven/TestRaven";
import TestZulliger from "../../components/Tests/TestZulliger/TestZulliger";
import TestBender from "../../components/Tests/TestBender/TestBender";
import { accessStore, abandonPatientTest, finishPatientTest } from "../../utils/patientAccess";
import { getPacienteSession } from "../../utils/pacienteSession";
import { generarResumenLaminas } from "../../utils/generarResumenLaminas";

export default function TestRunner() {
  const { testId } = useParams();
  return <Assessment key={testId} testId={testId} />;
}

function Assessment({ testId }: { testId: string | undefined }) {
  const navigate = useNavigate();
  const access = useSyncExternalStore(accessStore.subscribe, accessStore.snapshot);
  const started = useRef(false);
  const completed = useRef(false);
  const [error, setError] = useState("");
  const patient = getPacienteSession();
  if (access.testId === testId) started.current = true;
  useEffect(() => {
    return () => {
      if (testId && started.current && !completed.current) {
        void abandonPatientTest(testId).catch(() => {});
      }
    };
  }, [testId]);
  const cancel = async () => {
    if (!testId) return;
    if (!window.confirm("Si abandona esta evaluación, no podrá retomarla. ¿Desea continuar?")) return;
    try { await abandonPatientTest(testId); navigate("/app/tests"); }
    catch { setError("No se pudo registrar el abandono. Verifique la conexión e intente nuevamente."); }
  };
  const handleFinish = async (resultado: any) => {
    if (!testId) throw new Error("Evaluación inválida.");
    let data = { ...resultado };
    if (testId === "zulliger" || testId === "bender") {
      data = { ...data, resumenClinico: generarResumenLaminas({ pacienteNombre: patient?.nombre || "Paciente", fecha: new Date(), respuestas: resultado.respuestas }) };
    }
    await finishPatientTest(testId, data, () => { completed.current = true; });
    navigate("/app/tests", { replace: true });
  };
  const tests = { k10: TestK10, bfq: TestBFQ, raven: TestRaven, zulliger: TestZulliger, bender: TestBender };
  const Test = tests[testId as keyof typeof tests];
  if (!Test || !patient) return <p>Evaluación no disponible.</p>;
  if (started.current && !access.testId && !completed.current) return <section className="access-policy"><h1>Evaluación abandonada</h1><p>No puede volver a ingresar a esta evaluación.</p><button onClick={() => navigate("/app/tests")}>Volver a evaluaciones</button></section>;
  return <>
    {error && <p role="alert">{error}</p>}
    {access.testId && <button type="button" className="boton-base boton-secondary" onClick={() => void cancel()}>Abandonar evaluación</button>}
    <fieldset disabled={access.connectionLost || Boolean(access.awayUntil)} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
      <Test key={testId} userId={patient.id} onFinish={handleFinish} />
    </fieldset>
  </>;
}
