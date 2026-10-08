import { useState, useEffect } from 'react';
import TrainingPortal from './TrainingPortal';
import ResetPasswordPage from './ResetPasswordPage';
import ResetConfirmPage from './ResetConfirmPage';

export default function App() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const handleHash = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  if (route === "#/reset-password") return <ResetPasswordPage />;
  if (route.startsWith("#/reset-confirm")) return <ResetConfirmPage />;

  return <TrainingPortal />;
}
