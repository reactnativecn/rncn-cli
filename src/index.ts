import program from 'commander';
import packageJson from '../package.json';
import { Octokit } from '@octokit/rest';
import compareVersions from 'compare-versions';

import fs from 'fs';
import os, { homedir } from 'os';
import ProgressBar from 'progress';
import https from 'https';

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

const baseDir = `${os.homedir()}/.rncn`;
fs.mkdir(baseDir, { recursive: true }, (e) => {});
function download(url, fn) {
  return new Promise((resolve, reject) => {
    const req = https.get(url);
    req
      .on('response', function (res) {
        if (res.statusCode === 404) {
          fs.unlink(fn, () => {});
          resolve('done');
        }
        res.pipe(fs.createWriteStream(fn));
        const len = parseInt(res.headers['content-length'], 10);
        console.log();
        let bar = new ProgressBar(
          `  Downloading ${fn}  [:bar] :rate/bps :percent :etas`,
          {
            complete: '=',
            incomplete: ' ',
            width: 20,
            total: len,
          },
        );

        res.on('data', function (chunk) {
          bar.tick(chunk.length);
        });

        res.on('end', resolve);
      })
      .on('error', reject);
    req.end();
  });
}
// https://cdn.jsdelivr.net/gh/reactnativecn/rnpack@0.62.2/rncn.zip
const baseUrl = 'https://cdn.jsdelivr.net/gh/reactnativecn/rnpack@';
const baseFn = 'rncn';
async function dowloadSegments(version) {
  const url = baseUrl + version;
  try {
    await download(`${url}/${baseFn}.zip`, `${version}/${baseFn}.zip`);
    let index = 1;
    let ret;
    let filename;
    while (ret !== 'done') {
      if (index < 10) {
        filename = `${baseFn}.z0${index}`;
      } else {
        filename = `${baseFn}.z${index}`;
      }
      ret = await download(`${url}/${filename}`, `${version}/${filename}`);
      index++;
    }
  } catch (e) {
    fs.unlink(`${homedir}/${version}`, () => {});
    throw new Error(`下载时遇到错误： ${e.message}`);
  }
}

program.storeOptionsAsProperties(false);
program.version(packageJson.version, '-v');

program
  .command('init <projectName>')
  .description('创建一个react native项目')
  .option('--version <version>', '指定react native版本')
  .action(async (projectName) => {
    const tags = await getTags();
    let version = program.opts().version || tags[0];
    if (!tags.includes(version)) {
      throw new Error(
        `仓库中无此版本(${version})，请从库存版本中选择:\n` + tags.join(', '),
      );
    }
    const targetZip = `${baseDir}/${version}/${baseFn}.zip`;
    if (!fs.existsSync(targetZip)) {
      await dowloadSegments(version);
    }
    // TODO unzip and rename
    // TODO replace gradle and maven
  });

program.parse(process.argv);
