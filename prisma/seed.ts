import { db } from "../src/lib/db";

async function main() {
  console.log("Seed data will be added in a later implementation step.");
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
