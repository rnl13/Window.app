import {readFileSync} from 'node:fs';
import {loadEnv} from 'vite';
const config=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
const values={...loadEnv('production',process.cwd(),''),...process.env};
const failures=[];
if(!config.d1_databases?.[0]?.database_id||config.d1_databases[0].database_id==='00000000-0000-4000-8000-000000000000')failures.push('Create your own D1 database and set its database_id in wrangler.jsonc.');
const origin=values.NEXT_PUBLIC_SITE_ORIGIN;
if(!origin||!origin.startsWith('https://')||origin.includes('localhost')||origin.includes('.chatgpt.site'))failures.push('Set NEXT_PUBLIC_SITE_ORIGIN to the new HTTPS origin.');
if(config.vars?.APP_ORIGIN!==origin)failures.push('APP_ORIGIN in wrangler.jsonc must equal NEXT_PUBLIC_SITE_ORIGIN.');
if(!values.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_'))failures.push('Set the Clerk publishable key in .env.production.');
if(config.vars?.CLERK_PUBLISHABLE_KEY!==values.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)failures.push('Use the same Clerk publishable key in wrangler.jsonc and .env.production.');
if(!values.CLOUDFLARE_ACCOUNT_ID)failures.push('Set CLOUDFLARE_ACCOUNT_ID for the owner account.');
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log('Deployment configuration checked. Ensure CLERK_SECRET_KEY and CLERK_JWT_KEY have been set as a Worker secret.');
