import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../src/pages/auth/LoginPage';
import RegisterPage from '../src/pages/auth/RegisterPage';
import { AuthProvider } from '../src/context/AuthContext';

// Mock auth API
vi.mock('../src/api/auth', () => ({
  authApi: {
    getMe: vi.fn().mockRejectedValue(new Error('Unauthenticated')),
    login: vi.fn().mockResolvedValue({ data: { id: 1, email: 'test@example.com', role: 'viewer' } }),
    register: vi.fn().mockResolvedValue({ data: { id: 2, email: 'new@example.com', role: 'viewer' } }),
  },
}));

describe('Authentication Pages', () => {
  it('renders LoginPage with all necessary inputs and demo buttons', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Sign in to TrustVault')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••••••')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();

    // Verify Demo autofill buttons exist
    expect(screen.getByText(/🛡️ Admin/i)).toBeInTheDocument();
    expect(screen.getByText(/🔑 Owner/i)).toBeInTheDocument();
    expect(screen.getByText(/👁️ Viewer/i)).toBeInTheDocument();
  });

  it('populates credentials when Admin demo button is clicked', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </BrowserRouter>
    );

    const adminBtn = screen.getByText(/🛡️ Admin/i);
    fireEvent.click(adminBtn);

    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput.value).toBe('admin@trustvault.com');
  });

  it('renders RegisterPage and shows role security note', () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <RegisterPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Create your Account')).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email address/i)).toBeInTheDocument();
    expect(screen.getByText('Strict Role Policy')).toBeInTheDocument();
    expect(screen.getByText(/Public registration assigns the/i)).toBeInTheDocument();
  });
});
