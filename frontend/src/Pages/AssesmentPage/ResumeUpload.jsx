import React, { useRef, useState } from 'react'
import { ACCEPT, readResume } from './resumeparser'

/* Drag-and-drop / click upload box. Reads the resume and calls onApply({ skills, extra, degree, mbti, text }). */
const ResumeUpload = ({ catalog, onApply }) => {
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState(null) // { name, skills, extra }

  const handle = async (file) => {
    if (!file || busy) return
    setError('')
    setInfo(null)
    setBusy(true)
    try {
      const result = await readResume(file, catalog)
      onApply(result)
      setInfo({ name: file.name, skills: result.skills, extra: result.extra })
    } catch (err) {
      setError(err.message || 'Could not read this resume.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-dashed border-[#cdbb9f] bg-white p-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]) }}
        className={`flex flex-col items-center gap-2 rounded-xl px-4 py-5 text-center transition ${
          drag ? 'bg-[#f2c230]/20' : 'bg-[#fbf6ee]'
        }`}
      >
        <p className="text-sm font-extrabold text-black">Upload your resume for better matches</p>
        <p className="max-w-sm text-xs leading-relaxed text-neutral-600">
          PDF, Word (.docx) or a photo/screenshot (PNG, JPG). We read it and tick the skills we find. You can
          still edit everything afterwards.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handle(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="mt-1 rounded-full bg-[#0b0b2b] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#1a1a4a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Reading resume…' : info ? 'Upload a different resume' : 'Choose file'}
        </button>
        {busy && <p className="text-xs text-neutral-500">Scanned files and images can take a few seconds.</p>}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}

      {info && (
        <div className="mt-3 text-xs text-neutral-700">
          <p className="font-bold text-[#0b0b2b]">
            ✓ {info.name}: {info.skills.length + info.extra.length} skill
            {info.skills.length + info.extra.length === 1 ? '' : 's'} found and added
          </p>
          {info.skills.length + info.extra.length === 0 && (
            <p className="mt-1 text-neutral-500">
              No known skills detected. Try a clearer file, or pick your skills below.
            </p>
          )}
          {info.extra.length > 0 && (
            <p className="mt-1 text-neutral-500">
              Not in our list, added to &quot;Add Other Skills&quot;: {info.extra.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default ResumeUpload