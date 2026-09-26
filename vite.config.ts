import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import {defineConfig,loadEnv} from 'vite';
export default defineConfig(async ({mode})=>{
 const values=loadEnv(mode,process.cwd(),'');
 const {cloudflare}=await import('@cloudflare/vite-plugin');
 return {
  css:{postcss:{plugins:[tailwindcss()]}},
  define:{'process.env.NEXT_PUBLIC_SITE_ORIGIN':JSON.stringify(values.NEXT_PUBLIC_SITE_ORIGIN||'http://localhost:5173'),'process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY':JSON.stringify(values.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY||'')},
  plugins:[vinext(),cloudflare({viteEnvironment:{name:'rsc',childEnvironments:['ssr']}})]
 };
});
