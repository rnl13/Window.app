self.addEventListener('push', event => {
 let data={}; try { data=event.data?.json()||{}; } catch {}
 event.waitUntil(self.registration.showNotification(data.title||'Window', {
  body:data.body||'Åbn Window for at se beskeden.', tag:data.tag||'window',
  data:{url:'/push'}, icon:'/favicon.svg'
 }));
});
self.addEventListener('notificationclick', event => {
 event.notification.close();
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients => {
  const client=clients.find(c=>c.url.startsWith(self.location.origin+'/'));
  if(client){await client.navigate('/push');return client.focus();}
  return self.clients.openWindow('/push');
 }));
});
