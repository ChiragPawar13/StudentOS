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

const toBase64 = async (file: File) => (await fileToDataUrl(file)).split(",")[1] ?? "";

export const NOTE_FILE_ACCEPT =
  ".pdf,.docx,.pptx,.xlsx,.xls,.csv,.txt,.md,.json,.html,.rtf,.png,.jpg,.jpeg,.webp,.gif,image/*,application/pdf";

// Turns any supported study file into note text.
export async function extractFileText(file: File, onText: (t: string) => void = () => {}): Promise<string> {
  const name = file.name.toLowerCase();
  const ext = name.split(".").pop() ?? "";
  if (file.size > 20 * 1024 * 1024) throw new Error("File is too large (max 20MB).");

  if (ext === "pdf" || file.type === "application/pdf" || file.type.startsWith("image/")) {
    const mime = ext === "pdf" ? "application/pdf" : file.type || "image/png";
    return streamAI({ task: "extract", file: { name: file.name, mime, data: await toBase64(file) } }, onText);
  }
  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return value;
  }
  if (ext === "pptx") {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const slides = Object.keys(zip.files)
      .filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
      .sort((a, b) => Number(a.match(/\d+/g)!.pop()) - Number(b.match(/\d+/g)!.pop()));
    const out: string[] = [];
    for (const [i, s] of slides.entries()) {
      const xml = await zip.files[s]!.async("string");
      const paras = xml.split("</a:p>").map((p) => [...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join("")).filter(Boolean);
      out.push(`### Slide ${i + 1}\n${paras.map((p) => `- ${p}`).join("\n")}`);
    }
    return out.join("\n\n");
  }
  if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer());
    return wb.SheetNames.map((n) => `### ${n}\n${XLSX.utils.sheet_to_csv(wb.Sheets[n]!)}`).join("\n\n");
  }
  if (ext === "doc" || ext === "ppt") throw new Error("Old .doc/.ppt files aren't supported — save as .docx/.pptx or PDF.");
  const text = await file.text();
  return ext === "html" ? new DOMParser().parseFromString(text, "text/html").body.innerText : text;
}
