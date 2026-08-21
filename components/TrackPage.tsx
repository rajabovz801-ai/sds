import Link from 'next/link';
import { Header } from './Header';
import { getTelegramRegistrationUrl, type Track } from '@/lib/telegram';

export function TrackPage({ track, title, subtitle, mocks }: {
  track: Track;
  title: string;
  subtitle: string;
  mocks: readonly { title: string; meta: string; status: string }[];
}) {
  const telegramUrl = getTelegramRegistrationUrl(track);

  return (
    <>
      <Header />
      <main>
        <section className="trackHero">
          <div className="shell">
            <Link href="/" className="backLink">← Bo‘limlarga qaytish</Link>
            <div className="trackHeroGrid">
              <div>
                <span className="eyebrow">ARK MOCK PLATFORM</span>
                <h1>{title}</h1>
                <p>{subtitle}</p>
              </div>
              <div className="registrationBox">
                <span>1-qadam</span>
                <h3>Telegram orqali ro‘yxatdan o‘ting</h3>
                <p>Bot yo‘nalishingizni avtomatik aniqlaydi va keyingi bosqichlarni yuboradi.</p>
                <a href={telegramUrl} target="_blank" rel="noreferrer" className="telegramButton">Telegram botga o‘tish ↗</a>
              </div>
            </div>
          </div>
        </section>

        <section className="mockSection">
          <div className="shell">
            <div className="sectionTitle">
              <div><span className="eyebrow">MOCK TESTS</span><h2>Mavjud testlar</h2></div>
              <span className="smallMuted">Yangi testlar shu yerga qo‘shiladi</span>
            </div>
            <div className="mockGrid">
              {mocks.map((mock, index) => (
                <article className="mockCard" key={mock.title}>
                  <div className="mockNumber">{String(index + 1).padStart(2, '0')}</div>
                  <div className="mockBody"><h3>{mock.title}</h3><p>{mock.meta}</p></div>
                  <span className="statusBadge">{mock.status}</span>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
