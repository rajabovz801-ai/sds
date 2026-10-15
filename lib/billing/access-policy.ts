export const BILLING_LAUNCH = '2026-10-19T00:00:00+05:00';
export type Membership = {
 enforced: boolean; launch_at?: string; trial_eligible: boolean; trial_completed?: number;
 challenge_until: string|null; mock_dates: string[]; pending: boolean; had_paid: boolean;
 scheduled_start?: string|null;
};
export function membershipDayAllowed(day:number, membership:Membership, now=Date.now()) {
 if(!Number.isInteger(day)||day<1||day>60)return false;
 if(!membership.enforced)return true;
 const date=new Date(Date.UTC(2026,9,day));
 if(date.getUTCDay()===0)return membership.mock_dates.includes(date.toISOString().slice(0,10));
 return !!(membership.challenge_until&&Date.parse(membership.challenge_until)>now)||(membership.trial_eligible&&day<=2);
}
export function membershipState(m:Membership) {
 if(m.challenge_until||m.mock_dates.length)return 'active';
 if(m.scheduled_start)return 'scheduled';
 if(m.pending)return 'pending';
 if(m.had_paid)return 'expired';
 if(m.trial_eligible)return (m.trial_completed||0)>=2?'trial_finished':'trial';
 return m.enforced?'locked':'scheduled_launch';
}
