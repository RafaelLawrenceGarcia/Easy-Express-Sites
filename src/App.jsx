import { useState, useEffect } from 'react';
import EasyExpressSite from './easy-express-website';
import ResetPasswordPage from './Resetpasswordpage';

export default function App() {
  const [route, setRoute] = useState(window.location.hash);

  useEffect(() => {
    const handleHash = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Show reset password page when URL is /#/reset-password
  if (route === "#/reset-password") {
    return <ResetPasswordPage />;
  }

  return <EasyExpressSite />;
}