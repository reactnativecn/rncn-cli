import program from 'commander';
const { version: cliVersion } = require('../package.json');
import { Octokit } from '@octokit/rest';
import compareVersions from 'compare-versions';

import fs from 'fs';
import os, { homedir } from 'os';
import ProgressBar from 'progress';
const { DownloaderHelper } = require('node-downloader-helper');

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
fs.mkdir(baseDir, (e) => {});

function download(url, dir) {
  const dl = new DownloaderHelper(url, dir, {
    retry: { maxRetries: 3 },
  });
  let bar;

  dl.on('download', ({ fileName, totalSize }) => {
    if (!bar) {
      bar = new ProgressBar(`  Downloading ${fileName}  [:bar] :percent`, {
        complete: '=',
        incomplete: ' ',
        width: 20,
        total: totalSize,
      });
    }
  });

  dl.on('progress.throttled', (info) => {
    bar.tick(info.downloaded);
  });

  dl.on('error', (e) => {});

  return dl.start().catch((e) => {
    if (e.status === 404) {
      return 'done';
    } else {
      throw e;
    }
  });
}
// https://cdn.jsdelivr.net/gh/reactnativecn/rnpack@0.62.2/rncn.zip
const baseUrl = 'https://cdn.jsdelivr.net/gh/reactnativecn/rnpack@';
const baseFn = 'rncn';
function emptyDir(dir) {
  return new Promise((resolve) => {
    fs.rmdir(dir, { recursive: true }, () => {
      fs.mkdir(dir, resolve);
    });
  });
}
async function dowloadSegments(version) {
  const url = baseUrl + version;
  const dlDir = `${baseDir}/${version}`;
  await emptyDir(dlDir);

  try {
    await download(`${url}/${baseFn}.zip`, dlDir);
    let index = 1;
    let ret;
    let filename;
    while (ret !== 'done') {
      if (index < 10) {
        filename = `${baseFn}.z0${index}`;
      } else {
        filename = `${baseFn}.z${index}`;
      }
      ret = await download(`${url}/${filename}`, dlDir);
      index++;
    }
  } catch (e) {
    fs.unlink(`${homedir}/${version}`, () => {});
    throw new Error(`下载时遇到错误： ${e.message}`);
  }
  fs.writeFileSync(`${dlDir}/done`, '');
}

program.storeOptionsAsProperties(false);
program.version(cliVersion, '-v');

const log = console.log;

program
  .command('init <projectName>')
  .description('创建一个react native项目')
  .option('--version <version>', '指定react native版本')
  .action(async (projectName) => {
    log(`欢迎使用reactnative.cn提供的快速初始化工具`);
    log(`rncn-cli v${cliVersion}`);
    log('-------------------------------------');
    const tags = await getTags();
    let version = program.opts().version || tags[0];
    if (!tags.includes(version)) {
      throw new Error(
        `仓库中无此版本(${version})，请从库存版本中选择:\n` + tags.join(', '),
      );
    }
    log('react-native 版本: ' + version);
    if (!fs.existsSync(`${baseDir}/${version}/done`)) {
      log('开始下载模板包...');
      await dowloadSegments(version);
    } else {
      log(`检测到缓存，通过缓存创建...`);
    }
    // TODO unzip and rename
    // TODO replace gradle and maven
    // TODO add .npmrc and install
  });

program.parse(process.argv);
