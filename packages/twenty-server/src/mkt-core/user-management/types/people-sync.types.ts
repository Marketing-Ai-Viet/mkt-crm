import { User } from 'src/engine/core-modules/user/user.entity';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';

export interface PersonWithUser {
  person: PersonWorkspaceEntity;
  user: User;
}

export interface SyncStats {
  successCount: number;
  failureCount: number;
}

export interface CategorizationResult {
  peopleWithoutUsers: PersonWorkspaceEntity[];
  peopleWithUsers: PersonWithUser[];
}
