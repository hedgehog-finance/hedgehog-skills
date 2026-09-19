'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const IS_WIN = process.platform === 'win32';
const SKILL_DIR = path.resolve(__dirname, '..');

function venvDir() {
  return path.resolve(process.env.HOG_OPENBB_VENV || path.join(SKILL_DIR, '.venv'));
}

function venvBin(directory, name) {
  return path.join(directory, IS_WIN ? 'Scripts' : 'bin', `${name}${IS_WIN ? '.exe' : ''}`);
}

function executable(candidate) {
  if (IS_WIN && !['.exe', '.com'].includes(path.extname(candidate).toLowerCase())) return null;
  try {
    fs.accessSync(candidate, IS_WIN ? fs.constants.F_OK : fs.constants.X_OK);
    return fs.statSync(candidate).isFile() ? path.resolve(candidate) : null;
  } catch (_) { return null; }
}

function findOnPath(name) {
  const extensions = IS_WIN ? ['.exe', '.com'] : [''];
  for (const directory of (process.env.PATH || '').split(path.delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const found = executable(path.join(directory, `${name}${extension}`));
      if (found) return found;
    }
  }
  return null;
}

function findOpenbb() {
  // Explicit overrides must fail visibly instead of using an unrelated environment.
  if (process.env.OPENBB_API_BIN) return executable(process.env.OPENBB_API_BIN);
  const local = executable(venvBin(venvDir(), 'openbb-api'));
  if (local || process.env.HOG_OPENBB_VENV) return local;
  if (process.env.VIRTUAL_ENV) {
    const active = executable(venvBin(process.env.VIRTUAL_ENV, 'openbb-api'));
    if (active) return active;
  }
  return findOnPath('openbb-api');
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(command)} failed (code=${code}, signal=${signal})`));
    });
  });
}

async function setup() {
  const directory = venvDir();
  const python = venvBin(directory, 'python');
  const requirements = path.join(SKILL_DIR, 'requirements.txt');
  const uv = findOnPath('uv');
  if (!fs.existsSync(path.join(directory, 'pyvenv.cfg'))) {
    if (fs.existsSync(directory) && fs.readdirSync(directory).length > 0) {
      throw new Error(`Refusing to overwrite a non-venv directory: ${directory}`);
    }
    if (uv) {
      await run(uv, ['venv', '--python', '3.12', directory]);
    } else {
      const basePython = findOnPath('python3.12');
      if (!basePython) throw new Error('Install uv or Python 3.12, then rerun this setup command.');
      await run(basePython, ['-m', 'venv', directory]);
    }
  }
  if (uv) await run(uv, ['pip', 'install', '--python', python, '-r', requirements]);
  else await run(python, ['-m', 'pip', 'install', '-r', requirements]);
  // Import the SDK now, so its first-use build is completed before service startup.
  await run(python, ['-c', 'from openbb import obb; import openbb_platform_api; print("OpenBB Python import OK")']);
  const apiBin = executable(venvBin(directory, 'openbb-api'));
  if (!apiBin) throw new Error(`Installation did not create openbb-api in ${directory}`);
  return { status: 'installed', python, apiBin };
}

module.exports = { findOpenbb, setup };
