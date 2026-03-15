import { Eye, EyeOff, KeyRound, Pencil, RefreshCw, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import CustomDropdown from '../../components/shared/CustomDropdown'
import { STUDENT_CATEGORIES } from '../../constants'
import { supabase } from '../../lib/supabaseClient'
import { useAuthStore } from '../../store/authStore'
import { hashPassword } from '../../utils/hashUtils'

const makeRandomPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const seed = `${Date.now()}${Math.random()}`.replace('.', '')
  let password = ''

  for (let i = 0; i < 8; i += 1) {
    const index = Number(seed[(i * 2) % seed.length] || i)
    password += chars[(index + i * 7 + Math.floor(Math.random() * chars.length)) % chars.length]
  }

  return password
}

export default function ViewAccountsPasswords() {
  const user = useAuthStore((state) => state.user)

  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [batchFilter, setBatchFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState({ key: 'student_id', direction: 'asc' })
  const [visiblePasswords, setVisiblePasswords] = useState({})

  const [editingStudent, setEditingStudent] = useState(null)
  const [resetTarget, setResetTarget] = useState(null)
  const [resetPassword, setResetPassword] = useState(makeRandomPassword())
  const [confirmPassword, setConfirmPassword] = useState('')

  const refreshStudents = async () => {
    if (!user?.hall_id) {
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('students')
      .select('id, student_id, name, department, batch, category, password_plain, hall_id, halls(name)')
      .eq('hall_id', user.hall_id)

    if (error) {
      toast.error(error.message || 'Failed to load accounts')
      setStudents([])
    } else {
      setStudents(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    refreshStudents()
  }, [user?.hall_id])

  const departmentOptions = useMemo(() => {
    const uniqueDepartments = [...new Set(students.map((student) => student.department).filter(Boolean))]
    return [{ value: 'all', label: 'All Departments' }, ...uniqueDepartments.map((value) => ({ value, label: value }))]
  }, [students])

  const batchOptions = useMemo(() => {
    const uniqueBatches = [...new Set(students.map((student) => student.batch).filter(Boolean))]
    return [{ value: 'all', label: 'All Batches' }, ...uniqueBatches.map((value) => ({ value, label: value }))]
  }, [students])

  const categoryOptions = useMemo(
    () => [{ value: 'all', label: 'All Categories' }, ...STUDENT_CATEGORIES],
    [],
  )

  const filteredStudents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const searched = students.filter((student) => {
      const matchesSearch =
        !normalizedSearch ||
        student.student_id.toLowerCase().includes(normalizedSearch) ||
        student.name.toLowerCase().includes(normalizedSearch)

      const matchesDepartment = departmentFilter === 'all' || student.department === departmentFilter
      const matchesBatch = batchFilter === 'all' || student.batch === batchFilter
      const matchesCategory = categoryFilter === 'all' || student.category === categoryFilter

      return matchesSearch && matchesDepartment && matchesBatch && matchesCategory
    })

    return [...searched].sort((first, second) => {
      const firstValue = String(first[sortBy.key] ?? '').toLowerCase()
      const secondValue = String(second[sortBy.key] ?? '').toLowerCase()

      if (firstValue === secondValue) {
        return 0
      }

      const comparison = firstValue > secondValue ? 1 : -1
      return sortBy.direction === 'asc' ? comparison : -comparison
    })
  }, [batchFilter, categoryFilter, departmentFilter, searchTerm, sortBy, students])

  const toggleSort = (key) => {
    setSortBy((previous) => {
      if (previous.key === key) {
        return { key, direction: previous.direction === 'asc' ? 'desc' : 'asc' }
      }

      return { key, direction: 'asc' }
    })
  }

  const updateStudent = async (event) => {
    event.preventDefault()
    if (!editingStudent) {
      return
    }

    const { error } = await supabase
      .from('students')
      .update({
        department: editingStudent.department.trim(),
        batch: editingStudent.batch.trim(),
        category: editingStudent.category,
      })
      .eq('id', editingStudent.id)

    if (error) {
      toast.error(error.message || 'Failed to update student')
      return
    }

    toast.success('Student account updated')
    setEditingStudent(null)
    refreshStudents()
  }

  const submitResetPassword = async (event) => {
    event.preventDefault()

    if (!resetTarget) {
      return
    }

    if (!resetPassword || resetPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    const { error } = await supabase
      .from('students')
      .update({ password_plain: resetPassword, password_hash: hashPassword(resetPassword) })
      .eq('id', resetTarget.id)

    if (error) {
      toast.error(error.message || 'Failed to reset password')
      return
    }

    toast.success('Password reset complete')
    setResetTarget(null)
    setResetPassword(makeRandomPassword())
    setConfirmPassword('')
    refreshStudents()
  }

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
        <h1 className="text-2xl font-bold text-slate-900">View Accounts & Passwords</h1>
        <p className="mt-1 text-sm text-slate-600">Provost-only student account management</p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <label className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by student ID or name"
              className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
            />
          </label>

          <CustomDropdown
            options={departmentOptions}
            value={departmentFilter}
            onChange={setDepartmentFilter}
            placeholder="Filter by department"
            searchable
          />

          <CustomDropdown
            options={batchOptions}
            value={batchFilter}
            onChange={setBatchFilter}
            placeholder="Filter by batch"
            searchable
          />

          <div className="lg:col-span-4 xl:w-80">
            <CustomDropdown
              options={categoryOptions}
              value={categoryFilter}
              onChange={setCategoryFilter}
              placeholder="Filter by category"
              searchable
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-soft">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {[
                ['student_id', 'Student ID'],
                ['name', 'Name'],
                ['department', 'Department'],
                ['batch', 'Batch'],
                ['hall', 'Hall'],
                ['category', 'Category'],
              ].map(([key, label]) => (
                <th key={key} className="px-4 py-3 font-semibold">
                  <button
                    type="button"
                    onClick={() => toggleSort(key === 'hall' ? 'hall_id' : key)}
                    className="inline-flex items-center gap-1 hover:text-primary"
                  >
                    {label}
                  </button>
                </th>
              ))}
              <th className="px-4 py-3 font-semibold">Password</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  Loading accounts...
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                  No student records found for the current filters.
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => {
                const isPasswordVisible = Boolean(visiblePasswords[student.id])

                return (
                  <tr key={student.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{student.student_id}</td>
                    <td className="px-4 py-3">{student.name}</td>
                    <td className="px-4 py-3">{student.department}</td>
                    <td className="px-4 py-3">{student.batch}</td>
                    <td className="px-4 py-3">{student.halls?.name || '-'}</td>
                    <td className="px-4 py-3">{student.category}</td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                        <span className="font-mono text-xs text-slate-700">
                          {isPasswordVisible ? student.password_plain : '••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setVisiblePasswords((previous) => ({
                              ...previous,
                              [student.id]: !previous[student.id],
                            }))
                          }
                          className="text-slate-600 hover:text-primary"
                          aria-label="Toggle password"
                        >
                          {isPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingStudent({ ...student })}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResetTarget(student)
                            const generated = makeRandomPassword()
                            setResetPassword(generated)
                            setConfirmPassword(generated)
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          <KeyRound className="h-3.5 w-3.5" /> Reset Password
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {editingStudent && (
        <ModalShell title={`Edit ${editingStudent.student_id}`} onClose={() => setEditingStudent(null)}>
          <form onSubmit={updateStudent} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Department</span>
              <input
                value={editingStudent.department}
                onChange={(event) =>
                  setEditingStudent((previous) => ({ ...previous, department: event.target.value }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Batch</span>
              <input
                value={editingStudent.batch}
                onChange={(event) =>
                  setEditingStudent((previous) => ({ ...previous, batch: event.target.value }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Category</span>
              <CustomDropdown
                options={STUDENT_CATEGORIES}
                value={editingStudent.category}
                onChange={(nextValue) =>
                  setEditingStudent((previous) => ({ ...previous, category: nextValue }))
                }
                searchable
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Save Changes
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {resetTarget && (
        <ModalShell title={`Reset password for ${resetTarget.student_id}`} onClose={() => setResetTarget(null)}>
          <form onSubmit={submitResetPassword} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">New Password</span>
              <div className="flex gap-2">
                <input
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
                />
                <button
                  type="button"
                  onClick={() => {
                    const generated = makeRandomPassword()
                    setResetPassword(generated)
                    setConfirmPassword(generated)
                  }}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-3 py-2 text-slate-700 hover:bg-slate-100"
                  aria-label="Generate"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Confirm Password</span>
              <input
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none ring-primary focus:border-primary focus:ring-2"
              />
            </label>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Update Password
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </section>
  )
}

function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}