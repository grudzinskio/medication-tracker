import sequelize from '../db/sequelize';

export async function writeAuditLog(params: {
  userId: number;
  action: string;
  entityType: string;
  entityId: number | null;
  details?: string | null;
}): Promise<void> {
  try {
    await sequelize.query(
      `
      INSERT INTO Audit_Logs (UserID, Action, EntityType, EntityID, Details)
      VALUES (:userId, :action, :entityType, :entityId, :details)
      `,
      {
        replacements: {
          userId: params.userId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          details: params.details ?? null,
        },
      },
    );
  } catch (e) {
    console.error('audit log insert failed', e);
  }
}
