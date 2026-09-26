import {createClerkClient,verifyToken} from '@clerk/backend';

export type AuthConfig={
 APP_ORIGIN?:string;
 CLERK_PUBLISHABLE_KEY?:string;
 CLERK_JWT_KEY?:string;
 CLERK_SECRET_KEY?:string;
};

export async function windowAuth(request:Request,config:AuthConfig){
 if(!config.APP_ORIGIN||!config.CLERK_PUBLISHABLE_KEY||!config.CLERK_SECRET_KEY)return null;

 try{
  const client=createClerkClient({
   publishableKey:config.CLERK_PUBLISHABLE_KEY,
   secretKey:config.CLERK_SECRET_KEY
  });

  return await client.authenticateRequest(request,{
   authorizedParties:[config.APP_ORIGIN],
   jwtKey:config.CLERK_JWT_KEY,
   acceptsToken:'session_token'
  });
 }catch{
  return null;
 }
}

export async function verifiedUserId(
 request:Request,
 config:AuthConfig
):Promise<string|null>{
 const header=request.headers.get('authorization');
 const token=header?.match(/^Bearer\s+(.+)$/i)?.[1];

 if(token&&config.APP_ORIGIN&&(config.CLERK_JWT_KEY||config.CLERK_SECRET_KEY)){
  try{
   const verified=config.CLERK_JWT_KEY
    ? await verifyToken(token,{
       jwtKey:config.CLERK_JWT_KEY,
       authorizedParties:[config.APP_ORIGIN]
      })
    : await verifyToken(token,{
       secretKey:config.CLERK_SECRET_KEY!,
       authorizedParties:[config.APP_ORIGIN]
      });

   return typeof verified.sub==='string'?verified.sub:null;
  }catch{
   return null;
  }
 }

 const state=await windowAuth(request,config);
 return state?.isAuthenticated?state.toAuth().userId:null;
}

// Browser navigations may need Clerk's cookie refresh handshake.
// API calls normally authenticate through the Bearer token above.
export async function browserSessionRedirect(request:Request,config:AuthConfig){
 const state=await windowAuth(request,config);

 if(state?.status==='handshake'&&state.headers.get('location')){
  return new Response(null,{status:307,headers:state.headers});
 }

 return null;
}
