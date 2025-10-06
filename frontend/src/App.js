import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

// Context
import { AuthProvider } from './contexts/AuthContext';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import Prediction from './pages/Prediction';
import Analytics from './pages/Analytics';
import History from './pages/History';
import Settings from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <ProtectedRoute>
            <Navbar />
            <div className="main-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/predict" element={<Prediction />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/history" element={<History />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </div>
          </ProtectedRoute>
          <ToastContainer 
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={true}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

