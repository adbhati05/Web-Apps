import { createBrowserRouter } from "react-router-dom";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Home from "./pages/Home";
import StyleBoard from "./pages/StyleBoard";
import Saved from "./pages/Saved";
import Post from "./pages/Post";
import Error from "./pages/Error";
import Settings from "./pages/Settings";
import ProtectedRoutes from "./auth/ProtectedRoutes";

// Setting up the router for the application. It will contain the routes/or paths for different pages (home, login, sign-up, etc.).
// Here I've set up an object in which the main element is the ProtectedRoutes component and all of its children are the routes to pages that will be behind the authentication (home page, style board, etc.).
export const router = createBrowserRouter([
  {
    element: <ProtectedRoutes />,
    children: [
      {
        path: "/",
        element: <Home />,
        errorElement: <Error />
      },
      {
        path: "/post",
        element: <Post />,
        errorElement: <Error />
      },
      {
        path: "/styleboard",
        element: <StyleBoard />,
        errorElement: <Error />
      },
      {
        path: "/saved",
        element: <Saved />,
        errorElement: <Error />
      },
      {
        path: "/settings",
        element: <Settings />,
        errorElement: <Error />
      }
    ]
  },
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
]);

export default router;