import { formatMoney, parseBillingMonth } from '../../utils/paymentUtils'
import { DEFAULT_UNIVERSITY_LOGO } from '../../constants'

const loadPdfLibraries = async () => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  return { jsPDF, autoTable }
}

const loadImageAsDataUrl = async (url) => {
  if (!url) {
    return null
  }

  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export const generatePaymentSlipPDF = async (slip, student, hall) => {
  const { jsPDF, autoTable } = await loadPdfLibraries()
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  const logoDataUrl = await loadImageAsDataUrl(hall?.university_logo_url || DEFAULT_UNIVERSITY_LOGO)
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', 14, 12, 18, 18)
    } catch {
      // Ignore image errors and continue rendering text content.
    }
  }

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(hall?.university_name || 'University', pageWidth / 2, 18, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(hall?.name || 'Hall', pageWidth / 2, 26, { align: 'center' })

  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text('PAYMENT SLIP', pageWidth / 2, 38, { align: 'center' })

  autoTable(doc, {
    startY: 45,
    theme: 'grid',
    body: [
      ['Student ID', student?.student_id || '-'],
      ['Name', student?.name || '-'],
      ['Department', student?.department || '-'],
      ['Batch', student?.batch || '-'],
      ['Month', new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(parseBillingMonth(slip.billing_month))],
    ],
    styles: { fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 } },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 10,
    head: [['Description', 'Amount']],
    body: [
      ['No of Meals', String(slip.no_of_meals)],
      ['Meal Charge', formatMoney(slip.meal_charge)],
      ['Other Bills', formatMoney(slip.other_bills)],
      ['Fuel & Spices', formatMoney(slip.fuel_and_spices)],
      ['SVC Charge', formatMoney(slip.svc_charge)],
      ['Hall Rent', formatMoney(slip.hall_rent)],
      ['Total', formatMoney(slip.total)],
      ['Dues', formatMoney(slip.dues)],
      ['Grand Total', formatMoney(slip.grand_total)],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [30, 58, 95] },
    bodyStyles: { textColor: [30, 41, 59] },
    didParseCell: (hookData) => {
      const label = hookData.row.raw?.[0]
      if (hookData.section === 'body' && ['Total', 'Dues', 'Grand Total'].includes(label)) {
        hookData.cell.styles.fontStyle = 'bold'
      }

      if (hookData.section === 'body' && label === 'Grand Total') {
        hookData.cell.styles.fillColor = [245, 166, 35]
        hookData.cell.styles.textColor = [17, 24, 39]
      }
    },
  })

  const footerY = doc.lastAutoTable.finalY + 18
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, footerY)
  doc.text('Authorized Signature ____________________', pageWidth - 14, footerY, { align: 'right' })

  return doc
}

export const openPaymentSlipPDF = async (slip, student, hall) => {
  const doc = await generatePaymentSlipPDF(slip, student, hall)
  const blobUrl = doc.output('bloburl')
  window.open(blobUrl, '_blank', 'noopener,noreferrer')
}

export const createPaymentSlipBlobUrl = async (slip, student, hall) => {
  const doc = await generatePaymentSlipPDF(slip, student, hall)
  const blob = doc.output('blob')
  return URL.createObjectURL(blob)
}

export const downloadPaymentSlipPDF = async (slip, student, hall) => {
  const doc = await generatePaymentSlipPDF(slip, student, hall)
  doc.save(`${student?.student_id || 'student'}-${slip.billing_month}-payment-slip.pdf`)
}