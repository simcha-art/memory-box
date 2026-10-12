import {
  getCurrentUser,
  loginUser,
  registerUser,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword as resetUserPassword,
  verifyEmailToken,
} from '../services/authService.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validation/schemas.js';

export async function register(request, response) {
  const input = registerSchema.parse(request.body);
  response.status(201).json(await registerUser(input));
}

export async function login(request, response) {
  const input = loginSchema.parse(request.body);
  response.json(await loginUser(input));
}

export async function verifyEmail(request, response) {
  const { token } = verifyEmailSchema.parse(request.body);
  response.json(await verifyEmailToken(token));
}

export async function resendVerification(request, response) {
  const { email } = resendVerificationSchema.parse(request.body);
  await resendVerificationEmail(email);
  response.json({ message: 'If this account is awaiting verification, a new email has been sent' });
}

export async function forgotPassword(request, response) {
  const { email } = forgotPasswordSchema.parse(request.body);
  await requestPasswordReset(email);
  response.json({ message: 'If an account exists for this email, a reset link has been sent' });
}

export async function resetPassword(request, response) {
  const { token, password } = resetPasswordSchema.parse(request.body);
  await resetUserPassword(token, password);
  response.json({ message: 'Your password has been updated. You can now sign in.' });
}

export async function me(request, response) {
  response.json({ user: await getCurrentUser(request.userId) });
}