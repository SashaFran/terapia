import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import {
  signOut,
} from "firebase/auth";

import SearchOutlined from "@mui/icons-material/SearchOutlined";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";

import {
  auth,
  db,
} from "../../firebase/firebase";

import { useAuth } from "../../context/AuthContext";

import logo from "../../assets/images/logo.svg";

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

  const navigate = useNavigate();

  const { user } = useAuth();


  /* =======================================================
     SEARCH STATE
     ======================================================= */

  const [search, setSearch] = useState({
    path: pathname,
    value: "",
  });

  const [patients, setPatients] =
    useState<SearchPatient[]>([]);

  const [status, setStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  const [openPath, setOpenPath] =
    useState<string | null>(null);


  /* =======================================================
     PROFILE STATE
     ======================================================= */

  const [profileOpen, setProfileOpen] =
    useState(false);


  /* =======================================================
     REFS
     ======================================================= */

  const request = useRef(0);

  const input =
    useRef<HTMLInputElement>(null);

  const searchContainer =
    useRef<HTMLDivElement>(null);

  const profileContainer =
    useRef<HTMLDivElement>(null);


  /* =======================================================
     PAGE
     ======================================================= */

  const query =
    search.path === pathname
      ? search.value
      : "";

  const isDashboard =
    pathname === "/admin/dashboard";

  const title =
    pathname.includes("/paciente/")
      ? "Perfil de paciente"
      : pathname.includes("nuevo-paciente")
        ? "Nuevo paciente"
        : pathname.includes("pacientes")
          ? "Pacientes"
          : pathname.includes("sesiones")
            ? "Sesiones"
            : "Dashboard";


  /* =======================================================
     USER
     ======================================================= */

  const name =
    user?.displayName ||
    user?.email
      ?.split("@")[0]
      .replace(/[._-]+/g, " ") ||
    "Administrador";

  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part.charAt(0).toUpperCase(),
      )
      .join("") || "A";


  /*
   * Esto solamente define la etiqueta visual.
   * Los permisos reales NO deben depender de localStorage.
   */
  const storedRole =
    localStorage.getItem("rol");

  const roleLabel =
    storedRole === "secretaria"
      ? "Secretaría"
      : "Administrador";


  /* =======================================================
     SEARCH RESULTS
     ======================================================= */

  const open =
    openPath === pathname;

  const results =
    patients.filter((patient) =>
      normalize(
        `${patient.nombre} ${patient.contacto} ${patient.dni}`,
      ).includes(
        normalize(query.trim()),
      ),
    );


  /* =======================================================
     CLEANUP REQUEST
     ======================================================= */

  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );


  /* =======================================================
     KEYBOARD + CLICK OUTSIDE
     ======================================================= */

  useEffect(() => {
    const keyboard = (
      event: KeyboardEvent,
    ) => {
      /*
       * Ctrl/Cmd + K:
       * enfoca la búsqueda.
       */
      if (
        (event.ctrlKey ||
          event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();

        input.current?.focus();

        setProfileOpen(false);
      }

      /*
       * Escape:
       * cierra cualquier popup abierto.
       */
      if (event.key === "Escape") {
        setOpenPath(null);
        setProfileOpen(false);
      }
    };


    const outside = (
      event: PointerEvent,
    ) => {
      const target =
        event.target as Node;

      /*
       * Cerrar búsqueda si hacemos click afuera.
       */
      if (
        !searchContainer.current?.contains(
          target,
        )
      ) {
        setOpenPath(null);
      }

      /*
       * Cerrar perfil si hacemos click afuera.
       */
      if (
        !profileContainer.current?.contains(
          target,
        )
      ) {
        setProfileOpen(false);
      }
    };


    document.addEventListener(
      "keydown",
      keyboard,
    );

    document.addEventListener(
      "pointerdown",
      outside,
    );


    return () => {
      document.removeEventListener(
        "keydown",
        keyboard,
      );

      document.removeEventListener(
        "pointerdown",
        outside,
      );
    };
  }, []);


  /* =======================================================
     CLOSE MENUS ON ROUTE CHANGE
     ======================================================= */

  useEffect(() => {
    setOpenPath(null);
    setProfileOpen(false);
  }, [pathname]);


  /* =======================================================
     OPEN SEARCH
     ======================================================= */

  const openSearch = async () => {
    setOpenPath(pathname);

    setProfileOpen(false);


    /*
     * Si ya cargamos pacientes, no volvemos
     * a consultar Firestore en cada focus.
     */
    if (status === "ready") {
      return;
    }


    setStatus("loading");

    const current =
      ++request.current;


    try {
      const snapshot =
        await getDocs(
          collection(
            db,
            "pacientes",
          ),
        );


      if (
        request.current !== current
      ) {
        return;
      }


      setPatients(
        snapshot.docs.map(
          (document) => {
            const data =
              document.data();


            return {
              id:
                document.id,

              nombre:
                data.nombre ||
                "Sin nombre",

              contacto:
                data.contacto ||
                data.email ||
                "",

              dni:
                String(
                  data.dni || "",
                ),
            };
          },
        ),
      );


      setStatus("ready");
    } catch (error) {
      console.error(
        "Error al buscar pacientes:",
        error,
      );


      if (
        request.current === current
      ) {
        setStatus("error");
      }
    }
  };


  /* =======================================================
     LOGOUT
     ======================================================= */

  const handleLogout = async () => {
    try {
      /*
       * Cerramos primero el menú para que
       * la UI responda inmediatamente.
       */
      setProfileOpen(false);


      await signOut(auth);


      /*
       * Limpiamos solamente después de cerrar
       * correctamente Firebase Auth.
       */
      localStorage.clear();


      navigate(
        "/admin/login",
        {
          replace: true,
        },
      );
    } catch (error) {
      console.error(
        "Error al cerrar sesión:",
        error,
      );
    }
  };


  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <header
      className={`${styles.topbar} ${
        isDashboard
          ? styles.heroTopbar
          : styles.darkTopbar
      }`}
    >

      {/* ===================================================
          BRAND
          =================================================== */}

      <div
        className={styles.wordmark}
      >
        <img
          className={styles.adminLogo}
          src={logo}
          alt=""
        />

        <strong>
          JoinSolution
        </strong>

        <span
          className={styles.section}
        >
          {title}
        </span>
      </div>


      {/* ===================================================
          SEARCH
          =================================================== */}

      <div
        className={styles.searchWrap}
        ref={searchContainer}
        onBlur={(event) => {
          if (
            !event.currentTarget.contains(
              event.relatedTarget,
            )
          ) {
            setOpenPath(null);
          }
        }}
      >
        <label
          className={styles.search}
        >
          <SearchOutlined />

          <input
            ref={input}
            type="search"
            value={query}

            onFocus={() => {
              void openSearch();
            }}

            onChange={(event) => {
              setSearch({
                path: pathname,
                value:
                  event.target.value,
              });

              setOpenPath(pathname);

              setProfileOpen(false);
            }}

            aria-label="Buscar pacientes por nombre, DNI o contacto"

            aria-expanded={
              open &&
              Boolean(
                query.trim(),
              )
            }

            aria-controls="patient-search-results"

            placeholder="Buscar paciente, DNI o contacto..."

            autoComplete="off"
          />

          <kbd>
            Ctrl K
          </kbd>
        </label>


        {open &&
          query.trim() && (
            <div
              id="patient-search-results"

              className={
                styles.results
              }

              aria-label="Resultados de búsqueda"
            >

              {status ===
                "loading" && (
                <p role="status">
                  Buscando pacientes…
                </p>
              )}


              {status ===
                "error" && (
                <p role="alert">
                  No se pudo consultar la
                  base de datos.
                </p>
              )}


              {status ===
                "ready" &&
                (
                  results.length
                    ? (
                      <>
                        {results
                          .slice(0, 8)
                          .map(
                            (
                              patient,
                            ) => (
                              <Link
                                key={
                                  patient.id
                                }

                                to={`/admin/paciente/${patient.id}`}

                                onClick={() =>
                                  setOpenPath(
                                    null,
                                  )
                                }
                              >
                                <strong>
                                  {
                                    patient.nombre
                                  }
                                </strong>

                                <span>
                                  {
                                    patient.contacto ||
                                    (
                                      patient.dni
                                        ? `DNI ${patient.dni}`
                                        : "Sin contacto informado"
                                    )
                                  }
                                </span>
                              </Link>
                            ),
                          )}


                        {results.length >
                          8 && (
                          <p>
                            Hay{" "}
                            {
                              results.length
                            }{" "}
                            coincidencias.
                            Refiná la
                            búsqueda para
                            ver más.
                          </p>
                        )}
                      </>
                    )
                    : (
                      <p>
                        Sin pacientes que
                        coincidan con la
                        búsqueda.
                      </p>
                    )
                )}
            </div>
          )}
      </div>


      {/* ===================================================
          PROFILE
          =================================================== */}

      <div
        className={styles.actions}
      >
        <div
          ref={profileContainer}
          className={
            styles.profileWrapper
          }
        >

          {/* PROFILE TRIGGER */}

          <button
            type="button"

            className={
              styles.profile
            }

            onClick={() => {
              setProfileOpen(
                (current) =>
                  !current,
              );

              setOpenPath(null);
            }}

            aria-expanded={
              profileOpen
            }

            aria-haspopup="menu"
          >
            <span
              className={
                styles.avatar
              }
            >
              {initials}
            </span>


            <div
              className={
                styles.profileText
              }
            >
              <strong>
                {name}
              </strong>

              <span>
                {roleLabel}
              </span>
            </div>


            <KeyboardArrowDownRounded
              className={`${styles.profileChevron} ${
                profileOpen
                  ? styles.profileChevronOpen
                  : ""
              }`}
            />
          </button>


          {/* PROFILE MENU */}

          {profileOpen && (
            <div
              className={
                styles.profileMenu
              }

              role="menu"

              aria-label="Opciones de usuario"
            >

              {/* IDENTITY */}

              <div
                className={
                  styles.menuIdentity
                }
              >
                <span
                  className={
                    styles.menuAvatar
                  }
                >
                  {initials}
                </span>


                <div>
                  <strong>
                    {name}
                  </strong>

                  <span>
                    {user?.email ||
                      "Sin correo"}
                  </span>
                </div>
              </div>


              {/* ROLE */}

              <div
                className={
                  styles.menuRole
                }
              >
                <span>
                  {roleLabel}
                </span>
              </div>


              {/* LOGOUT */}

              <button
                type="button"

                className={
                  styles.logoutButton
                }

                onClick={() => {
                  void handleLogout();
                }}

                role="menuitem"
              >
                <LogoutRounded />

                <span>
                  Cerrar sesión
                </span>
              </button>

            </div>
          )}

        </div>
      </div>

    </header>
  );
}