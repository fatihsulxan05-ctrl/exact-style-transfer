import { localIso } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, Save, Check, Download } from "@/components/app/icons";
import { Avatar } from "@/components/app/AppShell";
import { ReportSheet } from "@/components/app/ReportSheet";
import { useStore, type AttendanceRow } from "@/lib/store";
import { VAKITLER } from "@/lib/stats";

export const Route = createFileRoute("/yoklama")({
  head: () => ({
    meta: [
      { title: "Günlük Yoklama — Kur'an Kursu" },
      { name: "description", content: "Beş vakit namaz ve ders yoklamasını işaretleyip kaydedin." },
      { property: "og:title", content: "Günlük Yoklama — Kur'an Kursu" },
      { property: "og:description", content: "Beş vakit namaz ve ders yoklamasını işaretleyip kaydedin." },
    ],
  }),
  component: Yoklama,
});

const cols = [...VAKITLER, "Ders"];
const DURUMLAR = [
  { k: "gec", l: "Geç" },
  { k: "izinli", l: "İzinli" },
] as const;
type Row = { vakitler: string[]; ders: boolean; durum: AttendanceRow["durum"] };

function Yoklama() {
  const { students, attendance, saveDay } = useStore();
  const [date, setDate] = useState(localIso());
  const [marks, setMarks] = useState<Record<string, Row>>({});
  const [saved, setSaved] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // attendance arrives one tick after mount (store hydrates from device storage),
  // so this must re-run when it loads — otherwise saved marks never show up.
  useEffect(() => {
    const m: Record<string, Row> = {};
    for (const a of attendance.filter((x) => x.date === date)) m[a.studentId] = { vakitler: a.vakitler, ders: a.ders, durum: a.durum };
    setMarks(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, attendance]);

  const d = new Date(date + "T12:00");
  const label = d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  const day = d.toLocaleDateString("tr-TR", { weekday: "long" });
  const get = (id: string): Row => marks[id] ?? { vakitler: [], ders: false, durum: "normal" };

  const toggle = (id: string, c: string) => {
    const r = get(id);
    const next = c === "Ders" ? { ...r, ders: !r.ders } : { ...r, vakitler: r.vakitler.includes(c) ? r.vakitler.filter((v) => v !== c) : [...r.vakitler, c] };
    setMarks({ ...marks, [id]: next });
    setSaved(false);
  };
  const setDurum = (id: string, durum: Row["durum"]) => { setMarks({ ...marks, [id]: { ...get(id), durum } }); setSaved(false); };
  const toggleDurum = (id: string, k: "gec" | "izinli") => { const cur = get(id).durum; setDurum(id, cur === k ? "normal" : k); };

  const save = () => {
    saveDay(date, students.map((s) => ({ studentId: s.id, ...get(s.id) })));
    setSaved(true);
  };

  return (
    <>
      <h2 className="mt-7 font-serif text-3xl font-bold">Günlük Yoklama</h2>
      <p className="mt-2 text-sm text-muted-foreground">Beş vakit namaz ve ders yoklamasını işaretleyip kaydedin.</p>
      <div className="mt-5 flex items-end justify-between gap-3 rounded-2xl border border-border bg-card p-5">
        <div>
          <p className="text-xs text-muted-foreground">Tarih</p>
          <div className="mt-2 flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <label className="relative whitespace-nowrap rounded-xl border border-border px-4 py-2 text-sm">
              {label}
              <input type="date" value={date} onChange={(e) => { if (e.target.value) { setDate(e.target.value); setSaved(false); } }} className="absolute inset-0 opacity-0" />
            </label>
          </div>
          <p className="mt-2 font-semibold capitalize text-primary">{day}</p>
        </div>
        <button onClick={save} disabled={!students.length} className="mb-6 flex items-center gap-2 whitespace-nowrap rounded-xl bg-primary px-3 py-2.5 text-xs text-primary-foreground disabled:opacity-50">
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />} {saved ? "Kaydedildi" : "Yoklamayı Kaydet"}
        </button>
      </div>
      <button
        onClick={() => setReportOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-brand-soft py-3 text-sm font-medium text-primary transition-transform active:scale-[0.98]"
      >
        <Download className="h-4 w-4" /> Yoklama Raporu İndir (PDF / Excel)
      </button>
      <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} initialDate={date} />
      {students.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Yoklama almak için önce <Link to="/" className="font-medium text-primary underline">talebe ekleyin</Link>.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center gap-2 bg-brand-soft px-3 py-2 text-muted-foreground">
            <span className="min-w-0 flex-1 text-[11px] font-semibold">Adı Soyadı</span>
            <div className="flex shrink-0 items-center gap-[3px]">
              {cols.map((c) => <span key={c} className="w-6 text-center text-[8px] leading-none tracking-tight">{c}</span>)}
              <span className="h-4 w-px shrink-0 bg-primary/20" />
              {DURUMLAR.map((d) => <span key={d.k} className="w-8 text-center text-[8px] leading-none tracking-tight">{d.l}</span>)}
            </div>
          </div>
          {students.map((s) => {
            const r = get(s.id);
            return (
              <div key={s.id} className="flex items-center gap-2 border-t border-border px-3 py-2.5">
                <div className="hidden min-w-0 flex-1 items-center gap-2 sm:flex"><Avatar name={s.name} size="xs" /><span className="min-w-0 flex-1 text-xs leading-snug">{s.name}</span></div>
                <span className="min-w-0 flex-1 text-xs leading-snug sm:hidden">{s.name}</span>
                <div className="flex shrink-0 items-center gap-[3px]">
                  {cols.map((c) => {
                    const on = c === "Ders" ? r.ders : r.vakitler.includes(c);
                    return (
                      <button
                        key={c}
                        onClick={() => toggle(s.id, c)}
                        aria-label={`${s.name} ${c}`}
                        className={`flex h-7 w-6 shrink-0 items-center justify-center rounded-md border border-border transition-colors ${on ? "bg-primary text-primary-foreground" : "bg-surface"}`}
                      >
                        {on && <Check className="h-3.5 w-3.5" />}
                      </button>
                    );
                  })}
                  <span className="h-5 w-px shrink-0 bg-border" />
                  {DURUMLAR.map((d) => (
                    <button
                      key={d.k}
                      onClick={() => toggleDurum(s.id, d.k)}
                      aria-label={`${s.name} ${d.l}`}
                      className={`flex h-7 w-8 shrink-0 items-center justify-center rounded-md border border-border text-[8px] leading-none tracking-tight transition-colors ${r.durum === d.k ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"}`}
                    >
                      {d.l}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
