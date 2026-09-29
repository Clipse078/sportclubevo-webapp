-- SCE-SELECTOR-02R5: Requirement audience composition (AND/OR/exclude) while draft.
ALTER TABLE "Requirement" ADD COLUMN "draftAudienceCompositionJson" JSONB;
