import { createBrowserRouter } from "react-router-dom";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Home from "./pages/Home";
import StyleBoard from "./pages/StyleBoard";
import Post from "./pages/Post";
import Profile from "./pages/Profile";
import Chat from "./pages/Chat";
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
        path: "/styleboard",
        element: <StyleBoard />,
        errorElement: <Error />
      },
      {
        path: "/post",
        element: <Post />,
        errorElement: <Error />
      },
      {
        path: "/profile",
        element: <Profile />,
        errorElement: <Error />
      },
      // The :username part is a URL parameter, so /profile/alice and /profile/bob both render Profile, which reads the name back out with useParams(). Plain /profile (above) stays as your own profile.
      {
        path: "/profile/:username",
        element: <Profile />,
        errorElement: <Error />
      },
      {
        path: "/chat",
        element: <Chat />,
        errorElement: <Error />
      },
      // Same URL parameter idea as /profile/:username. :username is who the open chat is with, so the Message button on a profile (and each row in the chat list) can link straight to it.
      {
        path: "/chat/:username",
        element: <Chat />,
        errorElement: <Error />
      },
      {
        path: "/settings",
        element: <Settings />,
        errorElement: <Error />
      },
      // Same URL parameter idea as /profile/:username. :section picks which part of the settings page is open (/settings/edit-profile, for instance).
      {
        path: "/settings/:section",
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
  // Catch-all: "*" matches any URL that none of the routes above do, so a mistyped or outdated link shows the 404 version of the Error page instead of React Router's default error screen.
  // It sits outside ProtectedRoutes so signed-out visitors get the 404 too, rather than being sent to the login page for a page that doesn't exist.
  {
    path: "*",
    element: <Error />
  },
]);

export default router;