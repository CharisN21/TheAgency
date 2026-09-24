"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  buildRows,
  guessMapping,
  parseCsv,
  TARGET_LABEL,
  type Sheet,
  type TargetField,
} from "@/lib/csv"
import { importOrganisations, planImport, type ImportPlan } from "@/lib/data/actions"

const STEPS = ["Upload", "Map columns", "Duplicates", "Done"] as const

const TARGETS: TargetField[] = [
  "skip",
  "name",
  "category",
  "what_they_do",
  "location",
  "phone",
  "email",
  "tags",
  "contact_name",
  "contact_title",
  "contact_phone",
  "contact_email",
]

export function ImportWizard() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(0)
  const [filename, setFilename] = useState("")
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [mapping, setMapping] = useState<TargetField[]>([])
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [onDuplicate, setOnDuplicate] = useState<"skip" | "fill">("skip")
  const [result, setResult] = useState<{
    created: number
    updated: number
    skipped: number
    people: number
  } | null>(null)
  const [dragging, setDragging] = useState(false)
  const [pasting, setPasting] = useState(false)
  const [pending, start] = useTransition()

  function load(text: string, name: string) {
    const parsed = parseCsv(text)
    if (parsed.rows.length === 0) {
      toast.error("That file has no rows under the headings")
      return
    }
    setSheet(parsed)
    setMapping(guessMapping(parsed.headers))
    setFilename(name)
    setStep(1)
  }

  async function readFile(file: File) {
    if (file.size > 5_000_000) {
      toast.error("That file is over 5MB", { description: "Split it and import in parts." })
      return
    }
    load(await file.text(), file.name)
  }

  const rows = sheet ? buildRows(sheet, mapping) : []
  const hasName = mapping.includes("name")

  function toPlan() {
    start(async () => {
      const p = await planImport(rows)
      setPlan(p)
      setStep(2)
    })
  }

  function run() {
    start(async () => {
      const r = await importOrganisations(rows, onDuplicate)
      if (r.ok) {
        setResult({ created: r.created, updated: r.updated, skipped: r.skipped, people: r.people })
        setStep(3)
        router.refresh()
      } else {
        toast.error(r.message)
      }
    })
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Where we are */}
      <ol className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold",
                i < step
                  ? "bg-ok text-white"
                  : i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {i < step ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden text-sm sm:block",
                i === step ? "font-medium" : "text-muted-foreground"
              )}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && <span className="bg-border h-px flex-1" />}
          </li>
        ))}
      </ol>

      {/* 1 — upload */}
      {step === 0 && (
        <div className="flex flex-col gap-4">
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const file = e.dataTransfer.files[0]
              if (file) readFile(file)
            }}
            className={cn(
              "flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center transition-colors",
              dragging && "border-primary bg-accent"
            )}
          >
            <FileSpreadsheet className="text-ink-3 size-9" />
            <div>
              <p className="font-semibold">Drop your spreadsheet here</p>
              <p className="text-muted-foreground mt-1 text-sm">
                A CSV saved from Excel or Google Sheets. Up to 5MB, 2,000 rows.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => fileRef.current?.click()}>
                <Upload /> Choose a file
              </Button>
              <Button variant="outline" onClick={() => setPasting((p) => !p)}>
                Paste it instead
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) readFile(file)
              }}
            />
          </div>

          {pasting && (
            <Card className="py-0">
              <CardContent className="flex flex-col gap-3 p-4">
                <Label htmlFor="paste">Paste rows, with the headings on the first line</Label>
                <Textarea
                  id="paste"
                  rows={6}
                  placeholder={"Supplier name,Contact person,Tel,Items\nVision Safety,Mercy Wambui,+254…,masks"}
                  onChange={(e) => {
                    const text = e.target.value
                    if (text.includes("\n")) load(text, "pasted rows")
                  }}
                />
              </CardContent>
            </Card>
          )}

          <p className="text-muted-foreground text-sm">
            The file is read on this laptop. Nothing is sent anywhere until you press
            Import on the last step, and then only the columns you chose.
          </p>
        </div>
      )}

      {/* 2 — map */}
      {step === 1 && sheet && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">What is in each column?</h2>
            <p className="text-muted-foreground text-sm">
              {filename} · {sheet.rows.length} row{sheet.rows.length === 1 ? "" : "s"}. We
              guessed from your headings — correct anything that is wrong.
            </p>
          </div>

          <Card className="py-0">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-border border-b text-left text-[11px] font-semibold tracking-wide uppercase">
                    <th className="px-4 py-2.5">Your column</th>
                    <th className="px-4 py-2.5">First row</th>
                    <th className="px-4 py-2.5">Becomes</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {sheet.headers.map((h, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2.5 font-medium">{h}</td>
                      <td className="text-muted-foreground max-w-40 truncate px-4 py-2.5">
                        {sheet.rows[0]?.[i] || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <Select
                          value={mapping[i]}
                          onValueChange={(v) =>
                            setMapping((m) => m.map((x, j) => (j === i ? (v as TargetField) : x)))
                          }
                        >
                          <SelectTrigger className="w-56" aria-label={`What ${h} becomes`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TARGETS.map((t) => (
                              <SelectItem
                                key={t}
                                value={t}
                                disabled={t !== "skip" && mapping.includes(t) && mapping[i] !== t}
                              >
                                {TARGET_LABEL[t]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {!hasName && (
            <p className="bg-warn-soft flex items-start gap-2 rounded-lg px-4 py-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Pick which column holds the organisation name. Nothing can be imported
              without it.
            </p>
          )}

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>
              <ArrowLeft /> Back
            </Button>
            <Button onClick={toPlan} disabled={!hasName || rows.length === 0 || pending}>
              {pending && <Loader2 className="animate-spin" />}
              Check {rows.length} row{rows.length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      )}

      {/* 3 — duplicates */}
      {step === 2 && plan && (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">Before anything is written</h2>
            <p className="text-muted-foreground text-sm">
              Nothing has changed yet. This is what would happen.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { n: plan.newCount, label: "new organisations", tone: "" },
              { n: plan.duplicates.length, label: "already here", tone: "text-warn" },
              { n: plan.peopleCount, label: "people attached", tone: "" },
            ].map((s) => (
              <Card key={s.label} className="py-0">
                <CardContent className="p-4">
                  <p className={cn("text-2xl font-bold tabular-nums", s.tone)}>{s.n}</p>
                  <p className="text-muted-foreground text-sm">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {plan.duplicates.length > 0 && (
            <Card className="py-0">
              <CardContent className="flex flex-col gap-4 p-4">
                <div>
                  <p className="font-medium">
                    {plan.duplicates.length} name
                    {plan.duplicates.length === 1 ? " is" : "s are"} already in this
                    workspace
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {plan.duplicates
                      .slice(0, 5)
                      .map((d) => d.name)
                      .join(", ")}
                    {plan.duplicates.length > 5 && ` and ${plan.duplicates.length - 5} more`}
                  </p>
                </div>

                <RadioGroup
                  value={onDuplicate}
                  onValueChange={(v) => setOnDuplicate(v as "skip" | "fill")}
                  className="gap-0 overflow-hidden rounded-lg border"
                >
                  {[
                    {
                      value: "skip",
                      title: "Leave them alone",
                      help: "Import only the names that are new. Nothing existing is touched.",
                    },
                    {
                      value: "fill",
                      title: "Fill in what is missing",
                      help: "Add a phone, email, location or tag where that field is empty. Never overwrites what is already there.",
                    },
                  ].map((o) => (
                    <Label
                      key={o.value}
                      htmlFor={`dup-${o.value}`}
                      className="has-[[data-state=checked]]:bg-accent flex cursor-pointer items-start gap-3 border-b p-3 last:border-b-0"
                    >
                      <RadioGroupItem value={o.value} id={`dup-${o.value}`} className="mt-0.5" />
                      <span className="grid gap-0.5">
                        <span className="text-sm font-medium">{o.title}</span>
                        <span className="text-muted-foreground text-xs">{o.help}</span>
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          )}

          {plan.repeats.length > 0 && (
            <p className="bg-warn-soft flex items-start gap-2 rounded-lg px-4 py-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {plan.repeats.length} row{plan.repeats.length === 1 ? "" : "s"} repeat a name
              that appears earlier in the file. The first one wins; the rest are added to it.
            </p>
          )}

          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>
              <ArrowLeft /> Back to columns
            </Button>
            <Button onClick={run} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              Import{plan.newCount > 0 ? ` ${plan.newCount}` : ""}
            </Button>
          </div>
        </div>
      )}

      {/* 4 — done */}
      {step === 3 && result && (
        <div className="flex flex-col items-center gap-4 rounded-xl border px-6 py-14 text-center">
          <span className="bg-ok grid size-14 place-items-center rounded-2xl text-white">
            <Check className="size-6" />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Imported</h2>
            <p className="text-muted-foreground mt-1">
              {result.created} organisation{result.created === 1 ? "" : "s"} added
              {result.people > 0 && `, ${result.people} people attached`}
              {result.updated > 0 && `, ${result.updated} filled in`}
              {result.skipped > 0 && `, ${result.skipped} left alone`}.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href="/organisations">See them</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStep(0)
                setSheet(null)
                setPlan(null)
                setResult(null)
                setFilename("")
              }}
            >
              Import another file
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
