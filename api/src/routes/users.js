import { userSchemas } from '../schemas/validation.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export default async function userRoutes(fastify, options) {
  const { dbService } = options;

  // Add authentication middleware to all user routes
  fastify.addHook('preHandler', authMiddleware);

  // GET /users/me - Get authenticated user details
  fastify.get('/users/me', async (request, reply) => {
    try {
      // request.user is populated by authMiddleware
      if (!request.user) {
        return reply.code(401).send({ error: 'Not authenticated' });
      }
      
      const user = await dbService.getUserById(request.user.id);
      reply.send(user);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch user profile' });
    }
  });

  // GET /users - List all users with optional search
  fastify.get('/users', {
    schema: userSchemas.getUsers
  }, async (request, reply) => {
    try {
      const { search } = request.query;
      const users = await dbService.getUsers(search);
      
      // Log the authenticated user making the request
      fastify.log.info({
        authenticatedUser: request.user,
        action: 'get_users',
        searchTerm: search
      });
      
      reply.send(users);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch users' });
    }
  });

  // GET /users/:id - Get specific user
  fastify.get('/users/:id', {
    schema: userSchemas.getUserById
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const user = await dbService.getUserById(parseInt(id));
      
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      reply.send(user);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to fetch user' });
    }
  });

  // POST /users - Create new user
  fastify.post('/users', {
    schema: userSchemas.createUser
  }, async (request, reply) => {
    try {
      const user = await dbService.createUser(request.body);
      reply.code(201).send(user);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === '23505') { // Unique constraint violation
        reply.code(409).send({ error: 'User with this email or username already exists' });
      } else {
        reply.code(500).send({ error: 'Failed to create user' });
      }
    }
  });

  // PUT /users/:id - Update user
  fastify.put('/users/:id', {
    schema: userSchemas.updateUser
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const user = await dbService.updateUser(parseInt(id), request.body);
      
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      reply.send(user);
    } catch (error) {
      fastify.log.error(error);
      if (error.code === '23505') { // Unique constraint violation
        reply.code(409).send({ error: 'User with this email or username already exists' });
      } else {
        reply.code(500).send({ error: 'Failed to update user' });
      }
    }
  });

  // DELETE /users/:id - Delete user
  fastify.delete('/users/:id', {
    schema: userSchemas.deleteUser
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const user = await dbService.deleteUser(parseInt(id));
      
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }
      
      reply.send({ message: 'User deleted successfully', user });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Failed to delete user' });
    }
  });
}
