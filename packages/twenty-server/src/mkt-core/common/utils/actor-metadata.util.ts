import {
  ActorMetadata,
  FieldActorSource,
} from 'src/engine/metadata-modules/field-metadata/composite-types/actor.composite-type';

/**
 * Utility class for creating ActorMetadata objects
 * Used to break type chains by storing creator info as JSONB instead of relations
 */
export class ActorMetadataUtil {
  /**
   * Create ActorMetadata from workspace member ID
   */
  static fromWorkspaceMemberId(
    workspaceMemberId: string | null,
    name = 'System',
  ): ActorMetadata {
    return {
      source: FieldActorSource.MANUAL,
      workspaceMemberId: workspaceMemberId ?? null,
      name,
      context: {},
    };
  }

  /**
   * Create ActorMetadata for system operations
   */
  static system(name = 'System'): ActorMetadata {
    return {
      source: FieldActorSource.SYSTEM,
      workspaceMemberId: null,
      name,
      context: {},
    };
  }

  /**
   * Create ActorMetadata from API source
   */
  static fromApi(
    workspaceMemberId: string | null,
    name = 'API',
  ): ActorMetadata {
    return {
      source: FieldActorSource.API,
      workspaceMemberId: workspaceMemberId ?? null,
      name,
      context: {},
    };
  }

  /**
   * Create ActorMetadata for workflow/automation
   */
  static fromWorkflow(
    workspaceMemberId: string | null,
    workflowName = 'Workflow',
  ): ActorMetadata {
    return {
      source: FieldActorSource.WORKFLOW,
      workspaceMemberId: workspaceMemberId ?? null,
      name: workflowName,
      context: {},
    };
  }

  /**
   * Create ActorMetadata from existing order's createdById
   */
  static fromOrderCreator(createdById: string | null): ActorMetadata {
    return ActorMetadataUtil.fromWorkspaceMemberId(
      createdById,
      'Order Creator',
    );
  }

  /**
   * Copy ActorMetadata from another entity (if it's ActorMetadata type)
   */
  static copy(source: ActorMetadata | null | undefined): ActorMetadata {
    if (!source) {
      return ActorMetadataUtil.system();
    }

    return {
      source: source.source ?? FieldActorSource.MANUAL,
      workspaceMemberId: source.workspaceMemberId ?? null,
      name: source.name ?? 'System',
      context: source.context ?? {},
    };
  }
}
