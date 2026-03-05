import { Hono } from "hono";
import { auth } from "../auth";
import { prisma } from "../prisma";

type Variables = {
  user: typeof auth.$Infer.Session.user | null;
  session: typeof auth.$Infer.Session.session | null;
};

const tasksRouter = new Hono<{ Variables: Variables }>();

// GET /api/tasks - list all tasks for the current user
tasksRouter.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const tasks = await prisma.task.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return c.json({ data: tasks });
});

// POST /api/tasks - create a task
tasksRouter.post("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const body = await c.req.json();
  const task = await prisma.task.create({
    data: {
      id: body.id,
      title: body.title,
      description: body.description ?? null,
      dueDate: body.dueDate,
      importance: body.importance ?? 3,
      effort: body.effort ?? 2,
      effortMode: body.effortMode ?? "manual",
      parentId: body.parentId ?? null,
      completed: body.completed ?? false,
      showSubtasks: body.showSubtasks ?? false,
      userId: user.id,
    },
  });

  return c.json({ data: task });
});

// PATCH /api/tasks/:id - update a task
tasksRouter.patch("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const id = c.req.param("id");
  const body = await c.req.json();

  const existing = await prisma.task.findFirst({ where: { id, userId: user.id } });
  if (!existing) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate }),
      ...(body.importance !== undefined && { importance: body.importance }),
      ...(body.effort !== undefined && { effort: body.effort }),
      ...(body.effortMode !== undefined && { effortMode: body.effortMode }),
      ...(body.parentId !== undefined && { parentId: body.parentId }),
      ...(body.completed !== undefined && { completed: body.completed }),
      ...(body.showSubtasks !== undefined && { showSubtasks: body.showSubtasks }),
    },
  });

  return c.json({ data: task });
});

// DELETE /api/tasks/:id - delete a task and its children
tasksRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const id = c.req.param("id");
  const existing = await prisma.task.findFirst({ where: { id, userId: user.id } });
  if (!existing) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

  // Delete children first
  await prisma.task.deleteMany({ where: { parentId: id, userId: user.id } });
  await prisma.task.delete({ where: { id } });

  return c.body(null, 204);
});

export { tasksRouter };
