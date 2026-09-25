#!/usr/bin/env tsx
import { runLegacyIconInventory } from "@/lib/icons/legacy-icon-inventory";

const report = runLegacyIconInventory();
console.log(JSON.stringify(report, null, 2));
