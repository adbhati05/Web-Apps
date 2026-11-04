import { RouterProvider } from 'react-router-dom';
import { UserAuthProvider } from './auth/UserAuthContext';
import { AlertProvider } from './alerts/AlertContext';
import router from './routes';

import './App.css';

const App = () => {
  return (
    // AlertProvider sits outermost so every part of the app (including the auth context and the login/sign-up pages) can show alerts.
    <AlertProvider>
      <UserAuthProvider>
        <RouterProvider router={router} />
      </UserAuthProvider>
    </AlertProvider>
  );
}

export default App;