import {
  checkFilesExist,
  getSelectedPackageManager,
  packageManagerLockFile,
  runCLI,
  uniq,
  runCreatePlugin,
  cleanupProject,
  tmpProjPath,
} from '@nrwl/e2e/utils';

describe('create-nx-plugin', () => {
  const packageManager = getSelectedPackageManager() || 'pnpm';

  afterEach(() => cleanupProject());

  it('should be able to create a plugin repo and run plugin e2e', () => {
    const wsName = uniq('ws-plugin');

    runCreatePlugin(wsName, {
      packageManager,
    });

    checkFilesExist(
      'package.json',
      packageManagerLockFile[packageManager],
      `project.json`,
      `generators.json`,
      `executors.json`
    );

    runCLI(`build ${wsName}`);
    checkFilesExist(`dist/src/index.js`);
    runCLI(`build create-${wsName}-package`);
    checkFilesExist(`dist/create-${wsName}-package/bin/index.js`);

    expect(() => runCLI(`e2e e2e`)).not.toThrow();
  });
});
