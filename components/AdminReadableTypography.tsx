export function AdminReadableTypography() {
  return (
    <style>{`
      /* Collision-safe admin typography. Global admin classes only; CSS modules own their typography. */
      .adminRoot{
        font-kerning:normal;
        font-feature-settings:"kern" 1,"liga" 1,"calt" 1;
      }
      .adminRoot .adminHero p{line-height:1.55!important}
      .adminRoot .adminRecentResults b,
      .adminRoot .adminLeaderboard b,
      .adminRoot .adminStudentRows b,
      .adminRoot .adminStudentResults h4{font-weight:780!important}
      .adminRoot .adminRecentResults small,
      .adminRoot .adminLeaderboard small,
      .adminRoot .adminStudentRows small,
      .adminRoot .adminStudentResults article small,
      .adminRoot .adminStudentProfile p{line-height:1.4!important}
      .adminRoot .adminTestCopy h3,
      .adminRoot .adminStudentRows b,
      .adminRoot .adminStudentRows small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .adminRoot .adminStudentProfile h2,
      .adminRoot .adminStudentResults h4{overflow-wrap:anywhere}
      @media(max-width:760px){
        .adminRoot .adminStudentProfile h2{line-height:1.15!important}
      }
    `}</style>
  );
}
