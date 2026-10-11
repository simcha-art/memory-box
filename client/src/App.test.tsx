import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from './App';
import { AuthProvider } from './features/auth/AuthContext';

beforeEach(() => {
  window.localStorage.clear();
});

describe('App', () => {
  it('renders the sign-in screen by default', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>,
    );

    expect((await screen.findAllByText(/sign in/i)).length).toBeGreaterThan(0);
  });
});
