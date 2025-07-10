import { createBrowserRouter } from "react-router-dom";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Home from "./pages/Home";
import Error from "./pages/Error";

// Setting up the router for the application. It will contain the routes/or paths for different pages (home, login, sign-up, etc.).
export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
    errorElement: <Error />
  },
  {
    path: "/signup",
    element: <SignUp />,
    errorElement: <Error />
  },
  { 
    path: "/home",
    element: <Home />,
    errorElement: <Error />
  }
]);

export default router;