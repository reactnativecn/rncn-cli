import fetch from 'node-fetch';
import program from 'commander';
import packageJson from '../package.json';
import { Octokit } from '@octokit/rest';
import compareVersions from 'compare-versions';

const octokit = new Octokit();
async function getTags() {
  const { data } = await octokit.git.listMatchingRefs({
    owner: 'reactnativecn',
    repo: 'rnpack',
    ref: 'tags',
  });
  // [
  //   {
  //     ref: 'refs/tags/0.60.6',
  //   },
  // ]
  return data
    .map((d) => d.ref.split('/').pop())
    .sort(compareVersions)
    .reverse();
}

program.version(packageJson.version, '-v');

program
  .command('init <projectName>')
  .description('创建一个react native项目')
  .option('--version', '指定react native版本')
  .action(async (projectName, options) => {
    const tags = await getTags();
    let version = options.version || tags[0];
    if (!tags.includes(version)) {
      throw new Error(
        '仓库中无此版本，请从库存版本中选择： ' + tags.join(', '),
      );
    }
    // TODO download and rename
    // TODO replace gradle and maven
  });

program.parse(process.argv);
