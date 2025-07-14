import { RouterProvider } from 'react-router-dom';
import { UserAuthProvider } from './auth/UserAuthContext';
import router from './routes';

import './App.css';

const App = () => {
  return (
    // Once you have the backend logic for logging in and setting up accounts finished, figure out how to use routing to have the user start on the log in page and then, after signing, navigate to the homepage.
    // Bear in mind that if the user is on the login page and doesn't enter any credentials, they should not be redirected if the press the button to go to the home page.
    // Same applies for the sign up page (which redirects the user to the login page after a successful sign up).
    <UserAuthProvider>
      <RouterProvider router={router} />
    </UserAuthProvider>
  );
}

export default App;