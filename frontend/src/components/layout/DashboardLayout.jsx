import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';

export default function DashboardLayout({ children }) {
  const { user } = useAuth();
  const role = user?.role || 'viewer';

  return (
    <div className={`dashboard-layout role-theme-${role}`} data-theme={role}>
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container">
          {children}
        </main>
      </div>
    </div>
  );
}
