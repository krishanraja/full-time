export function snapshotNames(end: string): {raw:string;normal:string;commit:string;window:string};
export function validateSnapshot(raw: unknown, normal: unknown): boolean;
export function readSnapshot(end:string,options:{credentials:Record<string, unknown>;folderId:string;request?:typeof fetch}):Promise<null|{raw:unknown;normal:unknown;commit:unknown;commit_sha256:string}>;
export function productFacts(raw:unknown,normal:unknown,match:{kickoffAt:string;homeTeam:string;awayTeam:string;homeScore:number;awayScore:number}):import('../../src/lib/pundit/types').EvidenceItem[];
