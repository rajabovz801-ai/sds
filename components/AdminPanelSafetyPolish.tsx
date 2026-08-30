export function AdminPanelSafetyPolish() {
  return (
    <style>{`
      /* Admin-only visual safety layer. No data, test, mock, auth, or API behavior lives here. */
      .adminRoot{
        -webkit-font-smoothing:antialiased;
        -moz-osx-font-smoothing:grayscale;
        text-rendering:optimizeLegibility;
      }

      /* Keep high-frequency controls comfortable without changing layout structure. */
      .adminRoot button,
      .adminRoot a,
      .adminRoot input,
      .adminRoot select,
      .adminRoot textarea{
        font-family:inherit;
      }
      .adminRoot button:focus-visible,
      .adminRoot a:focus-visible,
      .adminRoot input:focus-visible,
      .adminRoot select:focus-visible,
      .adminRoot textarea:focus-visible{
        outline:2px solid rgba(16,35,63,.42)!important;
        outline-offset:2px!important;
      }
      .adminRoot button:not(:disabled){cursor:pointer}

      /* Existing admin typography contains several 6–9px labels; raise only the smallest text. */
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
        line-height:1.35!important;
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
        line-height:1.4!important;
      }

      .adminRoot [class*="opsCard"] span,
      .adminRoot [class*="drawerHead"] p,
      .adminRoot [class*="timelineRow"] b{
        font-size:10px!important;
        line-height:1.4!important;
      }

      /* Prevent long names/titles from pushing actions or cards out of alignment. */
      .adminRoot .adminStudentRows>button,
      .adminRoot .adminStudentRows>button>div,
      .adminRoot .adminTestCopy,
      .adminRoot [class*="studentCell"],
      .adminRoot [class*="studentCell"]>div,
      .adminRoot [class*="testCell"],
      .adminRoot [class*="drawerHead"]>div,
      .adminRoot [class*="liveRow"]>div{
        min-width:0;
      }
      .adminRoot .adminStudentRows b,
      .adminRoot .adminStudentRows small,
      .adminRoot .adminTestCopy h3,
      .adminRoot [class*="studentCell"] b,
      .adminRoot [class*="studentCell"] small,
      .adminRoot [class*="testCell"] b,
      .adminRoot [class*="testCell"] small{
        overflow:hidden;
        text-overflow:ellipsis;
      }

      /* Slightly safer minimum hit areas on common compact actions. */
      .adminRoot .adminTopActions button,
      .adminRoot .adminNav button,
      .adminRoot [class*="actionButton"],
      .adminRoot [class*="close"]{
        min-height:38px;
      }

      /* Dense data tables stay usable on small screens instead of squeezing columns. */
      .adminRoot [class*="tableShell"]{
        -webkit-overflow-scrolling:touch;
        scrollbar-gutter:stable;
      }

      @media(max-width:760px){
        .adminRoot .adminNav{
          overflow-x:auto;
          -webkit-overflow-scrolling:touch;
          scrollbar-width:thin;
        }
        .adminRoot .adminNav button{flex:0 0 auto}
        .adminRoot [class*="resultsTop"] h2{line-height:1.08!important}
      }
    `}</style>
  );
}
