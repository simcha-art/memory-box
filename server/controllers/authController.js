import { getCurrentUser, loginUser, registerUser } from '../services/authService.js';
import { loginSchema, registerSchema } from '../validation/schemas.js';

export async function register(request, response) {
  const input = registerSchema.parse(request.body);
  response.status(201).json(await registerUser(input));
}

export async function login(request, response) {
  const input = loginSchema.parse(request.body);
  response.json(await loginUser(input));
}

export async function me(request, response) {
  response.json({ user: await getCurrentUser(request.userId) });
}
