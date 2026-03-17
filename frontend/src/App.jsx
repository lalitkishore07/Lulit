import { Navigate, Route, Routes } from "react-router-dom";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import FeedPage from "./pages/FeedPage";
import CreatePostPage from "./pages/CreatePostPage";
import ProfilePage from "./pages/ProfilePage";
import DaoDashboardPage from "./pages/DaoDashboardPage";
import DaoCreateProposalPage from "./pages/DaoCreateProposalPage";
import DaoProposalDetailPage from "./pages/DaoProposalDetailPage";
import SettingsPage from "./pages/SettingsPage";
import OAuthCallbackPage from "./pages/OAuthCallbackPage";
import { useAuth } from "./hooks/useAuth";

function ProtectedRoute({ children }) {
  const { accessToken } = useAuth();
  return accessToken ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/feed" replace />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/feed"
        element={
          <ProtectedRoute>
            <FeedPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-post"
        element={
          <ProtectedRoute>
            <CreatePostPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:username"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dao"
        element={
          <ProtectedRoute>
            <DaoDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dao/create"
        element={
          <ProtectedRoute>
            <DaoCreateProposalPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dao/proposal/:id"
        element={
          <ProtectedRoute>
            <DaoProposalDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
