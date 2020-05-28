"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = __importDefault(require("commander"));
const package_json_1 = __importDefault(require("../package.json"));
const rest_1 = require("@octokit/rest");
const octokit = new rest_1.Octokit();
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
    return data.map((d) => d.ref.split('/').pop()).sort();
}
commander_1.default.version(package_json_1.default.version, '-v');
commander_1.default
    .command('init <projectName>')
    .description('创建一个react native项目')
    .option('--version', '指定react native版本')
    .action(async (projectName, options) => {
    const tags = await getTags();
    console.log({ tags });
});
commander_1.default.parse(process.argv);
//# sourceMappingURL=index.js.map