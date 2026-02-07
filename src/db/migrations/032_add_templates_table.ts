import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('templates')
    .addColumn('id', 'text', (col) => col.primaryKey())
    .addColumn('title', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('icon', 'text')
    .addColumn('facilitation_prompt', 'text')
    .addColumn('default_session_name', 'text')
    .addColumn('created_by', 'text', (col) =>
      col.references('users.id').onDelete('set null'),
    )
    .addColumn('workspace_id', 'text', (col) =>
      col.references('workspaces.id').onDelete('set null'),
    )
    .addColumn('is_public', 'boolean', (col) =>
      col.notNull().defaultTo(true),
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute();

  // Add indexes
  await db.schema
    .createIndex('templates_workspace_id_idx')
    .on('templates')
    .column('workspace_id')
    .execute();

  await db.schema
    .createIndex('templates_created_by_idx')
    .on('templates')
    .column('created_by')
    .execute();

  await db.schema
    .createIndex('templates_is_public_idx')
    .on('templates')
    .column('is_public')
    .where('is_public', '=', true)
    .execute();

  // Auto-update updated_at trigger
  await sql`
    CREATE OR REPLACE FUNCTION update_templates_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER templates_updated_at_trigger
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_templates_updated_at();
  `.execute(db);

  // Seed with existing templates from templates.json
  await db
    .insertInto('templates')
    .values([
      {
        id: 'theory-of-change',
        title: 'Theory of Change',
        description:
          'Facilitate a structured session to define the Theory of Change by addressing key elements of the process.',
        icon: 'lightbulb',
        facilitation_prompt: null,
        default_session_name: null,
        created_by: null,
        workspace_id: null,
        is_public: true,
      },
      {
        id: 'retrospective',
        title: 'Retrospective',
        description:
          'Review past sprint performance and identify actionable improvements for the team\'s future work',
        icon: 'history',
        facilitation_prompt: null,
        default_session_name: null,
        created_by: null,
        workspace_id: null,
        is_public: true,
      },
      {
        id: 'swot-analysis',
        title: 'SWOT analysis',
        description:
          'Analyze organizational Strengths, Weaknesses, Opportunities, and Threats to inform strategic planning',
        icon: 'grid-2x2',
        facilitation_prompt: null,
        default_session_name: null,
        created_by: null,
        workspace_id: null,
        is_public: true,
      },
      {
        id: 'okrs-planning',
        title: 'OKRs planning',
        description:
          'Create aligned Objectives and Key Results to drive measurable progress towards strategic goals',
        icon: 'target',
        facilitation_prompt: null,
        default_session_name: null,
        created_by: null,
        workspace_id: null,
        is_public: true,
      },
      {
        id: 'community-policy-proposal',
        title: 'Community Policy Proposal Generation',
        description:
          'Generate and prioritize community policy proposals to address specific needs and opportunities.',
        icon: 'leaf',
        facilitation_prompt: null,
        default_session_name: null,
        created_by: null,
        workspace_id: null,
        is_public: true,
      },
      {
        id: 'brainstorming',
        title: 'Brainstorming',
        description:
          'Generate creative ideas and solutions through collaborative, unconstrained thinking',
        icon: 'sparkles',
        facilitation_prompt: null,
        default_session_name: null,
        created_by: null,
        workspace_id: null,
        is_public: true,
      },
      {
        id: 'weekly-checkins',
        title: 'Weekly Team Check-ins (Pulse Checks)',
        description:
          'Monitor team health, progress, and alignment through regular structured check-ins',
        icon: 'activity-square',
        facilitation_prompt: null,
        default_session_name: null,
        created_by: null,
        workspace_id: null,
        is_public: true,
      },
      {
        id: 'action-planning',
        title: 'Action Planning',
        description:
          'Transform decisions into detailed, actionable implementation plans with clear ownership',
        icon: 'list-checks',
        facilitation_prompt: null,
        default_session_name: null,
        created_by: null,
        workspace_id: null,
        is_public: true,
      },
      {
        id: 'risk-assessment',
        title: 'Risk Assessment',
        description:
          'Systematically identify, evaluate, and plan mitigation strategies for potential risks',
        icon: 'shield-alert',
        facilitation_prompt: null,
        default_session_name: null,
        created_by: null,
        workspace_id: null,
        is_public: true,
      },
    ])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    DROP TRIGGER IF EXISTS templates_updated_at_trigger ON templates;
    DROP FUNCTION IF EXISTS update_templates_updated_at();
  `.execute(db);

  await db.schema.dropTable('templates').execute();
}
