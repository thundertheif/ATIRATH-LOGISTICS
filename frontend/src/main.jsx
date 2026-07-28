import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/GlobalTextFix.css';
import { AuthProvider } from './context/AuthContext'; // ✅ Import added
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider> {/* ✅ App wrapped here */}
      <App />
    </AuthProvider>
  </React.StrictMode>
);