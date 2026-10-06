import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../context/AuthContext";
import styles from "./AdminTopbar.module.css";

type SearchPatient = {
  id: string;
  nombre: string;
  contacto: string;
  dni: string;
};
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export default function AdminTopbar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [search, setSearch] = useState({ path: pathname, value: "" });
  const query = search.path === pathname ? search.value : "";
  const [patients, setPatients] = useState<SearchPatient[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  const request = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const title = pathname.includes("/paciente/")
    ? "Perfil de paciente"
    : pathname.includes("pacientes")
      ? "Pacientes"
      : pathname.includes("sesiones")
        ? "Sesiones"
        : pathname.includes("nuevo-paciente")
          ? "Nuevo paciente"
          : "Dashboard";
  const name =
    user?.displayName || user?.email?.split("@")[0] || "Administrador";
  const results = patients.filter((patient) =>
    normalize(`${patient.nombre} ${patient.contacto} ${patient.dni}`).includes(
      normalize(query.trim()),
    ),
  );

  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.current?.focus();
      }
      if (event.key === "Escape") setOpenPath(null);
    };
    const outside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpenPath(null);
    };
    document.addEventListener("keydown", keyboard);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", keyboard);
      document.removeEventListener("pointerdown", outside);
    };
  }, []);
  const openSearch = async () => {
    setOpenPath(pathname);
    setStatus("loading");
    const current = ++request.current;
    try {
      const snapshot = await getDocs(collection(db, "pacientes"));
      if (request.current !== current) return;
      setPatients(
        snapshot.docs.map((document) => {
          const data = document.data();
          return {
            id: document.id,
            nombre: data.nombre || "Sin nombre",
            contacto: data.contacto || data.email || "",
            dni: String(data.dni || ""),
          };
        }),
      );
      setStatus("ready");
    } catch {
      if (request.current === current) setStatus("error");
    }
  };

  return (
    <header
      className={`${styles.topbar} ${title === "Dashboard" ? styles.dashboardTopbar : ""}`}
    >
      <Link to="/admin/dashboard" className={styles.wordmark}>
        <span className={styles.mark} aria-hidden="true">
          <i />
          <i />
        </span>
        <strong>JoinSolution</strong>
        <span className={styles.section}>{title}</span>
      </Link>
      <div
        className={styles.searchWrap}
        ref={container}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setOpenPath(null);
        }}
      >
        <label className={styles.search}>
          <SearchOutlined fontSize="small" />
          <input
            ref={input}
            value={query}
            onFocus={() => {
              void openSearch();
            }}
            onChange={(event) => {
              setSearch({ path: pathname, value: event.target.value });
              setOpenPath(pathname);
            }}
            aria-label="Buscar pacientes por nombre, DNI o contacto"
            aria-expanded={open && Boolean(query.trim())}
            aria-controls="patient-search-results"
            placeholder="Buscar paciente, DNI o contacto…"
          />
          <kbd>Ctrl / ⌘ K</kbd>
        </label>
        {open && query.trim() && (
          <div
            id="patient-search-results"
            className={styles.results}
            aria-label="Resultados de búsqueda"
          >
            {status === "loading" && <p role="status">Buscando pacientes…</p>}
            {status === "error" && (
              <p role="alert">
                No se pudo consultar la base de datos. Volvé a enfocar la
                búsqueda para reintentar.
              </p>
            )}
            {status === "ready" &&
              (results.length ? (
                <>
                  {results.slice(0, 8).map((patient) => (
                    <Link
                      key={patient.id}
                      to={`/admin/paciente/${patient.id}`}
                      onClick={() => setOpenPath(null)}
                    >
                      <strong>{patient.nombre}</strong>
                      <span>
                        {patient.contacto ||
                          (patient.dni
                            ? `DNI ${patient.dni}`
                            : "Sin contacto informado")}
                      </span>
                    </Link>
                  ))}
                  {results.length > 8 && (
                    <p>
                      Hay {results.length} coincidencias. Refiná la búsqueda
                      para ver más.
                    </p>
                  )}
                </>
              ) : (
                <p>Sin pacientes que coincidan con la búsqueda.</p>
              ))}
          </div>
        )}
      </div>
      <div className={styles.profile}>
        <span className={styles.avatar}>{name.slice(0, 2).toUpperCase()}</span>
        <div>
          <strong>{name}</strong>
          <span>Administrador</span>
        </div>
      </div>
    </header>
  );
}
