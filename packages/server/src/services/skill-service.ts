import { SKILL_BY_ID, SKILLS, type PlayableJobId, type SkillLoadoutResponse } from "@loce/shared";
import type { Database } from "../infrastructure/database.js";
import { AppError } from "../domain/errors.js";

interface JobRow { job_id:PlayableJobId; level:number; }
interface StateRow { current_job_id:PlayableJobId|null; }
export class SkillService {
  constructor(private readonly database:Database){}
  async get(accountId:string):Promise<SkillLoadoutResponse>{
    const [state,jobs]=await Promise.all([
      this.database.query<StateRow>("SELECT current_job_id FROM account_state WHERE account_id=$1",[accountId]),
      this.database.query<JobRow>("SELECT job_id,level FROM jobs WHERE account_id=$1",[accountId])
    ]);
    const currentJobId=state.rows[0]?.current_job_id;
    if(!currentJobId)throw new AppError("error.skills.noActiveJob",409);
    const row=await this.database.query<{priority_skills:unknown}>("SELECT priority_skills FROM job_skill_loadouts WHERE account_id=$1 AND job_id=$2",[accountId,currentJobId]);
    const raw=row.rows[0]?.priority_skills;
    const slots=Array.isArray(raw)?raw.map(value=>typeof value==="string"?value:null).slice(0,4):[null,null,null,null];
    while(slots.length<4)slots.push(null);
    const levels=new Map(jobs.rows.map(job=>[job.job_id,job.level]));
    return { currentJobId, slots, catalog:SKILLS.map(skill=>({id:skill.id,jobId:skill.jobId,name:skill.name,unlockLevel:skill.unlockLevel,school:skill.school,cooldownTicks:skill.cooldownTicks,targeting:skill.targeting,condition:this.conditionLabel(skill.condition),unlocked:(levels.get(skill.jobId)??0)>=skill.unlockLevel,executable:skill.executableInSprint})) };
  }
  async save(accountId:string,slots:readonly(string|null)[]):Promise<SkillLoadoutResponse>{
    const state=await this.database.query<StateRow>("SELECT current_job_id FROM account_state WHERE account_id=$1",[accountId]);
    const currentJobId=state.rows[0]?.current_job_id;
    if(!currentJobId)throw new AppError("error.skills.noActiveJob",409);
    const jobs=await this.database.query<JobRow>("SELECT job_id,level FROM jobs WHERE account_id=$1",[accountId]);
    const levels=new Map(jobs.rows.map(job=>[job.job_id,job.level]));
    const used=new Set<string>();
    slots.forEach((id,index)=>{if(!id)return;const skill=SKILL_BY_ID[id];if(!skill)throw new AppError("error.skills.invalid",400);if(used.has(id))throw new AppError("error.skills.duplicate",400);used.add(id);if((levels.get(skill.jobId)??0)<skill.unlockLevel)throw new AppError("error.skills.locked",403);if(index===0&&skill.jobId!==currentJobId)throw new AppError("error.skills.slot1CurrentJobOnly",400);});
    await this.database.query(`INSERT INTO job_skill_loadouts(account_id,job_id,priority_skills) VALUES($1,$2,$3)
      ON CONFLICT(account_id,job_id) DO UPDATE SET priority_skills=EXCLUDED.priority_skills,updated_at=NOW()`,[accountId,currentJobId,JSON.stringify(slots)]);
    return this.get(accountId);
  }
  async resolveForBattle(accountId:string,jobId:PlayableJobId,level:number):Promise<readonly import("@loce/shared").SkillDefinition[]>{
    const row=await this.database.query<{priority_skills:unknown}>("SELECT priority_skills FROM job_skill_loadouts WHERE account_id=$1 AND job_id=$2",[accountId,jobId]);
    const raw=row.rows[0]?.priority_skills;
    if(!Array.isArray(raw))return [];
    return raw.flatMap(value=>{if(typeof value!=="string")return[];const skill=SKILL_BY_ID[value];return skill&&skill.unlockLevel<=level?[skill]:[];});
  }
  private conditionLabel(condition:import("@loce/shared").SkillCondition):string{switch(condition.kind){case"always":return"ใช้เมื่อพร้อม";case"targetCountAtLeast":return`ศัตรูอย่างน้อย ${condition.value}`;case"selfHpAtMost":return`HP ตนเอง ≤ ${condition.value}%`;case"allyHpAtMost":return`HP พันธมิตร ≤ ${condition.value}%`;case"selfHasDebuff":return"ใช้เมื่อมีสถานะลบ";}}
}
