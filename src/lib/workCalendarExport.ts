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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeHtml(value: string): string {
  return escapeXml(value).replace(/'/g, '&#39;')
}

function totalEntries(groups: DayGroup[]): number {
  return groups.reduce((sum, group) => sum + group.entries.length, 0)
}

function xmlCell(
  value: string,
  opts?: { type?: 'String' | 'Number'; style?: string },
): string {
  const type = opts?.type ?? 'String'
  const style = opts?.style ? ` ss:StyleID="${opts.style}"` : ''
  return `<Cell${style}><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`
}

/** Excel SpreadsheetML — se abre como hoja real, no como HTML/CSV. */
function buildSpreadsheetXml(
  groups: DayGroup[],
  fromKey: string,
  toKey: string,
): string {
  const total = totalEntries(groups)
  const fromLabel = formatDateKeyLabel(fromKey)
  const toLabel = formatDateKeyLabel(toKey)
  const rows: string[] = []

  rows.push(`<Row ss:StyleID="Title">
    ${xmlCell('Calendario de precintos', { style: 'Title' })}
    <Cell ss:StyleID="Title"/><Cell ss:StyleID="Title"/>
  </Row>`)
  rows.push(`<Row ss:StyleID="Summary">
    ${xmlCell(`Rango: ${fromLabel} — ${toLabel}`, { style: 'Summary' })}
    ${xmlCell(`Total: ${total}`, { style: 'Summary' })}
    ${xmlCell(`Días: ${groups.length}`, { style: 'Summary' })}
  </Row>`)
  rows.push('<Row/>')
  rows.push(`<Row ss:StyleID="Header">
    ${xmlCell('Fecha', { style: 'Header' })}
    ${xmlCell('precinto', { style: 'Header' })}
    ${xmlCell('Cantidad del día', { style: 'Header' })}
  </Row>`)

  if (groups.length === 0) {
    rows.push(`<Row>
      ${xmlCell('No hay precintos en el rango seleccionado.')}
      <Cell/><Cell/>
    </Row>`)
  } else {
    groups.forEach((group, groupIndex) => {
      const dayStyle = groupIndex % 2 === 0 ? 'DayA' : 'DayB'
      group.entries.forEach((entry, entryIndex) => {
        rows.push(`<Row>
          ${xmlCell(group.label, { style: dayStyle })}
          ${xmlCell(entry.text, { style: 'Precinto' })}
          ${xmlCell(
            entryIndex === 0 ? String(group.entries.length) : '',
            { type: entryIndex === 0 ? 'Number' : 'String', style: dayStyle },
          )}
        </Row>`)
      })
    })
  }

  rows.push(`<Row ss:StyleID="Total">
    ${xmlCell('Total', { style: 'Total' })}
    ${xmlCell(`${total} precintos`, { style: 'Total' })}
    ${xmlCell(`${groups.length} días`, { style: 'Total' })}
  </Row>`)

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>Calendario ${escapeXml(fromLabel)} a ${escapeXml(toLabel)}</Title>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center" ss:WrapText="0"/>
   <Font ss:FontName="Calibri" ss:Size="11"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1"/>
  </Style>
  <Style ss:ID="Summary">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#4B5563"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1F4E79" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#163A5A"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#163A5A"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#163A5A"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#163A5A"/>
   </Borders>
  </Style>
  <Style ss:ID="DayA">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11"/>
   <Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="DayB">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11"/>
   <Interior ss:Color="#F3F7FB" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="Precinto">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Consolas" ss:Size="11"/>
   <NumberFormat ss:Format="@"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
  </Style>
  <Style ss:ID="Total">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1F4E79" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Calendario">
  <Table ss:DefaultRowHeight="18">
   <Column ss:Index="1" ss:AutoFitWidth="0" ss:Width="100"/>
   <Column ss:Index="2" ss:AutoFitWidth="0" ss:Width="160"/>
   <Column ss:Index="3" ss:AutoFitWidth="0" ss:Width="120"/>
   ${rows.join('\n   ')}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <Selected/>
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>4</SplitHorizontal>
   <TopRowBottomPane>4</TopRowBottomPane>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`
}

function buildPrintHtml(
  groups: DayGroup[],
  fromKey: string,
  toKey: string,
): string {
  const total = totalEntries(groups)
  const fromLabel = formatDateKeyLabel(fromKey)
  const toLabel = formatDateKeyLabel(toKey)
  const bodyRows =
    groups.length === 0
      ? '<tr><td colspan="3">No hay precintos en el rango seleccionado.</td></tr>'
      : groups
          .map((group, groupIndex) => {
            const stripe = groupIndex % 2 === 0 ? 'day-a' : 'day-b'
            return group.entries
              .map(
                (entry, entryIndex) => `
            <tr class="${stripe}">
              <td class="date">${escapeHtml(group.label)}</td>
              <td class="precinto">${escapeHtml(entry.text)}</td>
              <td class="count">${entryIndex === 0 ? group.entries.length : ''}</td>
            </tr>`,
              )
              .join('')
          })
          .join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Calendario ${escapeHtml(fromLabel)} a ${escapeHtml(toLabel)}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; margin: 18px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .summary { margin: 0 0 14px; color: #555; font-size: 12px; }
    table { border-collapse: collapse; width: 100%; max-width: 560px; }
    th { background: #1f4e79; color: #fff; text-align: left; padding: 8px 10px; font-size: 12px; }
    td { border: 1px solid #cbd5e1; padding: 7px 10px; font-size: 12px; text-align: left; }
    td.date { white-space: nowrap; font-weight: 700; }
    td.precinto { font-family: Consolas, monospace; }
    td.count { text-align: center; width: 90px; }
    tr.day-b td { background: #f3f7fb; }
    tr.total td { background: #1f4e79; color: #fff; font-weight: 700; }
    @media print { body { margin: 10px; } }
  </style>
</head>
<body>
  <h1>Calendario de precintos</h1>
  <p class="summary">
    Rango: ${escapeHtml(fromLabel)} — ${escapeHtml(toLabel)}
    · Total: ${total} ${total === 1 ? 'precinto' : 'precintos'}
    · Días: ${groups.length}
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
      ${bodyRows}
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
  const xml = buildSpreadsheetXml(groups, fromKey, toKey)
  const blob = new Blob([xml], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  })
  downloadBlob(blob, `calendario-${fromKey}_${toKey}.xls`)
}

export function exportWorkCalendarPdf(
  groups: DayGroup[],
  fromKey: string,
  toKey: string,
): void {
  const html = buildPrintHtml(groups, fromKey, toKey)
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
