import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/mockup.css';
import './styles/responsive-fix.css';

// React 18 createRoot replaces the mockup's old ReactDOM.render(<App/>, ...) call.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
