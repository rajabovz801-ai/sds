export const requiresPersonalMockCode = (day:number) => day === 18 || day === 25 || day === 32;
export const personalMockOpensAt = (day:number) => day === 18 ? '2026-10-18T09:00:00+05:00' : day === 25 ? '2026-10-25T09:00:00+05:00' : day === 32 ? '2026-11-01T09:00:00+05:00' : null;
type Grant={student_id:string;day_number:number;redeemed_at:string|null;revoked_at:string|null};
export function decideMockEntry(input:{day:number;studentId:string;preview:boolean;now:number;grant:Grant|null}):'legacy'|'preview'|'scheduled'|'code_required'|'allowed'{
 if(!requiresPersonalMockCode(input.day))return 'legacy';
 if(input.preview)return 'preview';
 if(!Number.isFinite(input.now)||input.now<Date.parse(personalMockOpensAt(input.day)!))return 'scheduled';
 const g=input.grant;
 return g&&g.day_number===input.day&&g.student_id===input.studentId&&g.redeemed_at&&!g.revoked_at?'allowed':'code_required';
}
