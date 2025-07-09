import Home from './pages/Home';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import './App.css';

const App: React.FunctionComponent = () => {
  return (
    // Once you have the backend logic for logging in and setting up accounts finished, figure out how to use routing to have the user start on the log in page and then, after signing, navigate to the homepage.
    // Bear in mind that if the user is on the login page and doesn't enter any credentials, they should not be redirected if the press the button to go to the home page.
    // Same applies for the sign up page (which redirects the user to the login page after a successful sign up).
    <div>
      {/* <Home /> (Commenting this out for now until login page is finished. */}
      <Login /> {/* (Commenting this out for now until sign-up page is finished. */}
      {/* <SignUp /> */}
    </div>
  );
}

export default App;