import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import type { TeamMember } from '../types'

/**
 * Danh sách đồng nghiệp trong nhóm Teams, tải một lần rồi dùng chung.
 * Teams chỉ gắn thẻ được bằng mã 29:..., không nhận email hay Object ID của Azure,
 * nên mọi chỗ liên kết người đều chọn từ đây thay vì gõ tay.
 */
export function useTeamMembers(): {
  members: TeamMember[]
  loading: boolean
  error: string
  loaded: boolean
  load: () => void
} {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    api
      .teamMembers()
      .then((r) => {
        setMembers(r.members)
        setLoaded(true)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { members, loading, error, loaded, load }
}

function matches(m: TeamMember, q: string): boolean {
  const k = q.trim().toLowerCase()
  if (!k) return true
  return m.name.toLowerCase().includes(k) || m.email.toLowerCase().includes(k)
}

/** Chữ đầu của tên, làm ảnh đại diện đỡ trống trải. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')).toUpperCase()
}

/**
 * Ô tìm và chọn người trong nhóm Teams.
 * mode 'one' dùng khi liên kết một Khách với một tài khoản Teams;
 * mode 'many' dùng khi chọn nhiều người phụ trách nhận thông báo đơn mới.
 */
export function MemberPicker({
  mode,
  selectedIds,
  onPick,
  onClose,
  autoFocus = true,
}: {
  mode: 'one' | 'many'
  selectedIds: string[]
  onPick: (member: TeamMember) => void
  onClose?: () => void
  autoFocus?: boolean
}) {
  const { members, loading, error, loaded, load } = useTeamMembers()
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!loaded && !loading && !error) load()
  }, [loaded, loading, error, load])

  const found = members.filter((m) => matches(m, q))

  return (
    <div className="member-picker">
      <div className="picker-search-row">
        <input
          className="admin-input picker-search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Gõ tên hoặc email để tìm..."
        />
        <button className="btn-admin-light" onClick={load} disabled={loading} title="Tải lại từ Teams">
          {loading ? '...' : '↻'}
        </button>
        {onClose && (
          <button className="btn-admin-light" onClick={onClose}>
            Đóng
          </button>
        )}
      </div>

      {error && <div className="admin-error-alert picker-error">{error}</div>}
      {loading && !loaded && <p className="muted picker-hint">Đang đọc danh sách nhóm Teams...</p>}

      {loaded && (
        <div className="picker-list">
          {found.map((m) => {
            const picked = selectedIds.includes(m.teamsId)
            return (
              <button
                key={m.teamsId}
                type="button"
                className={`picker-row ${picked ? 'picked' : ''}`}
                onClick={() => onPick(m)}
              >
                <span className="picker-avatar">{initials(m.name)}</span>
                <span className="picker-who">
                  <b>{m.name}</b>
                  <small>{m.email || m.teamsId.slice(0, 24) + '...'}</small>
                </span>
                <span className="picker-mark">
                  {picked ? (mode === 'many' ? '✓ Đã chọn' : '✓') : mode === 'many' ? '+ Chọn' : ''}
                </span>
              </button>
            )
          })}
          {found.length === 0 && (
            <p className="muted picker-hint">
              {members.length === 0
                ? 'Nhóm Teams chưa có ai, hoặc bot chưa được cài vào nhóm.'
                : `Không ai khớp "${q}".`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
