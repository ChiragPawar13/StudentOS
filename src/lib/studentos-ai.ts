// Browser helper: streams text from the /api/ai route.
export async function streamAI(
  body: Record<string, unknown>,
  onText: (full: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: signal ?? null,
  });
  if (!res.ok || !res.body) throw new Error((await res.text()) || "AI request failed");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += dec.decode(value, { stream: true });
    const errAt = full.indexOf("\u0000ERR:");
    if (errAt >= 0) throw new Error(full.slice(errAt + 5));
    onText(full);
  }
  if (!full.trim()) throw new Error("The AI returned an empty answer. Please try again.");
  return full;
}

export const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
