# /supabase/seed

Seed scripts for local development and staging environments.

## Planned scripts
- `01_organisations.sql` — Jaxtina English Centre + Hanoi/HCMC branches
- `02_users.sql` — demo learner, teacher, and admin accounts
- `03_courses.sql` — sample IELTS courses with modules and lessons
- `04_classes.sql` — demo class cohorts with enrolments

## Usage
```bash
supabase db reset   # applies migrations then runs supabase/seed.sql if present
```

Never import seed data into production code paths.
