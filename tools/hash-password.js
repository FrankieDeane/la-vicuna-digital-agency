// Genera el valor de AUTH_PASS_HASH (y un AUTH_SECRET nuevo) para la zona admin.
// Es el mismo formato que usa Frankie Analytics: pbkdf2:<iteraciones>:<salt_hex>:<hash_hex>
//
//   node tools/hash-password.js
//
// Pide la clave sin mostrarla en pantalla. No la pases como argumento: quedaría en el historial.

const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
rl._writeToOutput = s => { if (!rl.silencioso) rl.output.write(s); };
rl.question('Clave nueva: ', clave => {
  rl.close();
  process.stdout.write('\n');
  const iter = 310000;
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(clave.trim(), salt, iter, 32, 'sha256').toString('hex');
  console.log('AUTH_PASS_HASH = pbkdf2:' + iter + ':' + salt.toString('hex') + ':' + hash);
  console.log('AUTH_SECRET    = ' + crypto.randomBytes(32).toString('hex'));
});
rl.silencioso = true;
