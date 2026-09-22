import {
  listEligibleTaskAssigneePersons,
  searchEligibleTaskAssigneePersons,
} from "./eligible-task-assignee-persons";
import { splitTaskResponsibleDisplayName } from "./task-assignee-display";

export type TaskAssigneeOption = {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  displayName: string;
};

export async function searchEligibleTaskAssignees(
  tenantId: string,
  search: string,
  limit?: number,
): Promise<TaskAssigneeOption[]> {
  return searchEligibleTaskAssigneePersons(tenantId, search, limit);
}

export async function listEligibleTaskAssignees(
  tenantId: string,
): Promise<TaskAssigneeOption[]> {
  return listEligibleTaskAssigneePersons(tenantId);
}

export { splitTaskResponsibleDisplayName };
