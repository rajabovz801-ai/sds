import Link from 'next/link';
import { ArrowLeftIcon, CheckCircleIcon, FileTextIcon } from '@/components/UiIcons';
import type { AttemptReview } from '@/lib/progressAttempts';

export function AttemptReviewPanel({ attempt }: { attempt: AttemptReview }) {
  return (
    <div className="attemptReviewPage">
      <Link className="attemptReviewBack" href="/progress"><ArrowLeftIcon /> Progress</Link>

      <header className="attemptReviewHero">
        <div>
          <span className="routeRedEyebrow">ATTEMPT REVIEW</span>
          <h1>{attempt.title}</h1>
          <p>{attempt.part} · {attempt.skill}</p>
        </div>
        <div className="attemptReviewScore">
          <small>Score</small>
          <strong>{attempt.percentage === null ? '—' : `${attempt.percentage}%`}</strong>
          <span>{attempt.correctCount}/{attempt.maxScore ?? 0} correct</span>
        </div>
      </header>

      <section className="attemptReviewList">
        <header><span><FileTextIcon /></span><h2>Answers</h2></header>
        {attempt.answers.length ? attempt.answers.map((item) => (
          <article key={item.id} className={item.correct ? 'correct' : 'wrong'}>
            <span className="attemptQuestionId">{item.id.replace(/^q/i, '')}</span>
            <div>
              <small>Your answer</small>
              <strong>{item.answer || 'No answer'}</strong>
              {!item.correct && <p>Correct answer: <b>{item.correctAnswer || '—'}</b></p>}
            </div>
            <span className="attemptAnswerStatus"><CheckCircleIcon /></span>
          </article>
        )) : <div className="routeEmptyState">Detailed answer review is not available for this attempt.</div>}
      </section>
    </div>
  );
}
