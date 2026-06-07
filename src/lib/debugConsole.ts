export function shouldEnableDebugConsole(search: string) {
  return new URLSearchParams(search).get("vconsole") === "1";
}

export async function initializeDebugConsole(search: string) {
  if (!shouldEnableDebugConsole(search)) return;

  try {
    const { default: eruda } = await import("eruda");
    eruda.init();
  } catch (error) {
    console.error("Failed to initialize Eruda.", error);
  }
}
