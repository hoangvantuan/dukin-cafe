import { useCallback, useEffect, useState } from 'react'
import { api, fmtVnd } from '../api'
import type { Stats, StatsPeriod } from '../types'

const PERIOD_TABS: Array<{ value: StatsPeriod; label: string; hint: string }> = [
  { value: 'day', label: 'Ngày', hint: '14 ngày gần nhất' },
  { value: 'week', label: 'Tuần', hint: '12 tuần gần nhất' },
  { value: 'month', label: 'Tháng', hint: '12 tháng gần nhất' },
  { value: 'year', label: 'Năm', hint: '5 năm gần nhất' },
]

const STATUS_TEXT: Record<string, string> = {
  new: 'Mới',
  confirmed: 'Đã xác nhận',
  paid: 'Đã thu tiền',
  done: 'Hoàn tất',
  cancelled: 'Đã hủy',
}

const CHANNEL_TEXT: Record<string, string> = { web: 'Trang bán', zalo: 'Zalo nhập hộ' }
const MODE_TEXT: Record<string, string> = { pickup: 'Nhận tại quán', delivery: 'Giao tận nơi' }
const PAY_TEXT: Record<string, string> = { transfer: 'Chuyển khoản', cash: 'Tiền mặt' }

/** Rút gọn tiền cho nhãn cột: 1.250.000đ thành 1,25tr. */
function shortVnd(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace('.', ',')}tr`
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`
  return String(n)
}

