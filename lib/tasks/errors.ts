export class TaskNotFoundError extends Error {
  constructor(taskId?: string) {
    super(taskId ? `Task not found: ${taskId}` : "Task not found");
    this.name = "TaskNotFoundError";
  }
}

export class TaskForbiddenError extends Error {
  constructor(message = "Not authorized for this task") {
    super(message);
    this.name = "TaskForbiddenError";
  }
}

export class TaskValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskValidationError";
  }
}
