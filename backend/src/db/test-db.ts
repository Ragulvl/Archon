import dns from 'dns';
import net from 'net';

const host = 'localhost';
const port = 5432;

console.log(`Resolving DNS for ${host}...`);
dns.lookup(host, (err, address, family) => {
  if (err) {
    console.error('DNS Lookup failed:', err);
    return;
  }
  console.log(`DNS Resolved successfully! IP: ${address} (Family: IPv${family})`);
  
  console.log(`Connecting to ${address}:${port}...`);
  const socket = net.createConnection(port, address, () => {
    console.log('Successfully connected to the database port 5432!');
    socket.end();
  });
  
  socket.setTimeout(5000);
  socket.on('timeout', () => {
    console.error('Connection timed out (5s)');
    socket.destroy();
  });
  
  socket.on('error', (connErr) => {
    console.error('Connection failed:', connErr.message);
  });
});
