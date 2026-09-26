import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {verifiedUserId} from '../lib/auth-verification.ts';
import {safeReturnTo} from '../lib/site-config.ts';
const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const domain='test-window.clerk.accounts.dev';
const config={CLERK_SECRET_KEY:'sk_test_unit_test_only_not_a_real_key',APP_ORIGIN:'https://window.example',CLERK_PUBLISHABLE_KEY:'pk_test_'+Buffer.from(domain+'$').toString('base64').replace(/=/g,''),CLERK_JWT_KEY:publicKey.export({type:'spki',format:'pem'})};
function jwt(change={},key=privateKey){const now=Math.floor(Date.now()/1000);const body={iss:'https://'+domain,sub:'user_test_window',sid:'sess_test',azp:config.APP_ORIGIN,iat:now-10,nbf:now-10,exp:now+120,...change};const input=Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT',kid:'test'})).toString('base64url')+'.'+Buffer.from(JSON.stringify(body)).toString('base64url');return input+'.'+sign('RSA-SHA256',Buffer.from(input),key).toString('base64url');}
const request=(token)=>new Request('https://window.example/api/rider',{headers:token?{Authorization:'Bearer '+token}:{}});
test('verifies signed Clerk session and rejects forged, expired and wrong-origin sessions',async()=>{

 assert.equal(await verifiedUserId(request(jwt()),config),'user_test_window');
 assert.equal(await verifiedUserId(request(jwt({exp:1})),config),null);
 assert.equal(await verifiedUserId(request(jwt({azp:'https://evil.example'})),config),null);
 assert.equal(await verifiedUserId(request(jwt({},generateKeyPairSync('rsa',{modulusLength:2048}).privateKey)),config),null);
 assert.equal(await verifiedUserId(request(),config),null);
 assert.equal(await verifiedUserId(new Request('https://window.example/api/rider',{headers:{'oai-authenticated-user-id':'someone','oai-authenticated-user-email':'someone@example.test'}}),config),null);
 assert.equal(await verifiedUserId(request(jwt()),{}),null);
});
test('login return paths cannot redirect to another origin',()=>{
 assert.equal(safeReturnTo('/ride#profile'),'/ride#profile');
 assert.equal(safeReturnTo('/calendar'),'/calendar');
 for(const value of ['https://evil.example','//evil.example','/\\evil.example','javascript:alert(1)'])assert.equal(safeReturnTo(value),'/ride#profile');
});
