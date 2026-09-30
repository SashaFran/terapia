import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import PatientSessionNotice from '../src/components/PatientSessionNotice';

const state = vi.hoisted(() => ({ value: { active: false, testId: null, awayUntil: null, message: '', connectionLost: false }, listeners: new Set<() => void>(), logout: vi.fn(), beacon: vi.fn() }));
vi.mock('../src/utils/patientAccess', () => ({
  accessStore: { snapshot: () => state.value, subscribe: (fn: () => void) => { state.listeners.add(fn); return () => state.listeners.delete(fn); } },
  closeBeacon: state.beacon, logoutPatient: () => { state.logout(); return Promise.resolve(); },
}));
function Navigation() {
  const navigate = useNavigate();
  return <><button onClick={() => navigate('/app/dashboard')}>Entrar</button><button onClick={() => navigate('/login')}>Salir</button></>;
}
afterEach(cleanup);
it('does not close a login before navigation but closes an actual exit from the patient area', () => {
  render(<MemoryRouter initialEntries={['/login']}><PatientSessionNotice /><Navigation /></MemoryRouter>);
  act(() => { state.value = { ...state.value, active: true }; state.listeners.forEach(fn => fn()); });
  expect(state.logout).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Entrar'));
  expect(state.logout).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Salir'));
  expect(state.logout).toHaveBeenCalledTimes(1);
});
