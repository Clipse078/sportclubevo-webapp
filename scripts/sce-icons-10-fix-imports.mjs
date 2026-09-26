#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const IMPORT =
  'import { ProductDomainSceIcon } from "@/components/icons/ProductDomainSceIcon";\n';

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".tsx") && readFileSync(p, "utf8").includes("ProductDomainSceIcon")) out.push(p);
  }
  return out;
}

const files = walk(process.cwd());

let n = 0;
for (const file of files) {
  if (file.endsWith("ProductDomainSceIcon.tsx")) continue;
  let src = readFileSync(file, "utf8");
  if (src.includes('from "@/components/icons/ProductDomainSceIcon"')) continue;
  const nl = src.indexOf("\n");
  src = src.slice(0, nl + 1) + IMPORT + src.slice(nl + 1);
  writeFileSync(file, src);
  n++;
}
console.log(`Added imports to ${n} files`);
