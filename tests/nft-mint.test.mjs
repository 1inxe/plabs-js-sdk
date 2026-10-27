import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPlabsWallet } from '../dist/esm/index.js';
function fixture() {
  const calls=[];
  const provider={isPlabsWallet:true,on(){},removeListener(){},async request(input){calls.push(input);return{synthetic:true};}};
  return{calls,wallet:createPlabsWallet(provider)};
}
test('NFT methods expose only an intent or a local recovery ID',async()=>{
  const f=fixture(),pool=`0x${'aB'.repeat(20)}`,id='12345678-1234-1234-1234-123456789012';
  await f.wallet.privacy.mintNft({chainId:1,poolAddress:pool});
  await f.wallet.privacy.getNftMints();await f.wallet.privacy.resumeNftMint(id);
  assert.deepEqual(f.calls,[{method:'plabs_mintNft',params:[{chainId:1,poolAddress:pool.toLowerCase()}]},{method:'plabs_getNftMints'},{method:'plabs_resumeNftMint',params:[id]}]);
});
test('NFT mint rejects arbitrary transactions, recipients, proofs and wrong networks before RPC',async()=>{
  const f=fixture(),intent={chainId:1,poolAddress:`0x${'12'.repeat(20)}`};
  for(const extra of [{chainId:143},{data:'0x1234'},{recipient:'0x1234'},{proof:{}},{value:'1'},{tokenId:'7'}])await assert.rejects(f.wallet.privacy.mintNft({...intent,...extra}));
  await assert.rejects(f.wallet.privacy.resumeNftMint('other-site-id'));assert.equal(f.calls.length,0);
});

test('NFT holdings use a separate read scope and accept only explicit sync', async () => {
  const f = fixture();
  await f.wallet.privacy.requestAccess(['nfts']);
  await f.wallet.privacy.getNftAssets();
  await f.wallet.privacy.getNftAssets({sync:true});
  assert.deepEqual(f.calls, [
    {method:'plabs_requestPrivacyAccess',params:[{scopes:['nfts']}]},
    {method:'plabs_getNftAssets',params:[{sync:false}]},
    {method:'plabs_getNftAssets',params:[{sync:true}]},
  ]);
  const before = f.calls.length;
  for (const options of [null, [], {sync:'true'}, {account:'other'}, {seed:'secret'}]) {
    await assert.rejects(f.wallet.privacy.getNftAssets(options));
  }
  assert.equal(f.calls.length,before);
});
