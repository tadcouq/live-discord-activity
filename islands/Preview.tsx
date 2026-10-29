import { useEffect, useState } from "preact/hooks";
import { Button, buttonVariants } from "../components/Button.tsx";
import { Input } from "../components/Input.tsx";
import { useDebounce } from "../lib/utils.ts";
import { buildCardUrl, builderDefaults, type BuilderOptions, formatCardOutput, type OutputFormat } from "../lib/cardBuilder.ts";
import { cardOptions, discordUserId } from "../lib/schemas.ts";

const toggles = [
 ["hideStatus", "Hide online status"],
 ["hideCustomStatus", "Hide custom status"],
 ["hideBadges", "Hide badges"],
 ["hideProfile", "Hide profile"],
 ["hideSpotify", "Hide Spotify"],
 ["hideTimestamp", "Hide elapsed time"],
 ["animated", "Animated avatar"],
] as const;
const selectClass = "w-full rounded-lg border border-neutral-700 bg-neutral-900 p-2 text-white";

function CardPreview({ url }: { url: string }) {
 const [state, setState] = useState<"loading" | "ready" | "error">("loading");
 return (
  <div aria-busy={state === "loading"}>
   <p role="status" className="mb-3 text-sm text-neutral-400">
    {state === "loading" ? "Loading preview..." : state === "error" ? "Could not load the card. Check your ID and join the configured Discord server." : "Preview ready"}
   </p>
   <img src={url} alt="Your Discord activity card" className="max-w-full h-auto rounded-lg" width="400" onLoad={() => setState("ready")} onError={() => setState("error")} />
  </div>
 );
}

