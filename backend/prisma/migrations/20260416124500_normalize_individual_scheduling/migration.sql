UPDATE "event_types"
SET "schedulingType" = 'INDIVIDUAL'
WHERE "schedulingType" = 'ONE_ON_ONE';

ALTER TABLE "event_types"
ALTER COLUMN "schedulingType" SET DEFAULT 'INDIVIDUAL';
