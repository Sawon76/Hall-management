import '@react-pdf-viewer/core/lib/styles/index.css'
import '@react-pdf-viewer/default-layout/lib/styles/index.css'

import { Worker, Viewer } from '@react-pdf-viewer/core'
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout'
import { FileText } from 'lucide-react'
import { useMemo } from 'react'

export default function PDFViewer({ fileUrl, height = '60vh' }) {
  const defaultLayoutPluginInstance = useMemo(() => defaultLayoutPlugin(), [])

  if (!fileUrl) {
    return (
      <div className="flex h-[60vh] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500">
        <div className="text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-slate-400" />
          <p className="text-sm font-medium">Select a payment slip to preview the PDF.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-soft" style={{ height }}>
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <Viewer fileUrl={fileUrl} plugins={[defaultLayoutPluginInstance]} />
      </Worker>
    </div>
  )
}