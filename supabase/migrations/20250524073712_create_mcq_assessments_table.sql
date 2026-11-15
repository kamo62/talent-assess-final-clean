create table
  public.mcq_assessments (
    id uuid not null default gen_random_uuid (),
    created_at timestamp with time zone not null default now(),
    title text not null,
    description text null,
    difficulty text null,
    organization_id uuid null,
    metadata jsonb null,
    questions jsonb null,
    constraint mcq_assessments_pkey primary key (id),
    constraint mcq_assessments_organization_id_fkey foreign key (organization_id) references organizations (id) on delete cascade
  ) tablespace pg_default;
