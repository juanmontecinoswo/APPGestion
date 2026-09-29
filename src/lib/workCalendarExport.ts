import type { WorkDayEntry } from '../types'

export interface DayGroup {
  dateKey: string
  label: string
  entries: WorkDayEntry[]
}

/** Fecha en formato DD/MM/YYYY */
export function formatDateKeyLabel(dateKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) return dateKey
  return `${match[3]}/${match[2]}/${match[1]}`
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
  const lines = ['Fecha,precinto']
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
  const rows =
    groups.length === 0
      ? '<tr><td colspan="2">No hay precintos en el rango seleccionado.</td></tr>'
      : groups
          .map((group) => {
            const dayHeader = `
              <tr class="day-head">
                <td>${escapeHtml(group.label)}</td>
                <td></td>
              </tr>`
            const entryRows = group.entries
              .map(
                (entry) => `
              <tr>
                <td class="empty-date"></td>
                <td>${escapeHtml(entry.text)}</td>
              </tr>`,
              )
              .join('')
            return `${dayHeader}${entryRows}<tr class="spacer"><td></td><td></td></tr>`
          })
          .join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Calendario ${formatDateKeyLabel(fromKey)} a ${formatDateKeyLabel(toKey)}</title>
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #1a1a1a;
      margin: 28px;
    }
    h1 { font-size: 18px; margin: 0 0 6px; }
    .summary { color: #555; margin: 0 0 18px; font-size: 13px; }
    table {
      border-collapse: collapse;
      width: 100%;
      max-width: 520px;
    }
    th, td {
      border: 1px solid #333;
      padding: 6px 10px;
      text-align: left;
      font-size: 13px;
    }
    th {
      background: #e8e8e8;
      font-weight: 700;
    }
    tr.day-head td:first-child {
      font-weight: 700;
    }
    td.empty-date {
      background: #f3f3f3;
    }
    tr.spacer td {
      border-left-color: transparent;
      border-right-color: transparent;
      height: 8px;
      padding: 0;
    }
    @media print {
      body { margin: 12px; }
      tr.spacer td { border: none; }
    }
  </style>
</head>
<body>
  <h1>Calendario de trabajo</h1>
  <p class="summary">
    Rango: ${escapeHtml(formatDateKeyLabel(fromKey))} — ${escapeHtml(
      formatDateKeyLabel(toKey),
    )} · Total: ${total} ${total === 1 ? 'precinto' : 'precintos'}
  </p>
  <table>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>precinto</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
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
