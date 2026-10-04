/** prefix for files in public/ when the app is served under a sub-path (static export) */
export const asset = (p: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${p}`;
