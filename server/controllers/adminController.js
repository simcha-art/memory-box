import { adminUserUpdateSchema } from '../validation/schemas.js';
import { deleteUser, listUsers, updateUser } from '../services/adminService.js';

export async function list(_request, response) {
  response.json({ users: await listUsers() });
}

export async function update(request, response) {
  const changes = adminUserUpdateSchema.parse(request.body);
  response.json({ user: await updateUser(request.userId, request.params.id, changes) });
}

export async function remove(request, response) {
  await deleteUser(request.userId, request.params.id);
  response.status(204).end();
}