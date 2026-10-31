(async () => {
  const { execSync, spawn } = await import('node:child_process');
  const fs = await import('node:fs');

  console.log('🐰 MochiWallet ZimaOS Bootstrapper starting...');
  fs.mkdirSync('/app/data', { recursive: true });
  fs.mkdirSync('/app/uploads/accounts', { recursive: true });
  fs.mkdirSync('/app/uploads/categories', { recursive: true });
  fs.mkdirSync('/app/uploads/slips', { recursive: true });
  fs.mkdirSync('/app/uploads/attachments', { recursive: true });

  console.log('📦 Downloading latest MochiWallet release from GitHub...');
  const res = await fetch('https://codeload.github.com/Maskbuild/MochiWallet/tar.gz/refs/heads/main');
  if (!res.ok) {
    throw new Error('Failed to download repo tarball: ' + res.status);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync('/tmp/mochi.tar.gz', buf);

  execSync('rm -rf /tmp/mochi-extract && mkdir -p /tmp/mochi-extract && tar -xzf /tmp/mochi.tar.gz -C /tmp/mochi-extract --strip-components=1', {
    stdio: 'inherit',
  });

  for (const item of ['package.json', 'package-lock.json', 'dist', 'public', 'server', 'index.html']) {
    if (fs.existsSync('/tmp/mochi-extract/' + item)) {
      execSync('cp -rf /tmp/mochi-extract/' + item + ' /app/', { stdio: 'inherit' });
    }
  }

  if (!fs.existsSync('/app/node_modules/express')) {
    console.log('⚡ Installing lightweight server dependencies...');
    execSync('npm install --omit=dev --no-audit --no-fund', {
      cwd: '/app',
      stdio: 'inherit',
    });
  }

  console.log('🌸 Launching MochiWallet Server on ports 3001 & 3002...');
  const child = spawn('node', ['/app/server/index.js'], {
    cwd: '/app',
    stdio: 'inherit',
    env: { ...process.env, PORT: process.env.PORT || '3002' },
  });

  child.on('exit', (code) => process.exit(code ?? 0));
})().catch((err) => {
  console.error('❌ Bootstrapper error:', err);
  process.exit(1);
});