export default function Preview({ defaultUrl }: { defaultUrl: string }) {
 const [input, setInput] = useState("");
 const [options, setOptions] = useState<BuilderOptions>({ ...builderDefaults });
 const [format, setFormat] = useState<OutputFormat>("markdown");
 const [copyStatus, setCopyStatus] = useState("");
 const id = input.trim();
 const validId = discordUserId.safeParse(id).success;
 const query = Object.fromEntries(Object.entries(options).filter(([key, value]) => key !== "bgColor" || value !== ""));
 const validation = cardOptions.safeParse(query);
 const valid = validId && validation.success;
 const cardUrl = buildCardUrl(defaultUrl, id, options);
 const output = valid ? formatCardOutput(cardUrl, id, format) : "";
 const previewUrl = useDebounce(valid ? cardUrl : "", 300);
 const rawUrl = new URL(`/api/raw/${encodeURIComponent(id)}`, defaultUrl).toString();
 const update = (key: keyof BuilderOptions, value: string) => setOptions((current) => ({ ...current, [key]: value }));
 useEffect(() => setCopyStatus(""), [output]);
 const copy = async () => {
  try {
   await navigator.clipboard.writeText(output);
   setCopyStatus("Copied!");
  } catch {
   setCopyStatus("Copy failed. Select and copy the code below manually.");
  }
 };

 return (
  <div className="grid grid-cols-1 md:grid-cols-5">
   <div className="flex flex-col gap-4 border-b border-neutral-800 bg-[#121212] p-6 md:col-span-2 md:border-b-0 md:border-r">
    <div>
     <label for="discord-id" className="mb-1 block text-sm text-neutral-300">Discord ID</label>
     <Input id="discord-id" placeholder="544164729354977282" inputMode="numeric" value={input} onInput={(e) => setInput(e.currentTarget.value)} aria-invalid={!!id && !validId} />
     {!!id && !validId && <p className="mt-1 text-sm text-red-400" role="alert">Enter a Discord ID with 17-19 digits.</p>}
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
     <label className="text-sm text-neutral-300">
      Theme
      <select className={selectClass} value={options.theme} onChange={(e) => update("theme", e.currentTarget.value)}>
       <option value="dark">Dark</option>
       <option value="light">Light</option>
      </select>
     </label>
     <label className="text-sm text-neutral-300">
      Maximum activities
      <select className={selectClass} value={options.maxActivities} onChange={(e) => update("maxActivities", e.currentTarget.value)}>
       {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
     </label>
    </div>
    <label className="text-sm text-neutral-300">
     Background color (optional)
     <Input placeholder="Theme default, or hex: 161a23" value={options.bgColor} onInput={(e) => update("bgColor", e.currentTarget.value.trim())} />
    </label>
    <label className="text-sm text-neutral-300">
     Border radius (px)
     <Input type="number" min="0" max="100" step="1" value={options.borderRadius} onInput={(e) => update("borderRadius", e.currentTarget.value)} />
    </label>
    <label className="text-sm text-neutral-300">
     Idle message
     <Input maxLength={200} value={options.idleMessage} onInput={(e) => update("idleMessage", e.currentTarget.value)} />
    </label>
    <label className="text-sm text-neutral-300">
     Hide applications by ID
     <Input placeholder="123456789012345678, 234567890123456789" maxLength={500} value={options.ignoreAppId} onInput={(e) => update("ignoreAppId", e.currentTarget.value)} />
    </label>
    <label className="text-sm text-neutral-300">
     Activity section
     <select className={selectClass} value={options.hideActivity} onChange={(e) => update("hideActivity", e.currentTarget.value)}>
      <option value="false">Show activities and idle message</option>
      <option value="whenNotUsed">Hide when empty</option>
      <option value="true">Always hide</option>
     </select>
    </label>
    <fieldset className="grid gap-2">
     <legend className="mb-2 text-sm font-medium text-neutral-300">Visibility</legend>
     {toggles.map(([key, label]) => (
      <label key={key} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-300">
       <input type="checkbox" checked={options[key] === "true"} onChange={(e) => update(key, String(e.currentTarget.checked))} />
       {label}
      </label>
     ))}
    </fieldset>
    {!validation.success && <p role="alert" className="text-sm text-red-400">{validation.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join(". ")}</p>}
    <Button variant="secondary" onClick={() => setOptions({ ...builderDefaults })}>Reset appearance</Button>
   </div>
   <div className="min-w-0 p-6 md:col-span-3">
    <div className="md:sticky md:top-6">
     <h3 className="mb-3 font-medium text-neutral-300">Embed your activity</h3>
     <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Output format">
      {(["markdown", "html", "url"] as const).map((item) => (
       <Button key={item} variant={format === item ? "primary" : "secondary"} aria-pressed={format === item} onClick={() => setFormat(item)}>
        {item === "html" ? "HTML (SVG)" : item === "url" ? "URL" : "Markdown"}
       </Button>
      ))}
     </div>
     <p className="mb-3 text-sm text-neutral-400">{format === "markdown" ? "Paste into your GitHub README." : format === "html" ? "An HTML image embed that loads your SVG card." : "Direct URL to your SVG card."}</p>
     <textarea aria-label="Generated embed code" readOnly value={output} placeholder="Enter a valid Discord ID to generate your code." rows={5} className="w-full resize-y rounded-lg border border-neutral-800 bg-neutral-900 p-3 font-mono text-sm text-white" />
     <div className="mt-3 flex flex-wrap items-center gap-3">
      <Button className="min-w-36" disabled={!valid} onClick={copy}>Copy {format === "url" ? "URL" : format === "html" ? "HTML" : "Markdown"}</Button>
      {valid && <a href={cardUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "secondary" })}>Open SVG</a>}
     </div>
     <p role="status" className={`mt-2 text-sm ${copyStatus === "Copied!" ? "text-green-400" : copyStatus ? "text-red-400" : "text-neutral-400"}`}>{copyStatus}</p>
     {!valid && <p className="text-sm text-neutral-300">Enter a valid Discord ID to enable copying.</p>}
     <h3 className="mb-3 mt-6 font-medium text-neutral-300">Preview</h3>
     {valid && previewUrl === cardUrl ? <CardPreview key={previewUrl} url={previewUrl} /> : <p className="text-sm text-neutral-400">{valid ? "Updating preview..." : "Enter your Discord ID and valid options to preview the card."}</p>}
     {validId && <a href={rawUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block text-sm text-blue-400 underline">Open raw JSON API</a>}
    </div>
   </div>
  </div>
 );
}
