export function AdminReadableTypography() {
  return (
    <style>{`
      /* Admin-only readability layer. No layout or behavior changes. */
      .adminRoot .adminNav button{font-size:11px!important}
      .adminRoot .adminTopActions button,.adminRoot .adminSecureChip{font-size:10px!important}
      .adminRoot .adminHero p{font-size:12px!important;line-height:1.55!important}
      .adminRoot .adminMetrics small{font-size:9px!important}
      .adminRoot .adminMetrics span{font-size:10px!important}

      .adminRoot .adminPanelHeading small,
      .adminRoot .adminSectionHeader p,
      .adminRoot .adminStudentListHead small,
      .adminRoot .adminStudentResultsHead small,
      .adminRoot .adminStudentTrend>div:first-child small{font-size:9px!important}

      .adminRoot .adminRecentResults b{font-size:12px!important;line-height:1.3!important}
      .adminRoot .adminRecentResults small{font-size:9.5px!important;line-height:1.4!important}
      .adminRoot .adminRecentResults>div>strong{font-size:10.5px!important}
      .adminRoot .adminLeaderboard b{font-size:12px!important;line-height:1.3!important}
      .adminRoot .adminLeaderboard small{font-size:9.5px!important;line-height:1.4!important}
      .adminRoot .adminLeaderboard button>span{font-size:10px!important}
      .adminRoot .adminLeaderboard button>strong{font-size:12px!important}
      .adminRoot .adminSkillBars b{font-size:11px!important}
      .adminRoot .adminSkillBars small{font-size:9px!important}
      .adminRoot .adminSkillBars strong{font-size:12px!important}

      .adminRoot .adminSearch input,
      .adminRoot .adminForm input,
      .adminRoot .adminForm select,
      .adminRoot .adminForm textarea,
      .adminRoot .adminForm label{font-size:11px!important}
      .adminRoot .dropZone b{font-size:11px!important}
      .adminRoot .dropZone small{font-size:9.5px!important}
      .adminRoot .adminTestCopy>div>span{font-size:9px!important}
      .adminRoot .adminTestCopy h3{font-size:14px!important;line-height:1.3!important}
      .adminRoot .adminTestCopy small{font-size:9.5px!important}
      .adminRoot .adminRowActionsWide button:first-child{font-size:9px!important}

      .adminRoot .adminStudentRows>button{min-height:74px!important;padding:11px!important}
      .adminRoot .adminStudentRows>button>span{width:43px!important;height:43px!important;font-size:11px!important}
      .adminRoot .adminStudentRows b{font-size:13px!important;line-height:1.35!important;font-weight:800!important}
      .adminRoot .adminStudentRows small{font-size:10px!important;line-height:1.4!important}
      .adminRoot .adminStudentRows i{font-size:8px!important;padding:5px 7px!important}

      .adminRoot .adminStudentProfile h2{font-size:22px!important;line-height:1.2!important}
      .adminRoot .adminStudentProfile p{font-size:11px!important;line-height:1.45!important}
      .adminRoot .adminStudentProfile>button{font-size:10px!important}
      .adminRoot .adminStudentSummary small{font-size:9px!important}
      .adminRoot .adminStudentSummary span{font-size:9px!important}
      .adminRoot .adminAccuracyRing small{font-size:7px!important}
      .adminRoot .adminStudentTrend h3{font-size:17px!important}
      .adminRoot .adminStudentTrend>p{font-size:10px!important}
      .adminRoot .adminStudentTrendBars small{font-size:7px!important}
      .adminRoot .adminStudentResultsHead h3{font-size:18px!important}
      .adminRoot .adminStudentResultsHead>span{font-size:9px!important}
      .adminRoot .adminStudentResults article>div:first-child>span{font-size:8px!important}
      .adminRoot .adminStudentResults h4{font-size:13px!important;line-height:1.3!important}
      .adminRoot .adminStudentResults article small{font-size:9.5px!important}
      .adminRoot .adminResultNumbers small{font-size:8px!important}
      .adminRoot .adminResultNumbers b{font-size:12px!important}
      .adminRoot .adminNoResults p{font-size:11px!important}

      /* Professional results layer */
      .adminRoot [class*="resultsTop"] small,
      .adminRoot [class*="metric"] small,
      .adminRoot [class*="detailCard"] small,
      .adminRoot [class*="timelineRow"] small{font-size:9px!important}
      .adminRoot [class*="resultsTop"] p{font-size:11px!important;line-height:1.5!important}
      .adminRoot [class*="filters"] input,
      .adminRoot [class*="filters"] select,
      .adminRoot [class*="actionButton"]{font-size:10px!important}
      .adminRoot [class*="table"] th{font-size:9px!important}
      .adminRoot [class*="table"] td{font-size:10px!important}
      .adminRoot [class*="studentCell"] b{font-size:12px!important}
      .adminRoot [class*="studentCell"] small{font-size:9px!important}
      .adminRoot [class*="testCell"] b{font-size:11px!important}
      .adminRoot [class*="testCell"] small{font-size:9px!important}
      .adminRoot [class*="status"]{font-size:8px!important}
      .adminRoot [class*="score"]{font-size:12px!important}
      .adminRoot [class*="liveRow"] b{font-size:11px!important}
      .adminRoot [class*="liveRow"] small{font-size:9px!important}
      .adminRoot [class*="liveRow"]>span:last-child{font-size:9px!important}
      .adminRoot [class*="opsCard"] small{font-size:9px!important}
      .adminRoot [class*="opsCard"] span{font-size:10px!important}
      .adminRoot [class*="drawerHead"] small{font-size:9px!important}
      .adminRoot [class*="drawerHead"] p{font-size:10px!important}
      .adminRoot [class*="detailCard"] span{font-size:9px!important}
      .adminRoot [class*="timelineRow"] b{font-size:10px!important}

      @media(max-width:760px){
        .adminRoot .adminStudentRows b{font-size:12px!important}
        .adminRoot .adminStudentRows small{font-size:9.5px!important}
        .adminRoot .adminStudentProfile h2{font-size:20px!important}
      }
    `}</style>
  );
}