export default function Stats() {
  const [period, setPeriod] = useState<StatsPeriod>('day')
  const [data, setData] = useState<Stats | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setData(await api.stats(period))
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được số liệu')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    void load()
  }, [load])

  if (error) return <div className="admin-error-alert">{error}</div>
  if (!data) return <div className="admin-loading-screen"><p className="muted">Đang tính số liệu...</p></div>

  const { total, buckets } = data
  const peak = Math.max(...buckets.map((b) => b.revenue), 1)
  const pending = data.byStatus
    .filter((s) => s.status !== 'done' && s.status !== 'cancelled')
    .reduce((s, x) => s + x.count, 0)
  const hint = PERIOD_TABS.find((p) => p.value === period)?.hint ?? ''

  return (
    <div className="stats-container">
      <div className="orders-top-control">
        <div className="scope-tabs">
          {PERIOD_TABS.map((p) => (
            <button
              key={p.value}
              className={`scope-tab ${period === p.value ? 'active' : ''}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className="stats-range-hint">{hint}{loading ? ' · đang tải...' : ''}</span>
      </div>

      <div className="kpi-metrics-grid">
        <div className="kpi-card">
          <span className="kpi-title">Doanh thu</span>
          <span className="kpi-value gold">{fmtVnd(total.revenue)}</span>
          <span className="kpi-hint">Trung bình {fmtVnd(total.avgOrder)} mỗi đơn</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-title">Đơn đã nhận</span>
          <span className="kpi-value">{total.orders}</span>
          <span className="kpi-hint">{total.cancelled} đơn bị hủy</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-title">Số ly đã pha</span>
          <span className="kpi-value">{total.cups}</span>
          <span className="kpi-hint">{total.customers} khách khác nhau</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-title">Đang còn phải lo</span>
          <span className="kpi-value">{pending}</span>
          <span className="kpi-hint">Đơn chưa hoàn tất, mọi thời điểm</span>
        </div>
      </div>

      {/* BIỂU ĐỒ DOANH THU THEO KỲ */}
      <section className="admin-order-section">
        <div className="section-header">
          <h2><span className="sec-icon">📈</span> Doanh thu theo {PERIOD_TABS.find((p) => p.value === period)?.label.toLowerCase()}</h2>
          <span className="section-meta">Cao nhất <b>{fmtVnd(peak)}</b></span>
        </div>

        <div className="revenue-chart" role="img" aria-label="Biểu đồ doanh thu theo kỳ">
          {buckets.map((b) => (
            <div className="chart-col" key={b.key} title={`${b.label}: ${fmtVnd(b.revenue)} · ${b.orders} đơn · ${b.cups} ly`}>
              <span className="chart-val">{b.revenue > 0 ? shortVnd(b.revenue) : ''}</span>
              <div className="chart-bar-track">
                <div
                  className={`chart-bar ${b.revenue === peak && b.revenue > 0 ? 'is-peak' : ''}`}
                  style={{ height: `${Math.round((b.revenue / peak) * 100)}%` }}
                />
              </div>
              <span className="chart-label">{b.label}</span>
              <span className="chart-sub">{b.orders > 0 ? `${b.orders} đơn` : '·'}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="stats-two-col">
        {/* TÌNH TRẠNG ĐẶT ĐƠN */}
        <section className="admin-editor-card">
          <div className="editor-head">
            <h3>Tình trạng đặt đơn</h3>
            <span className="editor-sub">Tính trên toàn bộ đơn, kể cả đơn cũ còn treo</span>
          </div>
          <BarList
            rows={data.byStatus.map((s) => ({ label: STATUS_TEXT[s.status] ?? s.status, value: s.count }))}
            unit="đơn"
          />
        </section>

        {/* CÁCH KHÁCH ĐẶT VÀ NHẬN */}
        <section className="admin-editor-card">
          <div className="editor-head">
            <h3>Khách đặt và nhận thế nào</h3>
            <span className="editor-sub">Trong {hint.toLowerCase()}</span>
          </div>
          <BarList
            rows={[
              ...data.byChannel.map((c) => ({ label: CHANNEL_TEXT[c.channel] ?? c.channel, value: c.count })),
              ...data.byReceiveMode.map((m) => ({ label: MODE_TEXT[m.mode] ?? m.mode, value: m.count })),
              ...data.byPayment.map((p) => ({ label: PAY_TEXT[p.method] ?? p.method, value: p.count })),
            ]}
            unit="đơn"
          />
        </section>

        {/* MÓN BÁN CHẠY */}
        <section className="admin-editor-card">
          <div className="editor-head">
            <h3>Món bán chạy</h3>
            <span className="editor-sub">Trong {hint.toLowerCase()}</span>
          </div>
          {data.topItems.length === 0 ? (
            <p className="muted picker-hint">Chưa bán được ly nào trong kỳ này.</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Món</th>
                    <th className="num">Số ly</th>
                    <th className="num">Doanh thu</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topItems.map((it, i) => (
                    <tr key={i}>
                      <td>
                        <b>{it.name}</b>
                        {it.optionSummary && <span className="it-opt"> ({it.optionSummary})</span>}
                      </td>
                      <td className="num">{it.qty}</td>
                      <td className="num">{fmtVnd(it.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* KHÁCH QUEN */}
        <section className="admin-editor-card">
          <div className="editor-head">
            <h3>Khách mua nhiều nhất</h3>
            <span className="editor-sub">Trong {hint.toLowerCase()}</span>
          </div>
          {data.topCustomers.length === 0 ? (
            <p className="muted picker-hint">Chưa có khách nào trong kỳ này.</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Khách</th>
                    <th className="num">Đơn</th>
                    <th className="num">Đã chi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topCustomers.map((c, i) => (
                    <tr key={i}>
                      <td><b>{c.name}</b></td>
                      <td className="num">{c.orders}</td>
                      <td className="num">{fmtVnd(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

/** Danh sách thanh ngang, dùng chung cho các cách chia nhỏ số đơn. */
function BarList({ rows, unit }: { rows: Array<{ label: string; value: number }>; unit: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  if (rows.length === 0) return <p className="muted picker-hint">Chưa có số liệu.</p>
  return (
    <div className="bar-list">
      {rows.map((r, i) => (
        <div className="bar-row" key={i}>
          <span className="bar-label">{r.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${Math.round((r.value / max) * 100)}%` }} />
          </span>
          <span className="bar-value">
            {r.value} {unit}
          </span>
        </div>
      ))}
    </div>
  )
}
