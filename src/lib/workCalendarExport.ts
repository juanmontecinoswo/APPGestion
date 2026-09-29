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
    const precintos = group.entries.map((entry) => entry.text).join(' | ')
    lines.push(`${escapeCsv(group.label)},${escapeCsv(precintos)}`)
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
            const precintos = group.entries
              .map((entry) => escapeHtml(entry.text))
              .join(' | ')
            return `
              <tr>
                <td class="date">${escapeHtml(group.label)}</td>
                <td>${precintos}</td>
              </tr>`
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
      margin: 16px;
    }
    h1 { font-size: 16px; margin: 0 0 4px; }
    .summary { color: #555; margin: 0 0 10px; font-size: 12px; }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      border: 1px solid #444;
      padding: 3px 6px;
      text-align: left;
      font-size: 11px;
      vertical-align: top;
    }
    th {
      background: #e8e8e8;
      font-weight: 700;
    }
    td.date {
      white-space: nowrap;
      width: 1%;
      font-weight: 600;
    }
    @media print {
      body { margin: 8px; }
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
