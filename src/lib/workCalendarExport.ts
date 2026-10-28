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

function totalEntries(groups: DayGroup[]): number {
  return groups.reduce((sum, group) => sum + group.entries.length, 0)
}

function buildTableRows(groups: DayGroup[]): string {
  if (groups.length === 0) {
    return '<tr><td colspan="3">No hay precintos en el rango seleccionado.</td></tr>'
  }

  return groups
    .map((group, groupIndex) => {
      const stripe = groupIndex % 2 === 0 ? 'day-a' : 'day-b'
      return group.entries
        .map((entry, entryIndex) => {
          const isFirst = entryIndex === 0
          const dateCell = isFirst
            ? `<td class="date" rowspan="${group.entries.length}">${escapeHtml(group.label)}</td>`
            : ''
          const countCell = isFirst
            ? `<td class="count" rowspan="${group.entries.length}">${group.entries.length}</td>`
            : ''
          return `
            <tr class="${stripe}">
              ${dateCell}
              <td class="precinto">${escapeHtml(entry.text)}</td>
              ${countCell}
            </tr>`
        })
        .join('')
    })
    .join('')
}

function buildSpreadsheetHtml(
  groups: DayGroup[],
  fromKey: string,
  toKey: string,
): string {
  const total = totalEntries(groups)
  const fromLabel = formatDateKeyLabel(fromKey)
  const toLabel = formatDateKeyLabel(toKey)

  return `<!DOCTYPE html>
<html lang="es" xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Calendario</x:Name>
          <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <title>Calendario ${fromLabel} a ${toLabel}</title>
  <style>
    body {
      font-family: Calibri, Arial, Helvetica, sans-serif;
      color: #1f2933;
      margin: 18px;
      background: #fff;
    }
    h1 {
      font-size: 18px;
      margin: 0 0 4px;
      color: #111827;
    }
    .summary {
      margin: 0 0 14px;
      color: #4b5563;
      font-size: 12px;
    }
    table {
      border-collapse: collapse;
      width: auto;
      min-width: 420px;
    }
    th {
      background: #1f4e79;
      color: #ffffff;
      font-weight: 700;
      font-size: 12px;
      text-align: left;
      padding: 8px 12px;
      border: 1px solid #163a5a;
      white-space: nowrap;
    }
    td {
      border: 1px solid #cbd5e1;
      padding: 7px 12px;
      font-size: 12px;
      vertical-align: middle;
      text-align: left;
      mso-number-format: "\\@";
    }
    td.date {
      font-weight: 700;
      white-space: nowrap;
      width: 110px;
      background: #eef5fb;
      vertical-align: top;
    }
    td.precinto {
      min-width: 140px;
      font-family: Consolas, "Courier New", monospace;
      letter-spacing: 0.02em;
    }
    td.count {
      text-align: center;
      width: 70px;
      font-weight: 700;
      color: #1f4e79;
      vertical-align: top;
      background: #f8fafc;
    }
    tr.day-a td.precinto { background: #ffffff; }
    tr.day-b td.precinto { background: #f3f7fb; }
    tr.day-b td.date { background: #e4eef8; }
    tr.total td {
      background: #1f4e79;
      color: #fff;
      font-weight: 700;
      border-color: #163a5a;
    }
  </style>
</head>
<body>
  <h1>Calendario de precintos</h1>
  <p class="summary">
    Rango: ${escapeHtml(fromLabel)} — ${escapeHtml(toLabel)}
    &nbsp;·&nbsp; Total: ${total} ${total === 1 ? 'precinto' : 'precintos'}
    &nbsp;·&nbsp; Días con registro: ${groups.length}
  </p>
  <table>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>precinto</th>
        <th>Cantidad del día</th>
      </tr>
    </thead>
    <tbody>
      ${buildTableRows(groups)}
      <tr class="total">
        <td>Total</td>
        <td>${total} precintos</td>
        <td>${groups.length} días</td>
      </tr>
    </tbody>
  </table>
</body>
</html>`
}

export function exportWorkCalendarExcel(
  groups: DayGroup[],
  fromKey: string,
  toKey: string,
): void {
  const html = buildSpreadsheetHtml(groups, fromKey, toKey)
  const blob = new Blob([`\uFEFF${html}`], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  })
  downloadBlob(blob, `calendario-${fromKey}_${toKey}.xls`)
}

export function exportWorkCalendarPdf(
  groups: DayGroup[],
  fromKey: string,
  toKey: string,
): void {
  const html = buildSpreadsheetHtml(groups, fromKey, toKey)
  const popup = window.open(
    '',
    '_blank',
    'noopener,noreferrer,width=860,height=900',
  )
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
