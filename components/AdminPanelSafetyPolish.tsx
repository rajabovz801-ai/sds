export function AdminPanelSafetyPolish() {
  return (
    <style>{`
      /* Admin-only visual safety layer. No data, test, mock, auth, or API behavior lives here. */
      .adminRoot{
        --admin-ink:#10243f;
        --admin-muted:#718096;
        --admin-line:rgba(16,36,63,.09);
        --admin-line-strong:rgba(16,36,63,.14);
        --admin-surface:#ffffff;
        --admin-soft:#f7f9fc;
        --admin-blue:#173c6c;
        --admin-blue-soft:#eef4fb;
        --admin-success:#0b7660;
        --admin-shadow:0 18px 54px rgba(20,43,72,.075);
        --admin-shadow-soft:0 8px 26px rgba(20,43,72,.055);
        min-height:100vh;
        background:
          radial-gradient(circle at 8% 0%,rgba(42,105,175,.075),transparent 29%),
          radial-gradient(circle at 94% 10%,rgba(20,143,113,.055),transparent 26%),
          #f5f7fa;
        color:var(--admin-ink);
        -webkit-font-smoothing:antialiased;
        -moz-osx-font-smoothing:grayscale;
        text-rendering:optimizeLegibility;
      }

      .adminRoot *,
      .adminRoot *::before,
      .adminRoot *::after{box-sizing:border-box}

      .adminRoot .adminWorkspace{min-height:100vh;background:transparent}
      .adminRoot .adminMain{position:relative;isolation:isolate}

      /* A calmer control bar keeps dense admin actions readable while preserving structure. */
      .adminRoot .adminTopbar{
        position:sticky!important;
        top:0;
        z-index:950!important;
        border-bottom:1px solid rgba(255,255,255,.08)!important;
        background:linear-gradient(110deg,rgba(12,29,52,.985),rgba(18,47,80,.975))!important;
        box-shadow:0 10px 34px rgba(7,22,40,.16)!important;
        backdrop-filter:blur(18px);
        -webkit-backdrop-filter:blur(18px);
      }
      .adminRoot .adminBrand>span{
        box-shadow:0 8px 22px rgba(0,0,0,.13);
      }
      .adminRoot .adminSecureChip{
        border-color:rgba(132,222,190,.18)!important;
        background:rgba(54,166,128,.11)!important;
        color:#c7f3e4!important;
      }
      .adminRoot .adminNav{
        padding:4px!important;
        border:1px solid rgba(255,255,255,.07)!important;
        border-radius:13px!important;
        background:rgba(255,255,255,.045)!important;
      }
      .adminRoot .adminNav button{
        border-radius:9px!important;
        transition:background .16s ease,color .16s ease,transform .16s ease!important;
      }
      .adminRoot .adminNav button:hover{background:rgba(255,255,255,.075)!important}
      .adminRoot .adminNav button.active{
        background:#fff!important;
        color:#173c6c!important;
        box-shadow:0 5px 16px rgba(0,0,0,.12)!important;
      }

      /* Hero and KPI cards: clearer hierarchy, same DOM and same dimensions. */
      .adminRoot .adminHero{
        overflow:hidden;
        border:1px solid var(--admin-line)!important;
        border-radius:22px!important;
        background:
          radial-gradient(circle at 92% 14%,rgba(37,125,180,.10),transparent 31%),
          linear-gradient(135deg,#fff 0%,#f8fbff 58%,#f2f7fb 100%)!important;
        box-shadow:var(--admin-shadow)!important;
      }
      .adminRoot .adminHero h1{letter-spacing:-.04em!important;color:#102b52!important}
      .adminRoot .adminHero p{color:#708096!important}
      .adminRoot .adminMetrics>div{
        border-color:var(--admin-line)!important;
        background:rgba(255,255,255,.82)!important;
        box-shadow:0 6px 18px rgba(31,58,88,.035)!important;
        backdrop-filter:blur(9px);
        -webkit-backdrop-filter:blur(9px);
      }
      .adminRoot .adminMetrics>div strong{color:#102b52!important}

      /* Shared cards/panels get one consistent surface without touching module CSS internals. */
      .adminRoot .adminPanel,
      .adminRoot .adminFormCard,
      .adminRoot .adminLibrary,
      .adminRoot .adminStudentList,
      .adminRoot .adminStudentProfile,
      .adminRoot .adminAnalyticsSetup{
        border-color:var(--admin-line)!important;
        box-shadow:var(--admin-shadow-soft)!important;
      }
      .adminRoot .adminPanel,
      .adminRoot .adminFormCard,
      .adminRoot .adminLibrary,
      .adminRoot .adminStudentList,
      .adminRoot .adminStudentProfile{
        background:rgba(255,255,255,.96)!important;
      }
      .adminRoot .adminPanel:hover,
      .adminRoot .adminFormCard:hover,
      .adminRoot .adminLibrary:hover{
        border-color:var(--admin-line-strong)!important;
      }

      /* Keep high-frequency controls comfortable without changing layout structure. */
      .adminRoot button,
      .adminRoot a,
      .adminRoot input,
      .adminRoot select,
      .adminRoot textarea{font-family:inherit}
      .adminRoot button:not(:disabled),.adminRoot a{cursor:pointer}
      .adminRoot button{transition:transform .15s ease,box-shadow .15s ease,background .15s ease,border-color .15s ease}
      .adminRoot button:not(:disabled):active{transform:translateY(1px)}

      .adminRoot input,
      .adminRoot select,
      .adminRoot textarea{
        border-color:rgba(16,43,82,.12)!important;
        background:#fff!important;
        color:#17304f!important;
        box-shadow:0 1px 0 rgba(16,43,82,.015)!important;
        transition:border-color .16s ease,box-shadow .16s ease,background .16s ease!important;
      }
      .adminRoot input:hover,
      .adminRoot select:hover,
      .adminRoot textarea:hover{border-color:rgba(23,60,108,.22)!important}
      .adminRoot input:focus,
      .adminRoot select:focus,
      .adminRoot textarea:focus{
        border-color:rgba(23,60,108,.42)!important;
        box-shadow:0 0 0 4px rgba(23,60,108,.075)!important;
      }
      .adminRoot input::placeholder,.adminRoot textarea::placeholder{color:#99a6b5!important}

      .adminRoot button:focus-visible,
      .adminRoot a:focus-visible,
      .adminRoot input:focus-visible,
      .adminRoot select:focus-visible,
      .adminRoot textarea:focus-visible{
        outline:2px solid rgba(23,60,108,.48)!important;
        outline-offset:2px!important;
      }

      /* Alerts should be obvious without visually dominating the workspace. */
      .adminRoot .adminAlert{
        border-radius:14px!important;
        box-shadow:0 8px 22px rgba(20,43,72,.045)!important;
      }
      .adminRoot .adminAlertSuccess{border-color:rgba(11,118,96,.16)!important}
      .adminRoot .adminAlertError{border-color:rgba(190,54,63,.16)!important}

      /* Existing admin typography contains several 6–9px labels; raise the smallest text. */
      .adminRoot .adminMetrics small,
      .adminRoot .adminPanelHeading small,
      .adminRoot .adminSectionHeader p,
      .adminRoot .adminStudentListHead small,
      .adminRoot .adminStudentResultsHead small,
      .adminRoot .adminStudentTrend>div:first-child small,
      .adminRoot .adminSkillBars small,
      .adminRoot .adminTestCopy>div>span,
      .adminRoot .adminStudentSummary small,
      .adminRoot .adminStudentSummary span,
      .adminRoot .adminStudentResults article>div:first-child>span,
      .adminRoot .adminResultNumbers small,
      .adminRoot [class*="resultsTop"] small,
      .adminRoot [class*="metric"] small,
      .adminRoot [class*="detailCard"] small,
      .adminRoot [class*="timelineRow"] small,
      .adminRoot [class*="table"] th,
      .adminRoot [class*="status"],
      .adminRoot [class*="opsCard"] small,
      .adminRoot [class*="drawerHead"] small{
        font-size:10px!important;
        line-height:1.4!important;
      }
      .adminRoot .adminRecentResults small,
      .adminRoot .adminLeaderboard small,
      .adminRoot .adminStudentRows small,
      .adminRoot .adminStudentResults article small,
      .adminRoot [class*="studentCell"] small,
      .adminRoot [class*="testCell"] small,
      .adminRoot [class*="liveRow"] small,
      .adminRoot [class*="liveRow"]>span:last-child,
      .adminRoot [class*="detailCard"] span{
        font-size:10px!important;
        line-height:1.45!important;
      }
      .adminRoot [class*="opsCard"] span,
      .adminRoot [class*="drawerHead"] p,
      .adminRoot [class*="timelineRow"] b{font-size:10px!important;line-height:1.45!important}

      /* Prevent long names/titles from pushing actions or cards out of alignment. */
      .adminRoot .adminStudentRows>button,
      .adminRoot .adminStudentRows>button>div,
      .adminRoot .adminTestCopy,
      .adminRoot [class*="studentCell"],
      .adminRoot [class*="studentCell"]>div,
      .adminRoot [class*="testCell"],
      .adminRoot [class*="drawerHead"]>div,
      .adminRoot [class*="liveRow"]>div{min-width:0}
      .adminRoot .adminStudentRows b,
      .adminRoot .adminStudentRows small,
      .adminRoot .adminTestCopy h3,
      .adminRoot [class*="studentCell"] b,
      .adminRoot [class*="studentCell"] small,
      .adminRoot [class*="testCell"] b,
      .adminRoot [class*="testCell"] small{overflow:hidden;text-overflow:ellipsis}

      /* Student/test rows gain clear hover feedback but retain every existing action. */
      .adminRoot .adminStudentRows>button,
      .adminRoot .adminTestRow{
        transition:background .15s ease,border-color .15s ease,box-shadow .15s ease,transform .15s ease!important;
      }
      .adminRoot .adminStudentRows>button:hover,
      .adminRoot .adminTestRow:hover{
        border-color:rgba(23,60,108,.13)!important;
        background:#fbfcfe!important;
        box-shadow:0 6px 18px rgba(23,60,108,.035)!important;
      }

      /* Slightly safer minimum hit areas on common compact actions. */
      .adminRoot .adminTopActions button,
      .adminRoot .adminNav button,
      .adminRoot [class*="actionButton"],
      .adminRoot [class*="close"]{min-height:38px}

      /* Dense data tables remain usable on narrow screens. */
      .adminRoot [class*="tableShell"]{
        -webkit-overflow-scrolling:touch;
        scrollbar-gutter:stable;
        border-radius:14px;
      }
      .adminRoot [class*="table"] th{background:#f7f9fc!important;color:#65758a!important}
      .adminRoot [class*="table"] tbody tr{transition:background .14s ease}
      .adminRoot [class*="table"] tbody tr:hover{background:#f8fbfe!important}

      .adminRoot *{scrollbar-width:thin;scrollbar-color:#bdc8d5 transparent}
      .adminRoot *::-webkit-scrollbar{width:9px;height:9px}
      .adminRoot *::-webkit-scrollbar-thumb{background:#c4ced9;border:2px solid transparent;border-radius:999px;background-clip:padding-box}
      .adminRoot *::-webkit-scrollbar-track{background:transparent}

      @media(max-width:900px){
        .adminRoot .adminTopbar{position:sticky!important}
        .adminRoot .adminHero{border-radius:18px!important}
      }
      @media(max-width:760px){
        .adminRoot .adminNav{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin}
        .adminRoot .adminNav button{flex:0 0 auto}
        .adminRoot [class*="resultsTop"] h2{line-height:1.08!important}
        .adminRoot .adminHero{border-radius:16px!important}
        .adminRoot input,.adminRoot select,.adminRoot textarea{font-size:16px!important}
      }

      @media(prefers-reduced-motion:reduce){
        .adminRoot *,
        .adminRoot *::before,
        .adminRoot *::after{scroll-behavior:auto!important;transition-duration:.001ms!important;animation-duration:.001ms!important;animation-iteration-count:1!important}
      }
    `}</style>
  );
}
