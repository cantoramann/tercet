/**
 * Default content folder for the fs driver. `withTercet({ contentDir })` sets
 * TERCET_FS_DIR at build time so the folder is configured in one place; the
 * literal `process.env.TERCET_FS_DIR` lets Next.js inline it.
 */
export function defaultContentDir(): string {
  return process.env.TERCET_FS_DIR || "content/poems";
}
