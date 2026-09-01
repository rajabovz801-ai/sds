export function AdminOverviewProPolish() {
  return (
    <style>{`
      /* Overview-only presentation layer. Keeps admin data/API/test behaviour untouched. */
      .adminRoot .adminHero{
        min-height:138px;
        gap:28px;
      }
      .adminRoot .adminHero h1{
        margin-top:9px;
        font-size:38px;
        line-height:1;
      }
      .adminRoot .adminHero p{
        margin-top:8px;
        max-width:620px;
        font-size:10px;
        line-height:1.5;
      }
      .adminRoot .adminMetricsFour{
        grid-template-columns:repeat(4,108px);
        gap:7px;
      }
      .adminRoot .adminMetrics>div{
        min-height:88px;
        padding:13px 14px;
        border-radius:15px;
        align-content:center;
      }
      .adminRoot .adminMetrics small{
        white-space:nowrap;
        font-size:8px!important;
        letter-spacing:.09em!important;
      }
      .adminRoot .adminMetrics strong{
        margin-top:4px;
        font-size:23px;
      }
      .adminRoot .adminMetrics span{
        margin-top:2px;
        font-size:7px;
      }

      .adminRoot .adminOverview{
        gap:12px;
      }
      .adminRoot #admin-professional-overview{
        min-width:0;
      }
      .adminRoot #admin-professional-overview [class*="overviewMount"]{
        margin:0 0 12px!important;
      }
      .adminRoot #admin-professional-overview [class*="opsShell"]{
        display:grid!important;
        grid-template-columns:minmax(0,1.28fr) minmax(360px,.72fr)!important;
        gap:12px!important;
        align-items:start!important;
      }
      .adminRoot #admin-professional-overview [class*="opsCards"]{
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        grid-auto-rows:96px!important;
        gap:10px!important;
        align-self:start!important;
        align-items:start!important;
        height:auto!important;
      }
      .adminRoot #admin-professional-overview [class*="opsCards"]>[class*="opsCard"]:nth-child(4){
        display:flex!important;
      }
      .adminRoot #admin-professional-overview [class*="opsCard"]{
        position:relative!important;
        width:100%!important;
        height:96px!important;
        min-height:96px!important;
        max-height:96px!important;
        padding:13px 15px 12px!important;
        border:1px solid rgba(14,32,56,.09)!important;
        border-radius:16px!important;
        background:rgba(255,253,248,.98)!important;
        box-shadow:0 9px 24px rgba(28,35,42,.045)!important;
        display:flex!important;
        flex-direction:column!important;
        justify-content:center!important;
        overflow:hidden!important;
        text-align:left!important;
        transform:none!important;
      }
      .adminRoot #admin-professional-overview [class*="opsCard"]:before{
        content:"";
        position:absolute;
        left:0;
        top:16px;
        bottom:16px;
        width:3px;
        border-radius:0 8px 8px 0;
        background:#4f7e93;
      }
      .adminRoot #admin-professional-overview [class*="opsCard"]:nth-child(1):before{background:#39a978}
      .adminRoot #admin-professional-overview [class*="opsCard"]:nth-child(2):before{background:#e88a5d}
      .adminRoot #admin-professional-overview [class*="opsCard"]:nth-child(3):before{background:#b18a57}
      .adminRoot #admin-professional-overview [class*="opsCard"]:nth-child(4):before{background:#4d7899}
      .adminRoot #admin-professional-overview [class*="opsCard"]:hover{
        border-color:rgba(14,32,56,.16)!important;
        box-shadow:0 13px 28px rgba(28,35,42,.07)!important;
        transform:translateY(-1px)!important;
      }
      .adminRoot #admin-professional-overview [class*="opsCard"] small{
        color:#87919e!important;
        font-size:8px!important;
        line-height:1.2!important;
        letter-spacing:.1em!important;
      }
      .adminRoot #admin-professional-overview [class*="opsCard"] strong{
        margin-top:5px!important;
        font-size:25px!important;
        line-height:1!important;
        letter-spacing:-.04em!important;
      }
      .adminRoot #admin-professional-overview [class*="opsCard"] span{
        margin-top:4px!important;
        color:#7c8794!important;
        font-size:9px!important;
        line-height:1.2!important;
      }

      .adminRoot #admin-professional-overview [class*="liveCard"]{
        height:202px!important;
        min-height:202px!important;
        max-height:202px!important;
        padding:14px 16px!important;
        border-radius:17px!important;
        border:1px solid rgba(255,255,255,.08)!important;
        background:linear-gradient(145deg,#102743,#10213a)!important;
        box-shadow:0 12px 30px rgba(16,35,63,.14)!important;
        overflow:hidden!important;
      }
      .adminRoot #admin-professional-overview [class*="liveCardHead"]{
        margin-bottom:7px!important;
      }
      .adminRoot #admin-professional-overview [class*="liveCardHead"] small{
        color:#8296ae!important;
        font-size:8px!important;
        line-height:1.2!important;
      }
      .adminRoot #admin-professional-overview [class*="liveCardHead"] h3{
        margin-top:4px!important;
        font-size:14px!important;
        line-height:1.2!important;
      }
      .adminRoot #admin-professional-overview [class*="liveRows"]{
        gap:0!important;
      }
      .adminRoot #admin-professional-overview [class*="liveRow"]{
        min-height:31px!important;
        grid-template-columns:27px minmax(0,1fr) auto!important;
        gap:8px!important;
        padding:5px 0!important;
      }
      .adminRoot #admin-professional-overview [class*="liveAvatar"]{
        width:27px!important;
        height:27px!important;
        border-radius:9px!important;
      }
      .adminRoot #admin-professional-overview [class*="liveRow"] b{
        font-size:9px!important;
        line-height:1.2!important;
      }
      .adminRoot #admin-professional-overview [class*="liveRow"] small{
        margin-top:1px!important;
        color:#8ca0b7!important;
        font-size:8px!important;
        line-height:1.2!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        white-space:nowrap!important;
      }
      .adminRoot #admin-professional-overview [class*="liveRow"]>span:last-child{
        font-size:8px!important;
        letter-spacing:.04em!important;
      }

      .adminRoot .adminChartGrid,
      .adminRoot .adminOverviewGrid{
        gap:12px;
        align-items:stretch;
      }
      .adminRoot .adminChartGrid{
        grid-template-columns:minmax(0,1.45fr) minmax(340px,.78fr);
      }
      .adminRoot .adminOverviewGrid{
        grid-template-columns:minmax(0,1.35fr) minmax(340px,.75fr);
      }
      .adminRoot .adminPanel{
        border-radius:19px;
        border-color:rgba(14,32,56,.085);
        box-shadow:0 12px 34px rgba(28,35,42,.055);
      }
      .adminRoot .adminPanelHeading{
        min-height:64px;
        padding:13px 16px;
        gap:12px;
      }
      .adminRoot .adminPanelHeading small{
        font-size:8px!important;
        line-height:1.2!important;
        letter-spacing:.11em!important;
      }
      .adminRoot .adminPanelHeading h2{
        margin-top:4px;
        font-size:14px;
        line-height:1.2;
      }
      .adminRoot .adminPanelHeading>strong{
        font-size:22px;
      }
      .adminRoot .adminPanelHeading>button{
        height:31px;
        min-height:31px;
        padding:0 10px;
        border-radius:9px;
        font-size:8px;
      }
      .adminRoot .adminBarChart{
        height:214px;
        padding:25px 18px 16px;
        gap:11px;
      }
      .adminRoot .adminBarChart>div>span{
        width:min(30px,72%);
        border-radius:8px 8px 4px 4px;
      }
      .adminRoot .adminSkillBars{
        min-height:214px;
        padding:16px 18px;
        gap:15px;
      }
      .adminRoot .adminSkillBars>div{
        grid-template-columns:92px 1fr 42px;
        gap:10px;
      }
      .adminRoot .adminRecentResults{
        padding:5px 16px 10px;
      }
      .adminRoot .adminRecentResults>div{
        min-height:53px;
        padding:7px 1px;
        grid-template-columns:34px minmax(0,1fr) auto;
        gap:10px;
      }
      .adminRoot .adminResultAvatar{
        width:34px;
        height:34px;
        border-radius:11px;
      }
      .adminRoot .adminLeaderboard{
        padding:5px 15px 10px;
      }
      .adminRoot .adminLeaderboard button{
        min-height:53px;
        padding:7px 1px;
      }

      @media(max-width:1180px){
        .adminRoot #admin-professional-overview [class*="opsShell"]{
          grid-template-columns:1fr!important;
        }
        .adminRoot #admin-professional-overview [class*="opsCards"]{
          grid-template-columns:repeat(4,minmax(0,1fr))!important;
          grid-auto-rows:92px!important;
        }
        .adminRoot #admin-professional-overview [class*="opsCard"]{
          height:92px!important;
          min-height:92px!important;
          max-height:92px!important;
        }
        .adminRoot #admin-professional-overview [class*="liveCard"]{
          height:auto!important;
          min-height:0!important;
          max-height:none!important;
        }
      }
      @media(max-width:980px){
        .adminRoot .adminMetricsFour{grid-template-columns:repeat(4,1fr)}
        .adminRoot .adminChartGrid,
        .adminRoot .adminOverviewGrid{grid-template-columns:1fr}
      }
      @media(max-width:700px){
        .adminRoot .adminHero{min-height:auto}
        .adminRoot .adminMetricsFour{grid-template-columns:repeat(2,1fr)}
        .adminRoot #admin-professional-overview [class*="opsCards"]{
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
        }
      }
      @media(max-width:460px){
        .adminRoot #admin-professional-overview [class*="opsCards"]{
          grid-template-columns:1fr!important;
          grid-auto-rows:88px!important;
        }
        .adminRoot #admin-professional-overview [class*="opsCard"]{
          height:88px!important;
          min-height:88px!important;
          max-height:88px!important;
        }
      }
    `}</style>
  );
}
