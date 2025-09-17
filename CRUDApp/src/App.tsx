import { RouterProvider } from 'react-router-dom';
import { UserAuthProvider } from './auth/UserAuthContext';
import router from './routes';

import './App.css';

const App = () => {
  return (
    <UserAuthProvider>
      <RouterProvider router={router} />
    </UserAuthProvider>
  );
}

export default App;