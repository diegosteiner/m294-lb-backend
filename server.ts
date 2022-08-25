import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import Fastify, { FastifyRequest } from 'fastify'
import { readFileSync } from 'fs';
import { addTaskSchema, loginSchema, updateTaskSchema } from './schemas';
import { getTaskById, getAllTasks, deleteTaskById, addTask, updateTask } from './task_service';

const fastify = Fastify({
	logger: true
})

declare module "fastify" {
	interface Session {
		email?: string
	}
}

fastify.register(fastifyCookie);
fastify.register(fastifySession, {
	cookieName: 'm294-session',
	secret: 'this is just an example, not a real secret',
	cookie: { secure: false, httpOnly: true },
})

fastify.get('/', async (request, response) => {
	response.type('text/html').send(readFileSync('index.html'))
})

fastify.get('/tasks', async (request, response) => {
	response.send(getAllTasks())
})

fastify.get('/task/:taskId', async (request: FastifyRequest<{ Params: { taskId: string } }>, response) => {
	const task = getTaskById(parseId(request.params.taskId))
	if (!task) return response.code(404).send({ statusCode: 404, error: "Not found" })

	response.send(task)
})

fastify.delete('/task/:taskId', async (request: FastifyRequest<{ Params: { taskId: string } }>, response) => {
	const taskToDelete = getTaskById(parseId(request.params.taskId))
	if (!taskToDelete) return response.code(404).send({ statusCode: 404, error: "Not found" })

	deleteTaskById(taskToDelete.id)
	response.send(taskToDelete)
})

fastify.post('/tasks', { schema: addTaskSchema }, async (request: FastifyRequest<{ Body: { title: string, completed?: boolean } }>, response) => {
	try {
		const task = addTask({ title: request.body.title, completed: request.body.completed })
		response.send(task)
	} catch (e) {
		return response.code(400).send(error(400, (e as Error).message))
	}
})

fastify.put('/tasks', { schema: updateTaskSchema }, async (request: FastifyRequest<{ Body: { id: string, title: string, completed?: boolean } }>, response) => {
	const { id, title, completed } = request.body

	try {
		const task = updateTask({ id: parseId(id), title, completed })
		if (task) return response.send(task)

		return response.code(404).send({ statusCode: 404, error: "Not found" })
	} catch (e) {
		return response.code(400).send(error(400, (e as Error).message))
	}
})

/* With Cookie auth */

fastify.get('/auth/cookie/tasks', async (request, response) => {
	if (!request.session.email) return response.code(401).send(error(401, 'authenicate your session via /auth/cookie/login'))
	response.send(getAllTasks())
})

fastify.get('/auth/cookie/task/:taskId', async (request: FastifyRequest<{ Params: { taskId: string } }>, response) => {
	if (!request.session.email) return response.code(401).send(error(401, 'authenicate your session via /auth/cookie/login'))
	const task = getTaskById(parseId(request.params.taskId))
	if (!task) return response.code(404).send({ statusCode: 404, error: "Not found" })

	response.send(task)
})

fastify.delete('/auth/cookie/task/:taskId', async (request: FastifyRequest<{ Params: { taskId: string } }>, response) => {
	if (!request.session.email) return response.code(401).send(error(401, 'authenicate your session via /auth/cookie/login'))
	const taskToDelete = getTaskById(parseId(request.params.taskId))
	if (!taskToDelete) return response.code(404).send({ statusCode: 404, error: "Not found" })

	deleteTaskById(taskToDelete.id)
	response.send(taskToDelete)
})

fastify.post('/auth/cookie/tasks', { schema: addTaskSchema }, async (request: FastifyRequest<{ Body: { title: string, completed?: boolean } }>, response) => {
	if (!request.session.email) return response.code(401).send(error(401, 'authenicate your session via /auth/cookie/login'))
	try {
		const task = addTask({ title: request.body.title, completed: request.body.completed })
		response.send(task)
	} catch (e) {
		return response.code(400).send(error(400, (e as Error).message))
	}
})

fastify.put('/auth/cookie/tasks', { schema: updateTaskSchema }, async (request: FastifyRequest<{ Body: { id: string, title: string, completed?: boolean } }>, response) => {
	if (!request.session.email) return response.code(401).send(error(401, 'authenicate your session via /auth/cookie/login'))
	const { id, title, completed } = request.body

	try {
		const task = updateTask({ id: parseId(id), title, completed })
		if (task) return response.send(task)

		return response.code(404).send({ statusCode: 404, error: "Not found" })
	} catch (e) {
		return response.code(400).send(error(400, (e as Error).message))
	}
})

fastify.get('/auth/cookie/status', async (request, response) => {
	if (!request.session.email) {
		response.code(401).send()
		return
	}
	response.send({ email: request.session.email })
})

fastify.post('/auth/cookie/login', { schema: loginSchema }, async (request: FastifyRequest<{ Body: { email: string, password: string } }>, response) => {
	const { email, password } = request.body

	if (password === 'm294') {
		request.session.email = email
		return response.send('ok')
	} else {
		return response.code(400).send({ statusCode: 400, message: 'invalid credentials, use «m294» as password', })
	}
})

fastify.post('/auth/cookie/logout', (request, reply) => {
	request.session.destroy()
	reply.send('ok')
})

fastify.listen({ port: 3000 }, function (error) {
	if (error) {
		fastify.log.error(error)
		process.exit(1)
	}
})

function parseId(id: any): number | undefined {
	return parseInt(new String(id).toString())
}

function error(code?: number, message?: string) {
	code = code ?? 400
	return {
		statusCode: code,
		error: { '401': 'Unauthorized', '403': 'Forbidden', '404': 'Not Found' }[code] ?? 'Bad Request',
		message
	}
}
