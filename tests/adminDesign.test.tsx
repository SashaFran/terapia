import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Dashboard from "../src/pages/Dashboard/Dashboard";
import Pacientes from "../src/pages/Pacientes/Pacientes";
import AdminTopbar from "../src/components/AdminShell/AdminTopbar";

const { getDocs } = vi.hoisted(() => ({ getDocs: vi.fn() }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => name,
  getDocs,
}));
vi.mock("../src/firebase/firebase", () => ({ db: {} }));
vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    user: { displayName: "Operador", email: "operador@example.test" },
  }),
}));
vi.mock("../src/pages/NuevoPaciente/NuevoPaciente", () => ({
  default: () => <div>Formulario de paciente</div>,
}));
vi.mock("recharts", () => ({
  ResponsiveContainer: () => <div>Gráfico de resultados</div>,
  Area: () => null,
  AreaChart: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));
const snapshot = (rows: Record<string, unknown>[]) => ({
  docs: rows.map(({ id, ...data }) => ({ id, data: () => data })),
});
const now = new Date();
const timestamp = (date: Date) => ({ toDate: () => date });
const patients = Array.from({ length: 12 }, (_, index) => ({
  id: `p${index}`,
  nombre: `Paciente ${index}`,
  contacto: `contacto${index}@example.test`,
  dni: String(1000 + index),
  activo: index !== 1,
  createdAt: timestamp(now),
}));
const results = [
  { id: "r1", pacienteId: "p0", testId: "k10", fecha: timestamp(now) },
];
const assignments = [
  { id: "a1", pacienteId: "p0", estado: "completado" },
  { id: "a2", pacienteId: "p0", estado: "pendiente" },
  { id: "a3", pacienteId: "p2", estado: "abandono" },
];
function setupReads() {
  getDocs.mockImplementation(async (name: string) =>
    snapshot(
      name === "pacientes"
        ? patients
        : name === "resultados"
          ? results
          : assignments,
    ),
  );
}
beforeEach(() => {
  getDocs.mockReset();
  setupReads();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const renderPage = (element: React.ReactNode) =>
  render(<MemoryRouter>{element}</MemoryRouter>);

describe("administrative design backed by database records", () => {
  it("calculates completion from assignments, joins patient names, and uses the authenticated name", async () => {
    renderPage(<Dashboard />);
    await screen.findByRole("heading", { name: /Operador/ });
    const metrics = screen.getByRole("region", { name: "Resumen de métricas" });
    expect(within(metrics).getByText("33%")).toBeTruthy();
    expect(
      within(metrics).getByText("1 de 3 asignaciones completadas"),
    ).toBeTruthy();
    expect(within(metrics).getByText("11")).toBeTruthy();
    expect(screen.getAllByText("Paciente 0").length).toBe(2);
    fireEvent.click(screen.getByRole("button", { name: "1 año" }));
    expect(
      screen
        .getByRole("button", { name: "1 año" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });
  it("shows unavailable metrics instead of zeroes when the dashboard query fails", async () => {
    getDocs.mockRejectedValue(new Error("permission-denied"));
    renderPage(<Dashboard />);
    await screen.findByRole("alert");
    expect(
      screen.queryByRole("region", { name: "Resumen de métricas" }),
    ).toBeNull();
    setupReads();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await screen.findByRole("region", { name: "Resumen de métricas" });
  });
  it("paginates actual patients and filters by contact, DNI, and state", async () => {
    renderPage(<Pacientes />);
    await screen.findByRole("heading", { name: "Pacientes" });
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row").length).toBe(11);
    fireEvent.click(screen.getByRole("button", { name: "Página siguiente" }));
    expect(within(table).getAllByRole("row").length).toBe(3);
    fireEvent.change(
      screen.getByRole("textbox", { name: /Filtrar pacientes/ }),
      { target: { value: "contacto0@" } },
    );
    expect(within(table).getByText("Paciente 0")).toBeTruthy();
    expect(within(table).getAllByRole("row").length).toBe(2);
    fireEvent.change(
      screen.getByRole("textbox", { name: /Filtrar pacientes/ }),
      { target: { value: "1001" } },
    );
    expect(within(table).getByText("Paciente 1")).toBeTruthy();
    fireEvent.change(
      screen.getByRole("combobox", { name: "Filtrar por estado" }),
      { target: { value: "Activo" } },
    );
    expect(screen.getByText("Sin resultados")).toBeTruthy();
    expect(screen.getByText("Página 1 de 1")).toBeTruthy();
  });
  it("does not count abandoned assignments as evaluations that can be completed", async () => {
    renderPage(<Pacientes />);
    await screen.findByRole("heading", { name: "Pacientes" });
    const metrics = screen.getByRole("region", {
      name: "Métricas de pacientes",
    });
    const card = within(metrics).getByText(
      "Evaluaciones por completar",
    ).parentElement!;
    expect(within(card).getByText("1")).toBeTruthy();
  });
  it("shows patient load errors with retry rather than an empty table", async () => {
    getDocs.mockRejectedValue(new Error("offline"));
    renderPage(<Pacientes />);
    await screen.findByRole("alert");
    expect(screen.queryByRole("table")).toBeNull();
    setupReads();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await screen.findByRole("table");
  });
  it("opens shared search by keyboard and navigates to the matching real record", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/sesiones"]}>
        <AdminTopbar />
        <Routes>
          <Route path="/admin/paciente/:id" element={<h1>Perfil abierto</h1>} />
          <Route path="*" element={<h1>Sesiones abiertas</h1>} />
        </Routes>
      </MemoryRouter>,
    );
    const input = screen.getByRole("textbox", { name: /Buscar pacientes/ });
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: "1000" } });
    const link = await screen.findByRole("link", { name: /Paciente 0/ });
    expect(link.getAttribute("href")).toBe("/admin/paciente/p0");
    fireEvent.click(link);
    await screen.findByRole("heading", { name: "Perfil abierto" });
    await waitFor(() => expect((input as HTMLInputElement).value).toBe(""));
  });
  it("reports shared-search errors without inventing search results", async () => {
    getDocs.mockRejectedValue(new Error("permission-denied"));
    renderPage(<AdminTopbar />);
    const input = screen.getByRole("textbox", { name: /Buscar pacientes/ });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Paciente" } });
    await screen.findByRole("alert");
    expect(screen.queryByRole("link", { name: /Paciente 0/ })).toBeNull();
  });
});
