import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../../firebase/firebase";
import styles from "./PacientePerfil.module.css";

import BotonPersonalizado from "../../components/Boton/Boton";
import ConfirmModal from "../../components/Modal/ConfirmModal/ConfirmModal";
import EditarPacienteModal from "../../components/Modal/editarPaciente/EditarPacienteModal";

import { eliminarPaciente } from "../../firebase/pacientes";
import { generarExcelPaciente } from "../../utils/generarExcelPaciente";
import { generarZipPaciente } from "../../utils/generarZipPaciente";

/* =========================================================
   TIPOS
========================================================= */

interface Paciente {
  id: string;
  nombre: string;
  dni: string;
  activo?: boolean;
  archivodni?: string;
  dni_public_id?: string;
  fechaInicioAcceso?: any;
  fechaFinAcceso?: any;
  createdAt?: any;
}

interface Asignacion {
  id: string;
  testId: string;
  estado: string;
  fechaAsignacion?: any;
  fechaCompletado?: any;
}

interface Resultado {
  id: string;
  pacienteId?: string;
  testId?: string;
  fecha?: any;
  observacionesIniciales?: string;
  archivoCaptura?: string;
  [key: string]: any;
}

type EstadoVisual =
  | "abandono"
  | "pendiente"
  | "vencido"
  | "inactivo"
  | "sin-asignar"
  | "completado"
  | "activo";

interface EstadoPaciente {
  label: string;
  tipo: EstadoVisual;
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function PacientePerfil() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Paciente | null>(null);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [resultados, setResultados] = useState<Resultado[]>([]);

  const [loading, setLoading] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [dniModalOpen, setDniModalOpen] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const [confirmData, setConfirmData] = useState<{
    titulo: string;
    mensaje: string;
    warning?: string;
    onConfirm: () => Promise<void>;
  } | null>(null);

  const [loadingConfirm, setLoadingConfirm] = useState(false);

  /* =========================================================
     UTILIDADES
  ========================================================= */

