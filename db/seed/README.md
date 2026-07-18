# Database Seed Scripts

Run in this order after all migrations:

```bash
psql $MATHPILOT_DB_URL -f db/seed/topics.sql
psql $MATHPILOT_DB_URL -f db/seed/subtopics.sql
psql $MATHPILOT_DB_URL -f db/seed/techniques.sql
psql $MATHPILOT_DB_URL -f db/seed/competitions.sql
```

Or all at once:

```bash
for f in topics subtopics techniques competitions; do
  psql $MATHPILOT_DB_URL -f db/seed/$f.sql
done
```
