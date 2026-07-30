import { execSync } from "node:child_process";

function run(cmd) {
  console.log(`\n> ${cmd}\n`);
  execSync(cmd, { stdio: "inherit", env: process.env });
}

function tryRun(cmd) {
  try {
    run(cmd);
    return true;
  } catch {
    return false;
  }
}

const migration = "20260730000000_init";

if (!tryRun("npx prisma migrate deploy")) {
  console.log("Migrate deploy failed. Clearing failed migration marker and retrying...");
  tryRun(`npx prisma migrate resolve --rolled-back "${migration}"`);

  if (!tryRun("npx prisma migrate deploy")) {
    console.log("Migrate still failing. Falling back to prisma db push for bootstrap...");
    run("npx prisma db push --accept-data-loss");
    // If tables were created via db push, mark migration applied so future deploys are clean
    tryRun(`npx prisma migrate resolve --applied "${migration}"`);
  }
}

run("npm run start");
