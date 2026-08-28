import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { LegalDoc, Lang } from './content'
import '../store/store.css'
import './legal.css'

/** Kênh liên hệ in ở chân hai trang pháp lý, lấy từ cấu hình công khai. */
interface ContactChannel {
  contactEmail: string
  zaloLink: string
}

/**
 * Khung chung của trang Quyền riêng tư và trang Điều khoản sử dụng: cùng bảng
 * thực đơn bistro với Trang bán, thêm nút chuyển bản tiếng Việt và tiếng Anh.
 */
export default function LegalPage({ doc }: { doc: LegalDoc }) {
  const [lang, setLang] = useState<Lang>('vi')
  const [contact, setContact] = useState<ContactChannel>({ contactEmail: '', zaloLink: '' })
  const t = doc[lang]

  // Cấu hình có thể chưa khai kênh liên hệ; lỗi mạng cũng không được làm trắng
  // trang, nên nuốt lỗi và trang tự rơi về câu nhắn trực tiếp cho chủ quán.
  useEffect(() => {
    api
      .publicConfig()
      .then((c) => setContact({ contactEmail: c.contactEmail, zaloLink: c.zaloLink }))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = `${t.title} • DUKIN Cafe & Bistro`
  }, [lang, t.title])

  return (
    <div className="dukin-viewport legal-viewport">
      <article className="bistro-board legal-board">
        <div className="gold-ornament top-ornament">✦ ❦ ✦</div>

        <header className="brand-header legal-header">
          <Link className="btn-back-link" to="/dat-hang">
            {t.backLabel}
          </Link>
          <p className="brand-insignia">{t.kicker}</p>
          <h1 className="brand-title-small">{t.title}</h1>
          <p className="brand-quote">{t.quote}</p>
          <div className="brand-divider">
            <span className="divider-line" />
            <span className="divider-icon">❦</span>
            <span className="divider-line" />
          </div>
          <div className="legal-lang-switch">
            <button
              type="button"
              className={`legal-lang-btn${lang === 'vi' ? ' is-on' : ''}`}
              aria-pressed={lang === 'vi'}
              onClick={() => setLang('vi')}
            >
              Tiếng Việt
            </button>
            <button
              type="button"
              className={`legal-lang-btn${lang === 'en' ? ' is-on' : ''}`}
              aria-pressed={lang === 'en'}
              onClick={() => setLang('en')}
            >
              English
            </button>
          </div>
          <p className="legal-updated">{t.updated}</p>
        </header>

        <p className="legal-intro">{t.intro}</p>

        {t.sections.map((s) => (
          <section className="legal-section" key={s.heading}>
            <h2 className="legal-heading">{s.heading}</h2>
            {s.paras?.map((p) => (
              <p className="legal-para" key={p}>
                {p}
              </p>
            ))}
            {s.bullets && (
              <ul className="legal-list">
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="legal-section legal-contact">
          <h2 className="legal-heading">{t.contactHeading}</h2>
          <p className="legal-para">{t.contactLead}</p>
          {contact.contactEmail ? (
            <p className="legal-channel">
              <span className="legal-channel-label">{t.contactEmailLabel}</span>
              <a href={`mailto:${contact.contactEmail}`}>{contact.contactEmail}</a>
            </p>
          ) : contact.zaloLink ? (
            <p className="legal-channel">
              <span className="legal-channel-label">{t.contactZaloLabel}</span>
              <a href={contact.zaloLink} target="_blank" rel="noreferrer">
                {contact.zaloLink}
              </a>
            </p>
          ) : (
            <p className="legal-para legal-no-channel">{t.contactFallback}</p>
          )}
        </section>

        <nav className="legal-nav">
          <Link className="bistro-btn btn-ghost" to={doc.otherPath}>
            {t.otherLabel}
          </Link>
          <Link className="bistro-btn btn-gold" to="/dat-hang">
            {t.backLabel}
          </Link>
        </nav>

        <div className="gold-ornament bottom-ornament">✦ ❦ ✦</div>
      </article>
    </div>
  )
}
