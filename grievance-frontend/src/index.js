import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 🛡️ Global background scroll lock across all modals in the application
if (typeof document !== 'undefined') {
  const updateModalScrollLock = () => {
    const hasModal = !!document.querySelector(
      '[class*="modal-overlay"], [class*="popup-overlay"], .reg-users-modal-overlay, .staff-modal-overlay, .dept-modal-overlay, .student-modal-overlay, .export-modal-overlay, .g-details-modal-overlay, .transfer-modal-overlay, .assign-modal-overlay, .chat-modal-overlay'
    );
    if (hasModal) {
      if (!document.body.classList.contains('modal-open')) {
        document.body.classList.add('modal-open');
        document.documentElement.classList.add('modal-open');
      }
    } else {
      if (document.body.classList.contains('modal-open')) {
        document.body.classList.remove('modal-open');
        document.documentElement.classList.remove('modal-open');
      }
    }
  };

  const modalObserver = new MutationObserver(updateModalScrollLock);
  modalObserver.observe(document.body, { childList: true, subtree: true });

  // Prevent background touch drag if user swipes directly on overlay backdrop
  document.addEventListener('touchmove', (e) => {
    if (document.body.classList.contains('modal-open')) {
      const isInsideScrollableModal = e.target.closest(
        '.reg-users-modal-box, .staff-modal-card, .dept-modal-card, .student-modal-card, .export-modal-container, .g-details-modal-card, .transfer-modal-card, .assign-modal, .chat-modal, [class*="modal-box"], [class*="modal-card"], [class*="modal-container"], form'
      );
      if (!isInsideScrollableModal) {
        e.preventDefault();
      }
    }
  }, { passive: false });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