  const convertirFecha = (fecha: any): Date | null => {
    if (!fecha) return null;

    if (typeof fecha.toDate === "function") {
      return fecha.toDate();
    }

    if (typeof fecha.seconds === "number") {
      return new Date(fecha.seconds * 1000);
    }

    const date = new Date(fecha);

    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatearFecha = (fecha: any): string => {
    const date = convertirFecha(fecha);

    if (!date) return "N/A";

    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatearNombreTest = (testId?: string) => {
    if (!testId) return "—";

    const nombres: Record<string, string> = {
      k10: "K-10",
      bfq: "BFQ",
      zulliger: "Zulliger",
      bender: "Bender",
      raven: "Raven",
    };

    return nombres[testId.toLowerCase()] || testId.toUpperCase();
  };

  /* =========================================================
     CARGA DE DATOS
  ========================================================= */

  const cargarPaciente = async () => {
    if (!id) return;

    try {
      setLoading(true);

      const pacienteRef = doc(db, "pacientes", id);
      const pacienteSnap = await getDoc(pacienteRef);

      if (!pacienteSnap.exists()) {
        setPatient(null);
        return;
      }

      setPatient({
        id: pacienteSnap.id,
        ...pacienteSnap.data(),
      } as Paciente);

      const asignacionesQuery = query(
        collection(db, "asignaciones"),
        where("pacienteId", "==", id),
      );

      const asignacionesSnap = await getDocs(asignacionesQuery);

      const asignacionesData = asignacionesSnap.docs.map(
        (documento) => ({
          id: documento.id,
          ...documento.data(),
        }),
      ) as Asignacion[];

      setAsignaciones(asignacionesData);

      const resultadosQuery = query(
        collection(db, "resultados"),
        where("pacienteId", "==", id),
      );

      const resultadosSnap = await getDocs(resultadosQuery);

      const resultadosData = resultadosSnap.docs.map(
        (documento) => ({
          id: documento.id,
          ...documento.data(),
        }),
      ) as Resultado[];

      setResultados(resultadosData);
    } catch (error) {
      console.error("Error al cargar paciente:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarPaciente();
  }, [id]);

  /* =========================================================
     ESTADO DEL PACIENTE
  ========================================================= */

  const getEstadoPaciente = (): EstadoPaciente => {
    if (!patient) {
      return {
        label: "Sin información",
        tipo: "inactivo",
      };
    }

    const ahora = new Date();

    const inicio = convertirFecha(patient.fechaInicioAcceso);
    const fin = convertirFecha(patient.fechaFinAcceso);

    if (
      asignaciones.some(
        (asignacion) => asignacion.estado === "abandono",
      )
    ) {
      return {
        label: "Abandono",
        tipo: "abandono",
      };
    }

    if (inicio && ahora < inicio) {
      return {
        label: "Pendiente",
        tipo: "pendiente",
      };
    }

    if (fin && ahora >= fin) {
      return {
        label: "Vencido",
        tipo: "vencido",
      };
    }

    if (patient.activo === false) {
      return {
        label: "Inactivo",
        tipo: "inactivo",
      };
    }

    if (asignaciones.length === 0) {
      return {
        label: "Sin asignar",
        tipo: "sin-asignar",
      };
    }

    const completados = asignaciones.filter(
      (asignacion) => asignacion.estado === "completado",
    ).length;

    if (asignaciones.length === completados) {
      return {
        label: "Completado",
        tipo: "completado",
      };
    }

    return {
      label: "Activo",
      tipo: "activo",
    };
  };

  /* =========================================================
     CONFIRMACIÓN
  ========================================================= */

  const abrirConfirm = (data: {
    titulo: string;
    mensaje: string;
    warning?: string;
    onConfirm: () => Promise<void>;
  }) => {
    setConfirmData(data);
    setConfirmOpen(true);
  };

  const cerrarConfirm = () => {
    if (loadingConfirm) return;

    setConfirmOpen(false);
    setConfirmData(null);
  };

  const ejecutarConfirmacion = async () => {
    if (!confirmData) return;

    try {
      setLoadingConfirm(true);

      await confirmData.onConfirm();

      setConfirmOpen(false);
      setConfirmData(null);
    } catch (error) {
      console.error("Error al ejecutar acción:", error);
    } finally {
      setLoadingConfirm(false);
    }
  };

  /* =========================================================
     ELIMINAR ASIGNACIÓN
  ========================================================= */

  const handleEliminarAsignacion = async (
    asignacion: Asignacion,
  ) => {
    abrirConfirm({
      titulo: "Eliminar test asignado",

      mensaje: `¿Eliminar ${formatearNombreTest(
        asignacion.testId,
      )} de este paciente?`,

      warning: "Esta acción eliminará la asignación del test.",

      onConfirm: async () => {
        await deleteDoc(
          doc(db, "asignaciones", asignacion.id),
        );

        setAsignaciones((prev) =>
          prev.filter((item) => item.id !== asignacion.id),
        );
      },
    });
  };

  /* =========================================================
     ELIMINAR RESULTADO
  ========================================================= */

  const handleEliminarResultado = async (
    resultado: Resultado,
  ) => {
    abrirConfirm({
      titulo: "Eliminar evaluación",

      mensaje: `¿Eliminar la evaluación ${formatearNombreTest(
        resultado.testId,
      )}?`,

      warning:
        "El resultado guardado dejará de estar disponible.",

      onConfirm: async () => {
        await deleteDoc(
          doc(db, "resultados", resultado.id),
        );

        setResultados((prev) =>
          prev.filter((item) => item.id !== resultado.id),
        );
      },
    });
  };

  /* =========================================================
     ELIMINAR PACIENTE
  ========================================================= */

  const handleEliminarPaciente = async () => {
    if (!patient) return;

    await eliminarPaciente({
      pacienteId: patient.id,
    });

    navigate("/admin/pacientes", {
      replace: true,
    });
  };

  /* =========================================================
     ACTUALIZACIÓN DESDE MODAL
  ========================================================= */

  const handlePacienteActualizado = (data: any) => {
    setPatient((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        activo: data.activo ?? prev.activo,
        fechaFinAcceso:
          data.fechaFinAcceso ?? prev.fechaFinAcceso,
      };
    });

    void cargarPaciente();
  };

  /* =========================================================
     DESCARGAS
  ========================================================= */

  const handleExcel = () => {
    if (!patient) return;

    try {
      generarExcelPaciente(
        patient,
        asignaciones,
        resultados,
      );
    } catch (error) {
      console.error("Error al generar Excel:", error);
    }
  };

  const handleZip = async () => {
    if (!patient) return;

    try {
      await generarZipPaciente(
        patient,
        resultados,
      );
    } catch (error) {
      console.error("Error al generar ZIP:", error);
    }
  };

  /* =========================================================
     LOADING
  ========================================================= */
  if (loading) {
    return (
      <div className={styles.loading}>
        <div
          className={
            styles.loadingIndicator
          }
        />

        <p>Cargando paciente...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className={styles.loading}>
        Paciente no encontrado.
      </div>
    );
  }

  /* =========================================================
     DATOS DERIVADOS
  ========================================================= */

  const estadoPaciente = getEstadoPaciente();

  const testsCompletados = asignaciones.filter(
    (asignacion) => asignacion.estado === "completado",
  ).length;

  const tieneDni = Boolean(patient.archivodni);

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className={styles.container}>
      {/* =====================================================
          ENCABEZADO
      ===================================================== */}

      <header className={styles.pageHeader}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>
            Perfil del paciente
          </p>

          <div className={styles.titleRow}>
            <h1>{patient.nombre}</h1>
          </div>

          <p className={styles.pageDescription}>
            DNI {patient.dni} · Administrá su acceso,
            documentación y evaluaciones.
          </p>
        </div>

        <div className={styles.headerActions}>
          <BotonPersonalizado
            variant="secondary"
            onClick={() => setDniModalOpen(true)}
            tooltip={
              tieneDni
                ? "Consultar la documentación cargada por el paciente."
                : "El paciente todavía no cargó su DNI."
            }
            disabled={false}
          >
            {tieneDni ? "Ver DNI" : "DNI pendiente"}
          </BotonPersonalizado>

          <BotonPersonalizado
            variant="primary"
            onClick={() => setIsConfigOpen(true)}
            tooltip="Cambiar la fecha de acceso y los tests asignados."
            disabled={false}
          >
            Modificar acceso
          </BotonPersonalizado>
        </div>
      </header>

      {/* =====================================================
          MÉTRICAS
      ===================================================== */}

      <section className={styles.metricsGrid}>
        <article className={styles.metricCard}>
          <span className={styles.metricDot} />

          <p className={styles.metricTitle}>
            Estado
          </p>

          <div className={styles.metricMain}>
            <span
              className={`${styles.statusBadge} ${
                estadoPaciente.tipo === "activo" ||
                estadoPaciente.tipo === "completado"
                  ? styles.statusSuccess
                  : estadoPaciente.tipo === "pendiente" ||
                      estadoPaciente.tipo === "sin-asignar"
                    ? styles.statusWarning
                    : styles.statusDanger
              }`}
            >
              <span className={styles.statusIndicator} />
              {estadoPaciente.label}
            </span>
          </div>

          <p className={styles.metricCaption}>
            Estado actual del acceso
          </p>
        </article>

        <article className={styles.metricCard}>
          <span className={styles.metricDot} />

          <p className={styles.metricTitle}>
            Evaluaciones
          </p>

          <div className={styles.metricNumber}>
            {testsCompletados}
            <span> / {asignaciones.length}</span>
          </div>

          <p className={styles.metricCaption}>
            Tests completados
          </p>
        </article>

        <article className={styles.metricCard}>
          <span className={styles.metricDot} />

          <p className={styles.metricTitle}>
            Período de acceso
          </p>

          <div className={styles.accessDates}>
            <strong>
              {formatearFecha(patient.fechaInicioAcceso)}
            </strong>

            <span className={styles.dateArrow}>→</span>

            <strong>
              {formatearFecha(patient.fechaFinAcceso)}
            </strong>
          </div>

          <p className={styles.metricCaption}>
            Período habilitado para el paciente
          </p>
        </article>
      </section>

      {/* =====================================================
          TESTS ASIGNADOS
      ===================================================== */}

      <section className={styles.dataCard}>
        <div className={styles.cardHeader}>
          <div>
            <h2>Tests asignados</h2>

            <p>
              {asignaciones.length === 1
                ? "1 evaluación asignada"
                : `${asignaciones.length} evaluaciones asignadas`}
            </p>
          </div>

          <BotonPersonalizado
            variant="secondary"
            onClick={handleExcel}
            tooltip="Descargar los datos del paciente en formato Excel."
            disabled={asignaciones.length === 0}
          >
            Exportar Excel
          </BotonPersonalizado>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Test</th>
                <th>Estado</th>
                <th>Asignado</th>
                <th>Completado</th>
                <th className={styles.actionHeader}>
                  Acción
                </th>
              </tr>
            </thead>

            <tbody>
              {asignaciones.length > 0 ? (
                asignaciones.map((asignacion) => (
                  <tr key={asignacion.id}>
                    <td>
                      <strong className={styles.testName}>
                        {formatearNombreTest(
                          asignacion.testId,
                        )}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`${styles.tableStatus} ${
                          asignacion.estado === "completado"
                            ? styles.tableStatusCompleted
                            : asignacion.estado === "abandono"
                              ? styles.tableStatusDanger
                              : styles.tableStatusPending
                        }`}
                      >
                        <span />
                        {asignacion.estado}
                      </span>
                    </td>

                    <td>
                      {formatearFecha(
                        asignacion.fechaAsignacion,
                      )}
                    </td>

                    <td>
                      {asignacion.fechaCompletado
                        ? formatearFecha(
                            asignacion.fechaCompletado,
                          )
                        : "—"}
                    </td>

                    <td className={styles.actionCell}>
                      <button
                        type="button"
                        className={`text-button`}
                        onClick={() =>
                          void handleEliminarAsignacion(
                            asignacion,
                          )
                        }
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className={styles.emptyTable}
                  >
                    No hay tests asignados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* =====================================================
          EVALUACIONES
      ===================================================== */}

      <section className={styles.dataCard}>
        <div className={styles.cardHeader}>
          <div>
            <h2>Evaluaciones</h2>

            <p>
              {resultados.length === 0
                ? "Todavía no hay resultados completados"
                : resultados.length === 1
                  ? "1 resultado disponible"
                  : `${resultados.length} resultados disponibles`}
            </p>
          </div>

          <BotonPersonalizado
            variant="secondary"
            onClick={() => void handleZip()}
            tooltip="Descargar los informes disponibles del paciente."
            disabled={resultados.length === 0}
          >
            Descargar archivos
          </BotonPersonalizado>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Test</th>
                <th>Comentario</th>
                <th>Archivo</th>
                <th className={styles.actionHeader}>
                  Acción
                </th>
              </tr>
            </thead>

            <tbody>
              {resultados.length > 0 ? (
                resultados.map((resultado) => (
                  <tr key={resultado.id}>
                    <td>
                      {formatearFecha(resultado.fecha)}
                    </td>

                    <td>
                      <strong className={styles.testName}>
                        {formatearNombreTest(
                          resultado.testId,
                        )}
                      </strong>
                    </td>

                    <td className={styles.commentCell}>
                      {resultado.observacionesIniciales ||
                        "Sin comentarios"}
                    </td>

                    <td>
                      {resultado.archivoCaptura ? (
                        <a
                          href={resultado.archivoCaptura}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.fileLink}
                        >
                          Ver archivo →
                        </a>
                      ) : (
                        <span className={styles.muted}>
                          —
                        </span>
                      )}
                    </td>

                    <td className={styles.actionCell}>
                      <button
                        type="button"
                        className={`text-button`}
                        onClick={() =>
                          void handleEliminarResultado(
                            resultado,
                          )
                        }
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className={styles.emptyTable}
                  >
                    Todavía no hay evaluaciones
                    completadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* =====================================================
          ZONA DE PELIGRO
      ===================================================== */}

      <section className={styles.dangerZone}>
        <div>
          <h3>Eliminar paciente</h3>

          <p>
            Elimina el perfil junto con sus asignaciones y
            evaluaciones.
          </p>
        </div>

        <button
          type="button"
          className={styles.deletePatient}
          onClick={() =>
            abrirConfirm({
              titulo: "Eliminar paciente",
              mensaje: `¿Eliminar a ${patient.nombre}?`,
              warning:
                "Se eliminarán también sus asignaciones y evaluaciones.",
              onConfirm: handleEliminarPaciente,
            })
          }
          disabled={loadingConfirm}
        >
          Eliminar paciente
        </button>
      </section>

      {/* =====================================================
          MODIFICAR PACIENTE
      ===================================================== */}

      <EditarPacienteModal
        abierto={isConfigOpen}
        onCerrar={() => setIsConfigOpen(false)}
        onGuardar={handlePacienteActualizado}
        paciente={patient}
        asignacionesActuales={asignaciones.map(
          (asignacion) => asignacion.testId,
        )}
      />

      {/* =====================================================
          DNI
      ===================================================== */}

      {dniModalOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setDniModalOpen(false)}
        >
          <div
            className={styles.dniModal}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.dniModalHeader}>
              <div>
                <p className={styles.modalEyebrow}>
                  Documentación
                </p>

                <h2>DNI del paciente</h2>

                <p className={styles.modalSubtitle}>
                  {patient.nombre}
                </p>
              </div>

              <button
                type="button"
                className={styles.closeModal}
                onClick={() => setDniModalOpen(false)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {patient.archivodni ? (
              <>
                <div className={styles.documentStatus}>
                  <span
                    className={`${styles.statusIndicator} ${styles.documentStatusDot}`}
                  />

                  Documento disponible
                </div>

                <div className={styles.dniPreview}>
                  <img
                    src={patient.archivodni}
                    alt={`DNI de ${patient.nombre}`}
                  />
                </div>

                <a
                  href={patient.archivodni}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.openDocument}
                >
                  Abrir documento en otra pestaña →
                </a>
              </>
            ) : (
              <div className={styles.noDocument}>
                <span className={styles.noDocumentIcon}>
                  —
                </span>

                <strong>DNI pendiente</strong>

                <p>
                  El paciente todavía no cargó su documento.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          CONFIRMACIÓN
      ===================================================== */}

      {confirmData && (
        <ConfirmModal
          abierto={confirmOpen}
          titulo={confirmData.titulo}
          mensaje={confirmData.mensaje}
          warning={confirmData.warning}
          loading={loadingConfirm}
          onCerrar={cerrarConfirm}
          onConfirm={() => void ejecutarConfirmacion()}
        />
      )}
    </div>
  );
}