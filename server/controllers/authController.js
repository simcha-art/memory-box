import {
  getCurrentUser,
  loginUser,
  registerUser,
  resendVerificationEmail,
  verifyEmailToken,
} from '../services/authService.js';
import {
  loginSchema,
  registerSchema,
  resendVerificationSchema,
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

export async function me(request, response) {
  response.json({ user: await getCurrentUser(request.userId) });
}