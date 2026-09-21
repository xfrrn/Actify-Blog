export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { database } = await import("./lib/cms-db.ts");
    await database();
  }
}
