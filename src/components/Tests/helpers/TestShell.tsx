import { useTestEngine } from "./useTestEngine";

export function TestShell({
  userId,
  testId,
  timeLimitMs,
  onFinish,
  children,
}: any) {
  const engine = useTestEngine({
    userId,
    testId,
    timeLimitMs,
    onFinish,
  });

  return (
    <div>
      {!engine.started ? (
        <button onClick={engine.start}>Comenzar test</button>
      ) : (
        <>
          {children(engine.update)}
          {engine.CameraComponent && <engine.CameraComponent />}
          
          
          <button onClick={() => engine.submit({})}>
            Finalizar
          </button>
        </>
      )}
    </div>
  );
}