// @ts-ignore Testing Library is supplied by the test runner; its declarations may not be available to this editor.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
// @ts-ignore Vitest is supplied by the test runner; its declarations may not be available to this editor.
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import NuevoPaciente from '../src/pages/NuevoPaciente/NuevoPaciente';
import { crearPaciente } from '../src/firebase/pacientes';

vi.mock('../src/firebase/pacientes', () => ({ crearPaciente: vi.fn(), mensajeErrorPaciente: () => 'No se pudo completar' }));
beforeEach(() => {
  vi.mocked(crearPaciente).mockReset();
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  vi.mocked(crearPaciente).mockResolvedValue({ data: { pacienteId: 'p1', dni: '12345678', password: '345678' } });
});
afterEach(cleanup);

it('sends the selected tests with the form and closes only after successful creation', async () => {
  const close = vi.fn();
  const created = vi.fn();
  render(<MemoryRouter><NuevoPaciente onClose={close} onPacienteCreado={created} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Paciente ficticio' } });
  fireEvent.change(screen.getByLabelText('DNI'), { target: { value: '12.345.678' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'paciente@example.com' } });
  fireEvent.change(screen.getByLabelText('Fecha de acceso'), { target: { value: '2099-01-01' } });
  fireEvent.click(screen.getByRole('button', { name: /^K-10/, pressed: false }));
  fireEvent.click(screen.getByRole('button', { name: /^Raven/, pressed: false }));
  fireEvent.click(screen.getByRole('button', { name: 'Crear paciente' }));
  await waitFor(() => expect(created).toHaveBeenCalledTimes(1));
  expect(crearPaciente).toHaveBeenCalledWith(expect.objectContaining({ dni: '12345678', contacto: 'paciente@example.com', testsSeleccionados: ['k10', 'raven'] }));
  expect(close).toHaveBeenCalledTimes(1);
});

it('keeps the modal open and preserves selections when the server rejects creation', async () => {
  vi.mocked(crearPaciente).mockRejectedValueOnce(new Error('offline'));
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const close = vi.fn();
  render(<MemoryRouter><NuevoPaciente onClose={close} /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Paciente ficticio' } });
  fireEvent.change(screen.getByLabelText('DNI'), { target: { value: '12345678' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'paciente@example.com' } });
  fireEvent.change(screen.getByLabelText('Fecha de acceso'), { target: { value: '2099-01-01' } });
  fireEvent.click(screen.getByRole('button', { name: /^K-10/, pressed: false }));
  fireEvent.click(screen.getByRole('button', { name: 'Crear paciente' }));
  await waitFor(() => expect(window.alert).toHaveBeenCalledWith('No se pudo completar'));
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: /^K-10/, pressed: true })).toBeTruthy();
});
