export function AdminOverviewPremiumV2() {
  return (
    <style>{`
      /* Premium Overview V2 — presentation only. No auth, data, result or exam behavior. */
      .adminRoot{
        background:
          radial-gradient(circle at 78% 2%,rgba(72,118,152,.13),transparent 27rem),
          linear-gradient(180deg,#0d2038 0 252px,#f4ecdf 252px 100%)!important;
      }

      .adminRoot .adminMain{
        padding-top:18px!important;
      }
      .adminRoot .adminHero{
        min-height:126px!important;
        padding-bottom:12px!important;
        align-items:center!important;
      }
      .adminRoot .adminHero h1{
        margin-top:8px!important;
        font-size:36px!important;
        line-height:1.02!important;
        letter-spacing:-.048em!important;
      }
      .adminRoot .adminHero p{
        max-width:610px!important;
        margin-top:7px!important;
        color:#9aacbf!important;
        font-size:9px!important;
        line-height:1.55!important;
      }

      .adminRoot .adminMetricsFour{
        grid-template-columns:repeat(4,96px)!important;
        gap:8px!important;
      }
      .adminRoot .adminMetrics>div{
        min-height:86px!important;
        padding:12px 13px!important;
        border:1px solid rgba(255,255,255,.105)!important;
        border-radius:16px!important;
        background:linear-gradient(145deg,rgba(255,255,255,.075),rgba(255,255,255,.035))!important;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.045),0 10px 28px rgba(0,0,0,.08)!important;
        backdrop-filter:blur(12px)!important;
      }
      .adminRoot .adminMetrics small{
        color:#8fa4ba!important;
        font-size:7px!important;
        letter-spacing:.115em!important;
      }
      .adminRoot .adminMetrics strong{
        margin-top:4px!important;
        font-size:21px!important;
      }
      .adminRoot .adminMetrics span{
        margin-top:3px!important;
        color:#8da0b5!important;
        font-size:7px!important;
      }

      /* Move live operations clearly below the hero and into the cream workspace. */
      .adminRoot #admin-professional-overview{
        margin-top:38px!important;
        min-width:0!important;
      }
      .adminRoot #admin-professional-overview:before{
        content:"OPERATIONS CENTER";
        display:block;
        margin:0 0 9px 3px;
        color:#9a8a7a;
        font-size:7px;
        font-weight:900;
        letter-spacing:.15em;
      }
      .adminRoot #admin-professional-overview:after{
        content:"Live monitoring, result health and daily completion";
        display:block;
        position:absolute;
        pointer-events:none;
        opacity:0;
      }
      .adminRoot #admin-professional-overview > [class*="overviewMount"]{
        margin:0 0 14px!important;
        padding:12px!important;
        border:1px solid rgba(14,32,56,.075)!important;
        border-radius:25px!important;
        background:linear-gradient(145deg,rgba(255,253,248,.84),rgba(250,246,239,.70))!important;
        box-shadow:0 20px 50px rgba(51,43,35,.055),inset 0 1px 0 rgba(255,255,255,.85)!important;
      }
      .adminRoot #admin-professional-overview > [class*="overviewMount"] > [class*="opsShell"]{
        display:grid!important;
        grid-template-columns:minmax(0,1.28fr) minmax(360px,.72fr)!important;
        gap:12px!important;
        align-items:stretch!important;
      }
      .adminRoot #admin-professional-overview [class*="opsShell"] > [class*="opsCards"]{
        display:grid!important;
        grid-template-columns:repeat(2,minmax(0,1fr))!important;
        grid-template-rows:repeat(2,88px)!important;
        gap:10px!important;
        height:auto!important;
        min-height:0!important;
        max-height:none!important;
        overflow:visible!important;
      }
      .adminRoot #admin-professional-overview [class*="opsCards"] > [class*="opsCard"]{
        position:relative!important;
        display:flex!important;
        flex-direction:column!important;
        justify-content:center!important;
        width:100%!important;
        height:88px!important;
        min-height:88px!important;
        max-height:88px!important;
        padding:12px 15px 11px 17px!important;
        overflow:hidden!important;
        border:1px solid rgba(14,32,56,.075)!important;
        border-radius:16px!important;
        background:linear-gradient(145deg,#fffefb,#fbf7f0)!important;
        box-shadow:0 7px 20px rgba(34,38,43,.04),inset 0 1px 0 #fff!important;
        color:#132842!important;
        text-align:left!important;
        transform:none!important;
      }
      .adminRoot #admin-professional-overview [class*="opsCards"] > [class*="opsCard"]:before{
        content:"";
        position:absolute;
        left:0;
        top:17px;
        bottom:17px;
        width:3px;
        border-radius:0 8px 8px 0;
        background:#4d7899;
      }
      .adminRoot #admin-professional-overview [class*="opsCards"] > [class*="opsCard"]:nth-child(1):before{background:#47ad7f}
      .adminRoot #admin-professional-overview [class*="opsCards"] > [class*="opsCard"]:nth-child(2):before{background:#ef8a64}
      .adminRoot #admin-professional-overview [class*="opsCards"] > [class*="opsCard"]:nth-child(3):before{background:#b89365}
      .adminRoot #admin-professional-overview [class*="opsCards"] > [class*="opsCard"]:nth-child(4):before{background:#5c86a7}
      .adminRoot #admin-professional-overview [class*="opsCards"] > [class*="opsCard"]:hover{
        border-color:rgba(14,32,56,.14)!important;
        box-shadow:0 12px 27px rgba(34,38,43,.07),inset 0 1px 0 #fff!important;
        transform:translateY(-1px)!important;
      }
      .adminRoot #admin-professional-overview [class*="opsCards"] > [class*="opsCard"] small{
        color:#8c939c!important;
        font-size:7px!important;
        line-height:1.15!important;
        letter-spacing:.12em!important;
      }
      .adminRoot #admin-professional-overview [class*="opsCards"] > [class*="opsCard"] strong{
        margin-top:5px!important;
        font-size:24px!important;
        line-height:1!important;
        letter-spacing:-.045em!important;
      }
      .adminRoot #admin-professional-overview [class*="opsCards"] > [class*="opsCard"] span{
        margin-top:4px!important;
        color:#7d8793!important;
        font-size:8px!important;
        line-height:1.2!important;
      }

      .adminRoot #admin-professional-overview [class*="opsShell"] > [class*="liveCard"]{
        height:186px!important;
        min-height:186px!important;
        max-height:186px!important;
        padding:14px 16px!important;
        overflow:hidden!important;
        border:1px solid rgba(255,255,255,.075)!important;
        border-radius:18px!important;
        background:
          radial-gradient(circle at 92% 0,rgba(80,150,174,.15),transparent 12rem),
          linear-gradient(145deg,#102945,#0f223c)!important;
        box-shadow:0 14px 34px rgba(16,35,63,.14),inset 0 1px 0 rgba(255,255,255,.045)!important;
      }
      .adminRoot #admin-professional-overview [class*="liveCard"] > [class*="liveCardHead"]{
        display:flex!important;
        align-items:center!important;
        justify-content:space-between!important;
        margin-bottom:6px!important;
      }
      .adminRoot #admin-professional-overview [class*="liveCardHead"] small{
        color:#7f97b0!important;
        font-size:7px!important;
        letter-spacing:.12em!important;
      }
      .adminRoot #admin-professional-overview [class*="liveCardHead"] h3{
        margin-top:4px!important;
        font-size:13px!important;
      }
      .adminRoot #admin-professional-overview [class*="liveCard"] > [class*="liveRows"]{
        display:grid!important;
        gap:0!important;
        height:auto!important;
        min-height:0!important;
        max-height:none!important;
        overflow:visible!important;
      }
      .adminRoot #admin-professional-overview [class*="liveRows"] > [class*="liveRow"]{
        display:grid!important;
        grid-template-columns:27px minmax(0,1fr) auto!important;
        align-items:center!important;
        gap:8px!important;
        min-height:29px!important;
        padding:4px 0!important;
      }
      .adminRoot #admin-professional-overview [class*="liveRows"] > [class*="liveRow"] b{
        font-size:8px!important;
        line-height:1.2!important;
      }
      .adminRoot #admin-professional-overview [class*="liveRows"] > [class*="liveRow"] small{
        margin-top:1px!important;
        color:#8ca1b8!important;
        font-size:7px!important;
        line-height:1.2!important;
        overflow:hidden!important;
        text-overflow:ellipsis!important;
        white-space:nowrap!important;
      }
      .adminRoot #admin-professional-overview [class*="liveRows"] > [class*="liveRow"] > span:last-child{
        color:#70d4a4!important;
        font-size:7px!important;
        letter-spacing:.05em!important;
      }

      /* Premium card rhythm for the rest of Overview. */
      .adminRoot .adminChartGrid,
      .adminRoot .adminOverviewGrid{
        gap:12px!important;
      }
      .adminRoot .adminChartGrid{
        grid-template-columns:minmax(0,1.42fr) minmax(350px,.76fr)!important;
      }
      .adminRoot .adminOverviewGrid{
        grid-template-columns:minmax(0,1.3fr) minmax(350px,.72fr)!important;
      }
      .adminRoot .adminPanel{
        border:1px solid rgba(14,32,56,.075)!important;
        border-radius:21px!important;
        background:linear-gradient(145deg,#fffefb,#fcf9f3)!important;
        box-shadow:0 14px 38px rgba(51,43,35,.055),inset 0 1px 0 #fff!important;
      }
      .adminRoot .adminPanelHeading{
        min-height:61px!important;
        padding:12px 16px!important;
      }
      .adminRoot .adminPanelHeading small{
        color:#988a7c!important;
        font-size:7px!important;
        letter-spacing:.13em!important;
      }
      .adminRoot .adminPanelHeading h2{
        margin-top:4px!important;
        font-size:14px!important;
      }
      .adminRoot .adminPanelHeading>strong{
        font-size:21px!important;
      }
      .adminRoot .adminBarChart{
        height:206px!important;
        padding:23px 18px 14px!important;
        background:linear-gradient(rgba(14,32,56,.045) 1px,transparent 1px)!important;
        background-size:100% 25%!important;
      }
      .adminRoot .adminBarChart>div>span{
        width:min(30px,72%)!important;
        border-radius:8px 8px 4px 4px!important;
        box-shadow:0 8px 17px rgba(255,107,88,.15)!important;
      }
      .adminRoot .adminSkillBars{
        min-height:206px!important;
        padding:15px 17px!important;
        gap:14px!important;
      }
      .adminRoot .adminRecentResults>div,
      .adminRoot .adminLeaderboard button{
        min-height:50px!important;
      }

      @media(max-width:1180px){
        .adminRoot #admin-professional-overview{
          margin-top:28px!important;
        }
        .adminRoot #admin-professional-overview > [class*="overviewMount"] > [class*="opsShell"]{
          grid-template-columns:1fr!important;
        }
        .adminRoot #admin-professional-overview [class*="opsShell"] > [class*="opsCards"]{
          grid-template-columns:repeat(4,minmax(0,1fr))!important;
          grid-template-rows:88px!important;
        }
        .adminRoot #admin-professional-overview [class*="opsShell"] > [class*="liveCard"]{
          height:auto!important;
          min-height:0!important;
          max-height:none!important;
        }
      }
      @media(max-width:980px){
        .adminRoot{
          background:linear-gradient(180deg,#0d2038 0 330px,#f4ecdf 330px 100%)!important;
        }
        .adminRoot .adminMetricsFour{grid-template-columns:repeat(4,1fr)!important}
        .adminRoot .adminChartGrid,
        .adminRoot .adminOverviewGrid{grid-template-columns:1fr!important}
      }
      @media(max-width:700px){
        .adminRoot #admin-professional-overview{
          margin-top:20px!important;
        }
        .adminRoot #admin-professional-overview [class*="opsShell"] > [class*="opsCards"]{
          grid-template-columns:repeat(2,minmax(0,1fr))!important;
          grid-template-rows:repeat(2,84px)!important;
        }
        .adminRoot #admin-professional-overview [class*="opsCards"] > [class*="opsCard"]{
          height:84px!important;
          min-height:84px!important;
          max-height:84px!important;
        }
      }
      @media(max-width:460px){
        .adminRoot #admin-professional-overview [class*="opsShell"] > [class*="opsCards"]{
          grid-template-columns:1fr!important;
          grid-template-rows:repeat(4,82px)!important;
        }
        .adminRoot #admin-professional-overview [class*="opsCards"] > [class*="opsCard"]{
          height:82px!important;
          min-height:82px!important;
          max-height:82px!important;
        }
      }
    `}</style>
  );
}
