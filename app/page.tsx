import Link from 'next/link';
import { LandingMotion } from '@/components/LandingMotion';

const skills = [
  { key: 'Reading', copy: 'Split-screen passages, highlighting and exam navigation.' },
  { key: 'Listening', copy: 'Audio-first sections with answer fields and focused timing.' },
  { key: 'Writing', copy: 'Task prompts, editor, word count and structured practice.' },
  { key: 'Speaking', copy: 'Part 1–3 flow with cue cards and confidence-building practice.' },
];

const testimonials = [
  { name: 'Jasmina', meta: 'IELTS student', quote: 'The exam-style layout made computer-based Reading feel familiar before my mock.' },
  { name: 'Sardor', meta: 'IELTS student', quote: 'I like that the platform shows what to practise next instead of only showing a score.' },
  { name: 'Ruxshona', meta: 'CEFR student', quote: 'Everything feels organised. I can open a test, finish it and understand the next step quickly.' },
];

function Brand() {
  return (
    <Link href="/" className="ark2Brand" aria-label="ARK EDUCATION bosh sahifa">
      <span className="ark2BrandMark" aria-hidden="true"><span>A</span></span>
      <span className="ark2BrandCopy"><strong>ARK EDUCATION</strong><small>IELTS EXAM PLATFORM</small></span>
    </Link>
  );
}

function AssetPlaceholder({ type, label, className = '' }: { type: string; label: string; className?: string }) {
  return <div className={`ark2Asset ark2Asset-${type} ${className}`} data-asset-slot={`/images/3d/${type}.webp`} aria-label={label} />;
}

