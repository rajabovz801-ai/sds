import Link from 'next/link';
import styles from './CefrSpeakingMockCard.module.css';

export function CefrSpeakingMockCard({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    <section className={styles.card}>
      <div className={styles.copy}>
        <span className={styles.eyebrow}>CEFR · SPEAKING MOCK</span>
        <h2>Speaking Mock Test 1</h2>
        <p>Part 1 va Part 1.2 · timed speaking · microphone recording · bitta to‘liq audio.</p>
        <div className={styles.facts}>
          <span>3 + 3 questions</span>
          <span>Prep timer</span>
          <span>Full recording</span>
        </div>
      </div>
      <Link className={styles.action} href="/cefr/speaking/mock-1">Start Speaking →</Link>
    </section>
  );
}
