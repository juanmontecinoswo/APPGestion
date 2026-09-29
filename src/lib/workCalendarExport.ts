import type { WorkDayEntry } from '../types'

export interface DayGroup {
  dateKey: string
  label: string
  entries: WorkDayEntry[]
}

function parseDateKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

export function formatDateKeyLabel(dateKey: string): string {
  const date = parseDateKey(dateKey)
  if (!date) return dateKey
  return date.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function groupEntriesByDateRange(
  entries: WorkDayEntry[],
  fromKey: string,
  toKey: string,
): DayGroup[] {
  const from = fromKey <= toKey ? fromKey : toKey
  const to = fromKey <= toKey ? toKey : fromKey
  const inRange = entries
    .filter((entry) => entry.dateKey >= from && entry.dateKey <= to)
    .sort(
      (a, b) =>
        a.dateKey.localeCompare(b.dateKey) ||
        a.createdAt.localeCompare(b.createdAt),
    )

  const byDay = new Map<string, WorkDayEntry[]>()
  for (const entry of inRange) {
    const list = byDay.get(entry.dateKey) ?? []
    list.push(entry)
    byDay.set(entry.dateKey, list)
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, dayEntries]) => ({
      dateKey,
      label: formatDateKeyLabel(dateKey),
      entries: dayEntries,
    }))
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function exportWorkCalendarExcel(
  groups: DayGroup[],
  fromKey: string,
  toKey: string,
): void {
  const lines = ['Fecha,Número']
  for (const group of groups) {
    lines.push(`${escapeCsv(group.label)},`)
    for (const entry of group.entries) {
      lines.push(`,${escapeCsv(entry.text)}`)
    }
    lines.push(',')
  }

  const csv = `\uFEFF${lines.join('\r\n')}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `calendario-${fromKey}_${toKey}.csv`)
}

function buildReportHtml(
  groups: DayGroup[],
  fromKey: string,
  toKey: string,
): string {
  const total = groups.reduce((sum, group) => sum + group.entries.length, 0)
  const body =
    groups.length === 0
      ? '<p>No hay números en el rango seleccionado.</p>'
      : groups
          .map((group) => {
            const items =
              group.entries.length === 0
                ? '<li class="empty">Sin registros</li>'
                : group.entries
                    .map(
                      (entry) =>
                        `<li>${escapeHtml(entry.text)}</li>`,
                    )
                    .join('')
            return `
              <section class="day">
                <h2>${escapeHtml(group.label)}</h2>
                <p class="meta">${group.entries.length} ${
                  group.entries.length === 1 ? 'número' : 'números'
                }</p>
                <ul>${items}</ul>
              </section>
            `
          })
          .join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Calendario ${fromKey} a ${toKey}</title>
  <style>
    body {
      font-family: Georgia, "Times New Roman", serif;
      color: #1a1a1a;
      margin: 32px;
      line-height: 1.45;
    }
    h1 { font-size: 22px; margin: 0 0 6px; }
    .summary { color: #555; margin: 0 0 24px; font-size: 14px; }
    .day { margin: 0 0 22px; page-break-inside: avoid; }
    .day h2 { font-size: 16px; margin: 0 0 4px; }
    .meta { margin: 0 0 8px; color: #666; font-size: 13px; }
    ul { margin: 0; padding-left: 18px; }
    li { margin: 2px 0; font-family: "Segoe UI", Arial, sans-serif; }
    li.empty { color: #888; list-style: none; margin-left: -18px; }
    @media print {
      body { margin: 16px; }
    }
  </style>
</head>
<body>
  <h1>Calendario de trabajo</h1>
  <p class="summary">
    Rango: ${escapeHtml(formatDateKeyLabel(fromKey))} — ${escapeHtml(
      formatDateKeyLabel(toKey),
    )} · Total: ${total} ${total === 1 ? 'número' : 'números'}
  </p>
  ${body}
</body>
</html>`
}

export function exportWorkCalendarPdf(
  groups: DayGroup[],
  fromKey: string,
  toKey: string,
): void {
  const html = buildReportHtml(groups, fromKey, toKey)
  const popup = window.open('', '_blank', 'noopener,noreferrer,width=820,height=900')
  if (!popup) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    downloadBlob(blob, `calendario-${fromKey}_${toKey}.html`)
    return
  }
  popup.document.open()
  popup.document.write(html)
  popup.document.close()
  popup.focus()
  window.setTimeout(() => {
    popup.print()
  }, 250)
}

