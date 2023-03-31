import {
  Tree,
  updateJson,
  updateNxJson,
  readNxJson,
  formatFiles,
  runTasksInSerial,
} from '@nrwl/devkit';
import { Linter } from '@nrwl/linter';
import { PackageJson } from 'nx/src/utils/package-json';
import { pluginGenerator } from '../plugin/plugin';
import { PresetGeneratorSchema } from './schema';
import createPackageGenerator from '../create-package/create-package';

export default async function (tree: Tree, options: PresetGeneratorSchema) {
  const pluginTask = await pluginGenerator(tree, {
    compiler: 'tsc',
    linter: Linter.EsLint,
    name: options.pluginName.includes('/')
      ? options.pluginName.split('/')[1]
      : options.pluginName,
    skipFormat: true,
    skipLintChecks: false,
    skipTsConfig: false,
    unitTestRunner: 'jest',
    importPath: options.pluginName,
    rootProject: true,
  });

  removeNpmScope(tree);
  moveNxPluginToDevDeps(tree);

  const cliTask = await createPackageGenerator(tree, {
    name: options.cliName ?? `create-${options.pluginName}-package`,
    project: options.pluginName,
    skipFormat: true,
    skipTsConfig: false,
    unitTestRunner: 'jest',
    linter: Linter.EsLint,
    setParserOptionsProject: false,
    compiler: 'tsc',
    rootProject: true,
  });

  await formatFiles(tree);

  return runTasksInSerial(pluginTask, cliTask);
}

function removeNpmScope(tree: Tree) {
  updateNxJson(tree, { ...readNxJson(tree), npmScope: undefined });
}

function moveNxPluginToDevDeps(tree: Tree) {
  updateJson<PackageJson>(tree, 'package.json', (json) => {
    const nxPluginEntry = json.dependencies['@nrwl/nx-plugin'];
    delete json.dependencies['@nrwl/nx-plugin'];
    json.devDependencies['@nrwl/nx-plugin'] = nxPluginEntry;
    return json;
  });
}
