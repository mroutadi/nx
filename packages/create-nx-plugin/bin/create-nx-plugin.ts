#!/usr/bin/env node
import chalk = require('chalk');
import enquirer = require('enquirer');
import yargs = require('yargs');

import {
  determineCI,
  determineDefaultBase,
  determineNxCloud,
  determinePackageManager,
} from 'create-nx-workspace/src/internal-utils/prompts';
import {
  withAllPrompts,
  withCI,
  withGitOptions,
  withNxCloud,
  withOptions,
  withPackageManager,
} from 'create-nx-workspace/src/internal-utils/yargs-options';
import { createWorkspace, CreateWorkspaceOptions } from 'create-nx-workspace';
import { output } from 'create-nx-workspace/src/utils/output';
import { CI } from 'create-nx-workspace/src/utils/ci/ci-list';
import type { PackageManager } from 'create-nx-workspace/src/utils/package-manager';

export const yargsDecorator = {
  'Options:': `${chalk.green`Options`}:`,
  'Examples:': `${chalk.green`Examples`}:`,
  boolean: `${chalk.blue`boolean`}`,
  count: `${chalk.blue`count`}`,
  string: `${chalk.blue`string`}`,
  array: `${chalk.blue`array`}`,
  required: `${chalk.blue`required`}`,
  'default:': `${chalk.blue`default`}:`,
  'choices:': `${chalk.blue`choices`}:`,
  'aliases:': `${chalk.blue`aliases`}:`,
};

const nxVersion = require('../package.json').version;

async function determinePluginName(
  parsedArgs: CreateNxPluginArguments
): Promise<string> {
  if (parsedArgs.pluginName) {
    return Promise.resolve(parsedArgs.pluginName);
  }

  const results = await enquirer.prompt<{ pluginName: string }>([
    {
      name: 'pluginName',
      message: `Plugin name                        `,
      type: 'input',
      validate: (s_1) => (s_1.length ? true : 'Name cannot be empty'),
    },
  ]);
  if (!results.pluginName) {
    output.error({
      title: 'Invalid name',
      bodyLines: [`Name cannot be empty`],
    });
    process.exit(1);
  }
  return results.pluginName;
}

interface CreateNxPluginArguments {
  pluginName: string;
  cliName?: string;
  packageManager: PackageManager;
  ci: CI;
  allPrompts: boolean;
  nxCloud: boolean;
}

export const commandsObject: yargs.Argv<CreateNxPluginArguments> = yargs
  .wrap(yargs.terminalWidth())
  .parserConfiguration({
    'strip-dashed': true,
    'dot-notation': true,
  })
  .command(
    // this is the default and only command
    '$0 [name] [options]',
    'Create a new Nx plugin workspace',
    (yargs) =>
      withOptions(
        yargs
          .positional('pluginName', {
            describe: chalk.dim`Plugin name`,
            type: 'string',
            alias: ['name'],
          })
          .option('cliName', {
            describe: 'Name of the CLI package to create workspace with plugin',
            type: 'string',
          }),
        withNxCloud,
        withCI,
        withAllPrompts,
        withPackageManager,
        withGitOptions
      ),
    async (argv: yargs.ArgumentsCamelCase<CreateNxPluginArguments>) => {
      await main(argv).catch((error) => {
        const { version } = require('../package.json');
        output.error({
          title: `Something went wrong! v${version}`,
        });
        throw error;
      });
    },
    [normalizeArgsMiddleware]
  )
  .help('help', chalk.dim`Show help`)
  .updateLocale(yargsDecorator)
  .version(
    'version',
    chalk.dim`Show version`,
    nxVersion
  ) as yargs.Argv<CreateNxPluginArguments>;

async function main(parsedArgs: yargs.Arguments<CreateNxPluginArguments>) {
  const populatedArguments: CreateNxPluginArguments & CreateWorkspaceOptions = {
    ...parsedArgs,
    name: parsedArgs.pluginName.includes('/')
      ? parsedArgs.pluginName.split('/')[1]
      : parsedArgs.pluginName,
  };
  await createWorkspace('@nrwl/nx-plugin', populatedArguments);
}

/**
 * This function is used to normalize the arguments passed to the command.
 * It would:
 * - normalize the preset.
 * @param argv user arguments
 */
async function normalizeArgsMiddleware(
  argv: yargs.Arguments<CreateNxPluginArguments>
): Promise<void> {
  try {
    const pluginName = await determinePluginName(argv);
    const packageManager = await determinePackageManager(argv);
    const defaultBase = await determineDefaultBase(argv);
    const nxCloud = await determineNxCloud(argv);
    const ci = await determineCI(argv, nxCloud);

    Object.assign(argv, {
      pluginName,
      nxCloud,
      packageManager,
      defaultBase,
      ci,
    } as Partial<CreateNxPluginArguments & CreateWorkspaceOptions>);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

// Trigger Yargs
commandsObject.argv;