export default function HomePage() {
  return (
    <div className="arkLandingV2" id="top">
      <LandingMotion />

      <header className="ark2Header">
        <div className="ark2Shell ark2HeaderInner">
          <Brand />
          <nav className="ark2Nav" aria-label="Landing navigation">
            <a href="#top">Home</a>
            <Link href="/dashboard">Practice</Link>
            <Link href="/mock">Mock Exam</Link>
            <a href="#features">Features</a>
            <a href="#results">Results</a>
          </nav>
          <div className="ark2HeaderActions">
            <Link className="ark2Login" href="/login">Log in</Link>
            <Link className="ark2Button ark2ButtonPrimary ark2HeaderCta" href="/dashboard">Start Practice <span>→</span></Link>
          </div>
        </div>
      </header>

      <main>
        <section className="ark2Hero">
          <div className="ark2HeroGlow" aria-hidden="true" />
          <div className="ark2Shell ark2HeroGrid">
            <div className="ark2HeroCopy" data-reveal="up">
              <div className="ark2Badge"><span className="ark2BadgeDot" /> Real IELTS Exam Experience</div>
              <h1>Practice IELTS like <em>the real exam.</em></h1>
              <p>Train with realistic Reading, Listening, Writing and Speaking tests designed to help you perform confidently on exam day.</p>
              <div className="ark2HeroActions">
                <Link className="ark2Button ark2ButtonPrimary ark2ButtonLarge" href="/dashboard">Start Free Practice <span>→</span></Link>
                <Link className="ark2Button ark2ButtonSecondary ark2ButtonLarge" href="/mock">Explore Mock Exams <span>↗</span></Link>
              </div>
              <div className="ark2HeroMicro"><span>✓ No complicated setup</span><span>✓ Start instantly</span><span>✓ Exam-focused workflow</span></div>
              <div className="ark2TrustMini">
                <div className="ark2AvatarStack"><span>J</span><span>S</span><span>R</span><span>+</span></div>
                <p><strong>Built for serious IELTS students</strong><small>Practice, mock exams and progress in one place.</small></p>
              </div>
            </div>

            <div className="ark2HeroStage" data-reveal="up">
              <div className="ark2DeviceScene" data-tilt>
                <div className="ark2Laptop">
                  <div className="ark2LaptopCamera" />
                  <div className="ark2LaptopScreen">
                    <div className="ark2ExamTopbar">
                      <div><span className="ark2MiniMark">A</span><strong>ARK IELTS</strong></div>
                      <span>Academic Reading</span>
                      <b>18:42</b>
                    </div>
                    <div className="ark2ExamSubbar"><strong>Passage 2</strong><span>Questions 14–26</span><em>Secure exam mode</em></div>
                    <div className="ark2ExamBody">
                      <article className="ark2Passage">
                        <small>READING PASSAGE</small>
                        <h3>Why focused practice works</h3>
                        <p>Students improve faster when practice is followed by clear analysis. A strong system identifies recurring mistakes and turns every result into a focused next step.</p>
                        <p>The aim is not simply to complete more tests, but to understand <mark>why an answer was right or wrong</mark> and what should be trained next.</p>
                      </article>
                      <article className="ark2Questions">
                        <div className="ark2QuestionMeta"><span>QUESTION 14</span><small>Choose one answer</small></div>
                        <h3>Effective practice should:</h3>
                        <div className="ark2Option"><span>A</span><p>focus only on speed</p></div>
                        <div className="ark2Option active"><span>B</span><p>identify mistakes and guide the next step</p><b>✓</b></div>
                        <div className="ark2Option"><span>C</span><p>avoid reviewing previous answers</p></div>
                        <div className="ark2ExamNavigator"><span className="done">14</span><span>15</span><span>16</span><span>17</span><span>18</span><button type="button" tabIndex={-1}>Review later</button></div>
                      </article>
                    </div>
                  </div>
                  <div className="ark2LaptopBase"><span /></div>
                </div>

                <AssetPlaceholder type="headphones" label="Listening headphones placeholder" className="ark2FloatAsset ark2FloatOne" />
                <AssetPlaceholder type="microphone" label="Speaking microphone placeholder" className="ark2FloatAsset ark2FloatTwo" />
                <AssetPlaceholder type="score-card" label="IELTS score card placeholder" className="ark2FloatAsset ark2FloatThree" />
                <AssetPlaceholder type="document" label="Reading document placeholder" className="ark2FloatAsset ark2FloatFour" />
              </div>
              <div className="ark2AssetNote"><span>3D asset family ready</span><small>Transparent WebP/PNG slots · white / blue studio style</small></div>
            </div>
          </div>
        </section>

        <section className="ark2Stats" aria-label="Platform statistics">
          <div className="ark2Shell ark2StatsInner">
            <div><strong>100+</strong><span>Practice Tests</span></div>
            <div><strong>4</strong><span>IELTS Skills</span></div>
            <div><strong>Real</strong><span>Exam Interface</span></div>
            <div><strong>Detailed</strong><span>Result Analysis</span></div>
          </div>
        </section>

        <section className="ark2Section ark2Features" id="features">
          <div className="ark2Shell">
            <div className="ark2SectionHead" data-reveal="up">
              <div><span className="ark2Eyebrow">COMPLETE IELTS PREPARATION</span><h2>Everything you need to prepare smarter.</h2></div>
              <p>One focused environment for all four IELTS skills, built around realistic practice rather than generic lesson cards.</p>
            </div>

            <div className="ark2SkillGrid">
              <article className="ark2SkillCard ark2SkillReading" data-reveal="up">
                <div className="ark2SkillIntro"><span className="ark2SkillNumber">01</span><div><small>READING</small><h3>Practice Reading in a real exam environment.</h3><p>Split-screen passages, highlighting, navigation and review states mirror the computer-based workflow.</p></div></div>
                <div className="ark2ReadingPreview">
                  <div className="ark2PreviewBar"><span>Reading Passage 1</span><b>24:16</b></div>
                  <div className="ark2ReadingSplit"><p>Research into learning behaviour suggests that focused review can improve long-term retention. <mark>Students benefit most when mistakes are analysed immediately.</mark></p><div><small>Questions 1–4</small><strong>1. Choose the best answer</strong><span className="selected">B · analyse errors after practice</span><span>C · repeat without review</span><span>D · focus only on speed</span></div></div>
                </div>
                <Link href="/ielts">Explore Reading <span>→</span></Link>
              </article>

              <article className="ark2SkillCard ark2SkillListening" data-reveal="up">
                <div className="ark2SkillIntro compact"><span className="ark2SkillNumber">02</span><div><small>LISTENING</small><h3>Train under real test conditions.</h3><p>Audio-first practice with section navigation and clean answer fields.</p></div></div>
                <div className="ark2ListeningVisual">
                  <AssetPlaceholder type="headphones" label="Premium headphones placeholder" />
                  <div className="ark2AudioUi"><div><span>Section 3</span><b>08:42</b></div><div className="ark2Wave"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="ark2AudioProgress"><span /></div></div>
                </div>
                <Link href="/ielts">Explore Listening <span>→</span></Link>
              </article>

              <article className="ark2SkillCard ark2SkillWriting" data-reveal="up">
                <div className="ark2SkillIntro compact"><span className="ark2SkillNumber">03</span><div><small>WRITING</small><h3>Build better writing habits.</h3><p>Task prompts, word count and a distraction-free writing editor.</p></div></div>
                <div className="ark2WritingPreview"><div className="ark2WritingTop"><span>Writing Task 2</span><b>Word count 268</b></div><p>Some people believe that...</p><div className="ark2WritingLines"><span/><span/><span/><span/><span className="short"/></div></div>
                <Link href="/ielts">Explore Writing <span>→</span></Link>
              </article>

              <article className="ark2SkillCard ark2SkillSpeaking" data-reveal="up">
                <div className="ark2SkillIntro compact"><span className="ark2SkillNumber">04</span><div><small>SPEAKING</small><h3>Practice speaking with confidence.</h3><p>Part 1, Part 2 cue cards and Part 3 prompts in one calm flow.</p></div></div>
                <div className="ark2SpeakingVisual"><AssetPlaceholder type="microphone" label="Premium microphone placeholder" /><div><span>PART 2</span><strong>01:24</strong><small>Describe a place you enjoy visiting.</small></div></div>
                <Link href="/ielts">Explore Speaking <span>→</span></Link>
              </article>
            </div>
          </div>
        </section>

        <section className="ark2Section ark2PlatformPreview">
          <div className="ark2Shell">
            <div className="ark2CenteredHead" data-reveal="up"><span className="ark2Eyebrow">REAL PRODUCT EXPERIENCE</span><h2>Designed to feel like the real IELTS exam.</h2><p>Every detail is there to reduce surprises on exam day: split-screen layout, question navigation, highlighting and review states.</p></div>
            <div className="ark2BrowserMock" data-reveal="up">
              <div className="ark2BrowserChrome"><span><i/><i/><i/></span><b>ark.education/mock/reading</b><em>Secure</em></div>
              <div className="ark2BrowserContent">
                <aside><strong>READING</strong><span className="active">Passage 1</span><span>Passage 2</span><span>Passage 3</span><small>Questions<br/><b>1–13</b></small></aside>
                <article><small>READING PASSAGE 1</small><h3>How cities adapt to changing transport</h3><p>Urban transport systems have changed considerably over the last century. Public authorities increasingly balance efficiency, accessibility and environmental impact when planning new infrastructure.</p><p>In many cities, the most successful projects combine multiple forms of transport and give passengers <mark>clear connections between services</mark>.</p></article>
                <section><div className="ark2BrowserQuestionHead"><span>Question 3</span><small>TRUE / FALSE / NOT GIVEN</small></div><h3>Transport projects are most effective when different services are connected.</h3><label><span>A</span> TRUE</label><label className="chosen"><span>B</span> FALSE</label><label><span>C</span> NOT GIVEN</label><div className="ark2QuestionRail"><span>1</span><span>2</span><span className="current">3</span><span>4</span><span>5</span><span>6</span><button type="button" tabIndex={-1}>Review</button></div></section>
              </div>
              <span className="ark2Annotation a1">Highlight text</span><span className="ark2Annotation a2">Question navigation</span><span className="ark2Annotation a3">Review answers</span>
            </div>
          </div>
        </section>

        <section className="ark2Section ark2How" id="how">
          <div className="ark2Shell ark2HowLayout">
            <div className="ark2HowCopy" data-reveal="up"><span className="ark2Eyebrow">HOW IT WORKS</span><h2>Four steps. One clear practice system.</h2><p>No complicated setup and no clutter. ARK keeps the journey from first test to focused improvement simple.</p><Link className="ark2Button ark2ButtonSecondary" href="/dashboard">Open Dashboard <span>→</span></Link></div>
            <div className="ark2Steps">
              <article data-reveal="up"><span>01</span><div><h3>Create an account</h3><p>Sign in once and keep your practice organised.</p></div></article>
              <article data-reveal="up"><span>02</span><div><h3>Choose a skill</h3><p>Reading, Listening, Writing or Speaking.</p></div></article>
              <article data-reveal="up"><span>03</span><div><h3>Start practising</h3><p>Work in an exam-focused interface.</p></div></article>
              <article data-reveal="up"><span>04</span><div><h3>Track your progress</h3><p>Use results to decide exactly what comes next.</p></div></article>
            </div>
          </div>
        </section>

        <section className="ark2MockSection">
          <div className="ark2Shell ark2MockGrid">
            <div className="ark2MockCopy" data-reveal="up"><span className="ark2Eyebrow light">FULL MOCK EXAM</span><h2>Ready for a complete IELTS mock?</h2><p>Take a computer-based mock in a realistic environment and see how your performance looks across the full test workflow.</p><div className="ark2MockChecks"><span>✓ Reading</span><span>✓ Listening</span><span>✓ Writing</span><span>✓ Speaking</span><span>✓ Detailed report</span><span>✓ Scoring where available</span></div><Link className="ark2Button ark2ButtonLight ark2ButtonLarge" href="/mock">Start Mock Exam <span>→</span></Link></div>
            <div className="ark2MockVisual" data-reveal="up"><div className="ark2MockWindow"><div className="ark2MockWindowTop"><span>ARK MOCK</span><b>Full IELTS</b></div><div className="ark2MockWindowBody"><aside><span className="done">✓</span><p>Listening<small>Completed</small></p><span className="current">2</span><p>Reading<small>In progress</small></p><span>3</span><p>Writing<small>Next</small></p><span>4</span><p>Speaking<small>Scheduled</small></p></aside><section><div className="ark2MockScore"><small>Current pace</small><strong>7.5</strong><span>Estimated band</span></div><div className="ark2MockRings"><i/><i/><i/></div><div className="ark2MockProgress"><span style={{width:'68%'}} /></div><p>26 of 40 questions reviewed</p></section></div></div><AssetPlaceholder type="score-card" label="Premium result card placeholder" className="ark2MockAsset" /></div>
          </div>
        </section>

        <section className="ark2Section ark2Results" id="results">
          <div className="ark2Shell">
            <div className="ark2SectionHead" data-reveal="up"><div><span className="ark2Eyebrow">RESULTS & ANALYTICS</span><h2>See exactly where you need to improve.</h2></div><p>Clean performance data turns every practice session into a useful next step instead of a score you forget.</p></div>
            <div className="ark2ResultsGrid">
              <div className="ark2AnalyticsCard" data-reveal="up">
                <div className="ark2AnalyticsTop"><div><small>OVERALL PROGRESS</small><h3>Your performance</h3></div><span>Last 30 days</span></div>
                <div className="ark2AnalyticsStats"><div><strong>7.5</strong><span>Reading</span></div><div><strong>8.0</strong><span>Listening</span></div><div><strong>6.5</strong><span>Writing</span></div><div><strong>7.0</strong><span>Speaking</span></div></div>
                <div className="ark2AnalyticsChart"><div className="ark2ChartGrid"><i/><i/><i/><i/></div><svg viewBox="0 0 720 220" aria-hidden="true"><defs><linearGradient id="ark2Fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity=".2"/><stop offset="100%" stopColor="#2563eb" stopOpacity="0"/></linearGradient></defs><path className="area" d="M0 188 C110 176 134 164 220 170 S360 118 450 128 S590 72 720 48 L720 220 L0 220 Z"/><path className="line" d="M0 188 C110 176 134 164 220 170 S360 118 450 128 S590 72 720 48"/><circle cx="720" cy="48" r="7"/></svg><div><span>Week 1</span><span>Week 2</span><span>Week 3</span><span>Week 4</span></div></div>
              </div>

              <div className="ark2DetailedResult" data-reveal="up">
                <div className="ark2ResultHead"><div><small>READING MOCK #07</small><h3>Detailed result</h3></div><span>Completed</span></div>
                <div className="ark2ResultScore"><div><strong>32<span>/40</span></strong><small>Correct answers</small></div><div><strong>7.5</strong><small>Estimated Band</small></div></div>
                <div className="ark2ResultBreakdown"><span><i className="good"/>32 Correct</span><span><i className="bad"/>6 Incorrect</span><span><i className="empty"/>2 Unanswered</span></div>
                <div className="ark2ResultRows"><div><span>14</span><p><strong>Correct</strong><small>Keyword match · evidence found</small></p><b>✓</b></div><div><span>15</span><p><strong>Review needed</strong><small>Distractor selected</small></p><b className="bad">×</b></div><div><span>16</span><p><strong>Correct</strong><small>Paraphrase identified</small></p><b>✓</b></div></div>
                <Link href="/dashboard">Open results dashboard <span>→</span></Link>
              </div>
            </div>
          </div>
        </section>

        <section className="ark2Section ark2Why">
          <div className="ark2Shell">
            <div className="ark2CenteredHead narrow" data-reveal="up"><span className="ark2Eyebrow">WHY ARK EDUCATION</span><h2>Built for students who take IELTS seriously.</h2></div>
            <div className="ark2WhyGrid">
              <article data-reveal="up"><span>01</span><h3>Realistic IELTS interface</h3><p>Practice inside layouts that feel familiar on computer-based exam day.</p></article>
              <article data-reveal="up"><span>02</span><h3>High-quality practice tests</h3><p>Focused content organised by skill, mock type and learning purpose.</p></article>
              <article data-reveal="up"><span>03</span><h3>Detailed performance analysis</h3><p>Use mistakes, scores and trends to make your next practice more useful.</p></article>
              <article data-reveal="up"><span>04</span><h3>Serious, distraction-free design</h3><p>No childish visuals or noisy dashboards. The exam remains the focus.</p></article>
            </div>
          </div>
        </section>

        <section className="ark2Section ark2Testimonials">
          <div className="ark2Shell">
            <div className="ark2SectionHead compact" data-reveal="up"><div><span className="ark2Eyebrow">STUDENT EXPERIENCE</span><h2>A calmer way to prepare.</h2></div><p>Short feedback from students using ARK-style exam practice.</p></div>
            <div className="ark2TestimonialGrid">{testimonials.map((item, index) => <article data-reveal="up" key={item.name}><div className="ark2QuoteMark">“</div><p>{item.quote}</p><div><span>{item.name.charAt(0)}</span><strong>{item.name}<small>{item.meta}</small></strong><em>0{index + 1}</em></div></article>)}</div>
          </div>
        </section>

        <section className="ark2FinalCta">
          <div className="ark2Shell ark2FinalCard" data-reveal="up">
            <div><span className="ark2Eyebrow light">START PRACTISING</span><h2>Start preparing for IELTS today.</h2><p>Experience realistic IELTS practice and build the confidence you need for exam day.</p><div className="ark2HeroActions"><Link className="ark2Button ark2ButtonLight ark2ButtonLarge" href="/dashboard">Start Free Practice <span>→</span></Link><Link className="ark2Button ark2ButtonDarkGhost ark2ButtonLarge" href="/mock">Take a Mock Exam <span>↗</span></Link></div></div>
            <div className="ark2FinalVisual"><AssetPlaceholder type="score-card" label="Premium score card placeholder" /><AssetPlaceholder type="document" label="Premium exam document placeholder" /></div>
          </div>
        </section>
      </main>

      <footer className="ark2Footer">
        <div className="ark2Shell ark2FooterGrid">
          <div className="ark2FooterBrand"><Brand /><p>Professional IELTS practice, mock exams and progress tracking in one focused platform.</p></div>
          <div><strong>Platform</strong><Link href="/dashboard">Practice</Link><Link href="/mock">Mock Exam</Link><a href="#results">Results</a></div>
          <div><strong>IELTS Skills</strong><Link href="/ielts">Reading</Link><Link href="/ielts">Listening</Link><Link href="/ielts">Writing</Link><Link href="/ielts">Speaking</Link></div>
          <div><strong>Resources</strong><a href="#features">Features</a><a href="#how">How it works</a><Link href="/login">Log in</Link></div>
          <div><strong>Contact</strong><a href="https://t.me/arkedu_bot" target="_blank" rel="noopener noreferrer">Telegram</a><span>ARK EDUCATION</span><span>Uzbekistan</span></div>
        </div>
        <div className="ark2Shell ark2FooterBottom"><span>© 2026 ARK EDUCATION. All rights reserved.</span><span>IELTS · CEFR · MOCK · PRACTICE</span></div>
      </footer>
    </div>
  );
}
